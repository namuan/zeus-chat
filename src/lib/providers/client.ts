import EventSource, {
  type CloseEvent,
  type ErrorEvent,
  type EventSourceOptions,
  type ExceptionEvent,
  type MessageEvent,
  type TimeoutEvent,
} from 'react-native-sse';

import type { ProviderConfig, StreamChatArgs, CompletionArgs, ValidateKeyResult } from '@/lib/providers/types';
import type { StreamError } from '@/features/chat/chat.types';
import { extractDelta, fetchStreamChat, mapApiError, type TokenUsage } from '@/lib/streaming';
import { abortError } from '@/utils/abortController';

/**
 * Stream a chat completion token-by-token. Resolves with the full text
 * and any token usage reported by the provider.
 * Rejects with a `StreamError` on failure, or an `AbortError` if cancelled.
 *
 * Transport: `react-native-sse` (XHR-based, works in Expo Go without
 * polyfills). A fetch-based fallback is used if EventSource can't be built.
 */
export function streamChat({
  messages,
  model,
  onToken,
  signal,
  apiKey,
  provider,
}: StreamChatArgs): Promise<{ text: string; usage?: TokenUsage }> {
  return new Promise<{ text: string; usage?: TokenUsage }>(async (resolve, reject) => {
    if (!apiKey) {
      reject({ code: 'auth', message: `No API key set for ${provider.name}. Add one in Settings.` } as StreamError);
      return;
    }

    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const resolvedModel = model ?? provider.defaultModel;
    const body = JSON.stringify({ model: resolvedModel, messages, stream: true });
    const headers = provider.buildHeaders(apiKey);

    let full = '';
    let finalUsage: TokenUsage | undefined;
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
        finish(() => resolve({ text: full, usage: finalUsage }));
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
        finish(() => resolve({ text: full, usage: finalUsage }));
        return;
      }
      const result = extractDelta(data);
      if (result) {
        if (result.token) {
          full += result.token;
          onToken(result.token);
          resetIdle();
        }
        if (result.usage) {
          finalUsage = result.usage;
        }
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
        finish(() => resolve({ text: full, usage: finalUsage }));
        return;
      }
      const bodyText = (event as ErrorEvent).message ?? '';
      const err: StreamError =
        status === 0
          ? { code: 'network', message: 'Network error. Check your connection.' }
          : mapApiError(status, bodyText, provider.name);
      finish(() => reject(err));
    };

    const onClose = (_event: CloseEvent) => {
      // Only fired when we call close(); treat as a safety resolve.
      finish(() => resolve({ text: full, usage: finalUsage }));
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
      es = new EventSource(provider.apiUrl, options);
      es.addEventListener('message', onMessage);
      es.addEventListener('error', onError);
      es.addEventListener('close', onClose);
      resetIdle();
    } catch {
      // Fallback to fetch-based streaming if EventSource is unavailable.
      try {
        const fetchResult = await fetchStreamChat({
          url: provider.apiUrl,
          headers,
          body,
          onToken,
          signal,
          providerName: provider.name,
        });
        full = fetchResult.text;
        finalUsage = fetchResult.usage;
        finish(() => resolve({ text: full, usage: finalUsage }));
      } catch (err) {
        finish(() => reject(err as StreamError));
      }
    }
  });
}

/** Non-streaming completion. Used as a fallback / for validation. */
export async function chatCompletion({
  messages,
  model,
  signal,
  maxTokens,
  apiKey,
  provider,
}: CompletionArgs): Promise<string> {
  if (!apiKey) {
    throw { code: 'auth', message: `No API key set for ${provider.name}.` } as StreamError;
  }

  const resolvedModel = model ?? provider.defaultModel;
  const res = await fetch(provider.apiUrl, {
    method: 'POST',
    headers: provider.buildHeaders(apiKey),
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      stream: false,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    throw mapApiError(res.status, text, provider.name);
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
  apiKey: string,
  provider: ProviderConfig,
): Promise<ValidateKeyResult> {
  try {
    await chatCompletion({
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      model: provider.defaultModel,
      maxTokens: 1,
      apiKey,
      provider,
    });
    return { ok: true };
  } catch (err) {
    const e = err as StreamError;
    // A "max_tokens" truncation still means the key is valid.
    if (e?.code === 'auth') return { ok: false, error: e };
    return { ok: true };
  }
}
