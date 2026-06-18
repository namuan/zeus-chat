import EventSource, {
  type CloseEvent,
  type ErrorEvent,
  type EventSourceOptions,
  type ExceptionEvent,
  type MessageEvent,
  type TimeoutEvent,
} from 'react-native-sse';

import { OPENROUTER_URL, DEFAULT_MODEL } from '@/constants/theme';
import type { ApiMessage, StreamError } from '@/features/chat/chat.types';
import { getApiKey } from '@/lib/securestore';
import { extractDelta, fetchStreamChat, mapApiError } from '@/lib/streaming';
import { abortError } from '@/utils/abortController';

/** OpenRouter requires the API key; optional attribution headers are nice. */
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/zeus-chat',
    'X-Title': 'Zeus Chat',
  };
}

export interface StreamChatArgs {
  messages: ApiMessage[];
  model?: string;
  onToken: (token: string) => void;
  signal: AbortSignal;
}

/**
 * Stream a chat completion token-by-token. Resolves with the full text.
 * Rejects with a `StreamError` on failure, or an `AbortError` if cancelled.
 *
 * Transport: `react-native-sse` (XHR-based, works in Expo Go without
 * polyfills). A fetch-based fallback is used if EventSource can't be built.
 */
export function streamChat({
  messages,
  model = DEFAULT_MODEL,
  onToken,
  signal,
}: StreamChatArgs): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let apiKey: string;
    try {
      apiKey = (await getApiKey()) ?? '';
    } catch {
      apiKey = '';
    }
    if (!apiKey) {
      reject({ code: 'auth', message: 'No API key set. Add one in Settings.' } as StreamError);
      return;
    }

    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const body = JSON.stringify({ model, messages, stream: true });
    const headers = buildHeaders(apiKey);

    let full = '';
    let settled = false;
    let es: EventSource | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const IDLE_TIMEOUT_MS = 60_000; // safety net if [DONE] never arrives

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (idleTimer) clearTimeout(idleTimer);
      try {
        es?.close();
      } catch {
        /* no-op */
      }
      fn();
    };

    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        finish(() => resolve(full));
      }, IDLE_TIMEOUT_MS);
    };

    const onAbort = () => finish(() => reject(abortError()));

    try {
      if (signal.addEventListener) {
        signal.addEventListener('abort', onAbort, { once: true });
      } else {
        signal.onabort = onAbort;
      }
    } catch {
      /* no-op */
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data ?? '';
      if (data === '[DONE]') {
        finish(() => resolve(full));
        return;
      }
      const token = extractDelta(data);
      if (token) {
        full += token;
        onToken(token);
        resetIdle();
      }
    };

    const onError = (event: ErrorEvent | TimeoutEvent | ExceptionEvent) => {
      if (settled) return;
      if (signal.aborted) {
        onAbort();
        return;
      }
      if (event.type === 'timeout') {
        finish(() => reject({ code: 'network', message: 'Request timed out.' } as StreamError));
        return;
      }
      if (event.type === 'exception') {
        finish(() =>
          reject({ code: 'unknown', message: (event as ExceptionEvent).message || 'Request failed.' } as StreamError),
        );
        return;
      }
      const status = (event as ErrorEvent).xhrStatus ?? 0;
      // Some servers emit a final error event with a 2xx status on completion.
      if (status >= 200 && status < 300) {
        finish(() => resolve(full));
        return;
      }
      const bodyText = (event as ErrorEvent).message ?? '';
      const err: StreamError =
        status === 0
          ? { code: 'network', message: 'Network error. Check your connection.' }
          : mapApiError(status, bodyText);
      finish(() => reject(err));
    };

    const onClose = (_event: CloseEvent) => {
      // Only fired when we call close(); treat as a safety resolve.
      finish(() => resolve(full));
    };

    const options: EventSourceOptions = {
      method: 'POST',
      headers,
      body,
      // Disable auto-reconnect: a single completion stream only.
      pollingInterval: 24 * 60 * 60 * 1000,
      timeoutBeforeConnection: 0,
      lineEndingCharacter: '\n',
    };

    try {
      es = new EventSource(OPENROUTER_URL, options);
      es.addEventListener('message', onMessage);
      es.addEventListener('error', onError);
      es.addEventListener('close', onClose);
      resetIdle();
    } catch {
      // Fallback to fetch-based streaming if EventSource is unavailable.
      try {
        full = await fetchStreamChat({ url: OPENROUTER_URL, headers, body, onToken, signal });
        finish(() => resolve(full));
      } catch (err) {
        finish(() => reject(err as StreamError));
      }
    }
  });
}

export interface CompletionArgs {
  messages: ApiMessage[];
  model?: string;
  signal?: AbortSignal;
  maxTokens?: number;
}

/** Non-streaming completion. Used as a fallback / for validation. */
export async function chatCompletion({
  messages,
  model = DEFAULT_MODEL,
  signal,
  maxTokens,
}: CompletionArgs): Promise<string> {
  const apiKey = (await getApiKey()) ?? '';
  if (!apiKey) {
    throw { code: 'auth', message: 'No API key set.' } as StreamError;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    throw mapApiError(res.status, text);
  }
  try {
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
  } catch {
    /* fall through */
  }
  throw { code: 'unknown', message: 'Empty response from model.' } as StreamError;
}

/**
 * Lightweight key check: a 1-token request. Returns whether the key works
 * and an optional structured error.
 */
export async function validateKey(
  model: string = DEFAULT_MODEL,
): Promise<{ ok: boolean; error?: StreamError }> {
  try {
    await chatCompletion({
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      model,
      maxTokens: 1,
    });
    return { ok: true };
  } catch (err) {
    const e = err as StreamError;
    // A "max_tokens" truncation still means the key is valid.
    if (e?.code === 'auth') return { ok: false, error: e };
    return { ok: true };
  }
}
