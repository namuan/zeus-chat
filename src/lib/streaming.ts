import type { StreamError } from '@/features/chat/chat.types';

/**
 * Low-level SSE helpers + a fetch-based streaming fallback.
 *
 * The primary transport is `react-native-sse` (see lib/providers/client.ts)
 * because React Native's built-in `fetch` does not expose a streaming
 * `response.body` in all versions. The fetch path here is kept as a graceful
 * fallback.
 */

/** Map an HTTP status / response body to a structured UI error. */
export function mapApiError(status: number, body: string, providerName?: string): StreamError {
  let apiMessage: string | undefined;
  try {
    const json = JSON.parse(body);
    apiMessage = json?.error?.message || json?.message;
  } catch {
    /* not JSON */
  }

  if (status === 401 || status === 403) {
    return {
      code: 'auth',
      status,
      message: apiMessage ?? 'Invalid or missing API key. Check Settings.',
    };
  }
  if (status === 402) {
    return {
      code: 'credits',
      status,
      message: apiMessage ?? `Insufficient credits on this ${providerName ?? 'provider'} key.`,
    };
  }
  if (status === 429) {
    return {
      code: 'rate_limit',
      status,
      message: apiMessage ?? 'Rate limited. Please wait a moment and try again.',
    };
  }
  if (status >= 500) {
    return {
      code: 'server',
      status,
      message: apiMessage ?? `${providerName ?? 'Provider'} error (${status}). Try again.`,
    };
  }
  return {
    code: 'unknown',
    status,
    message: apiMessage ?? (body || `Request failed (${status}).`),
  };
}

/** Pull the delta token out of an OpenRouter chunk payload. */
export function extractDelta(data: string): string | null {
  if (!data || data === '[DONE]') return null;
  try {
    const json = JSON.parse(data);
    const delta = json?.choices?.[0]?.delta?.content;
    return typeof delta === 'string' ? delta : null;
  } catch {
    return null;
  }
}

/**
 * Parse a buffer accumulated from a raw SSE byte stream. Returns complete
 * `data:` payloads plus the remaining unparsed tail.
 */
export function consumeSSEBuffer(buffer: string): { events: string[]; remainder: string } {
  const events: string[] = [];
  // SSE events are separated by a blank line (\n\n). Be tolerant of \r.
  const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const remainder = parts.pop() ?? '';

  for (const block of parts) {
    if (!block.trim()) continue;
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^\s/, ''));
    if (dataLines.length) {
      events.push(dataLines.join('\n'));
    }
  }
  return { events, remainder };
}

/**
 * Fetch-based streaming fallback. Used only if the EventSource transport
 * cannot be constructed. Parses SSE manually.
 */
export async function fetchStreamChat(args: {
  url: string;
  headers: Record<string, string>;
  body: string;
  onToken: (token: string) => void;
  signal: AbortSignal;
  providerName?: string;
}): Promise<string> {
  const { url, headers, body, onToken, signal, providerName } = args;
  const res = await fetch(url, { method: 'POST', headers, body, signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw mapApiError(res.status, text, providerName);
  }

  // React Native's fetch does not always expose a streaming `body`; this
  // branch only runs when it does.
  const stream: { getReader: () => StreamReader } | undefined = (res as unknown as { body?: { getReader: () => StreamReader } }).body;
  if (!stream || typeof stream.getReader !== 'function') {
    throw { code: 'unknown', message: 'Streaming not supported on this runtime.' } as StreamError;
  }

  const reader = stream.getReader();
  const DecoderCtor = (globalThis as unknown as { TextDecoder?: new (label?: string) => { decode: (input?: Uint8Array, options?: { stream?: boolean }) => string } }).TextDecoder;
  const decoder = DecoderCtor ? new DecoderCtor('utf-8') : null;
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = value ? (decoder ? decoder.decode(value, { stream: true }) : bytesToString(value)) : '';
    buffer += chunk;
    const { events, remainder } = consumeSSEBuffer(buffer);
    buffer = remainder;
    for (const data of events) {
      if (data === '[DONE]') return full;
      const token = extractDelta(data);
      if (token) {
        full += token;
        onToken(token);
      }
    }
  }
  return full;
}

interface StreamReader {
  read: () => Promise<{ value?: Uint8Array; done: boolean }>;
  cancel?: () => Promise<void>;
}

/** Fallback UTF-8 decoder if TextDecoder isn't available. */
function bytesToString(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  try {
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
}
