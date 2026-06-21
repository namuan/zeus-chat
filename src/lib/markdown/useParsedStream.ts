import { useEffect, useRef, useState } from 'react';

import { parseMarkdown } from '@/lib/markdown/parser';
import type { Block } from '@/lib/markdown/types';

/**
 * Stream-friendly hook: turn a growing raw `content` string into a stable
 * `Block[]` for rendering.
 *
 * The pattern is borrowed from `stream-to-screen-demo`'s `StreamController`:
 *
 *   - Coalesce rapid updates into ~16 ms windows so React work stays at
 *     roughly one parse + one render per frame, regardless of token rate.
 *   - Hash the content first; if it matches the last committed parse,
 *     skip the parse entirely. The hash is also the identity guard that
 *     preserves the previous `blocks` reference, so `React.memo` on the
 *     renderer (if added) would short-circuit cleanly.
 *   - On unmount, cancel any pending timer and prevent re-arming — the
 *     closure would otherwise pin React state alive until the timer fires.
 *
 * Usage:
 *
 *   const { blocks } = useParsedStream(content);
 *   return <MarkdownRenderer blocks={blocks} />;
 */
export interface UseParsedStreamOptions {
  /** Throttle window in milliseconds. Default 16 ms = ~1 frame at 60 Hz. */
  throttleMs?: number;
}

export interface UseParsedStreamResult {
  blocks: Block[];
  /** True when the source ended mid-block (open fence, unfinished table, etc). */
  partial: boolean;
}

const DEFAULT_THROTTLE_MS = 16;

/** FNV-1a 32-bit, base36. O(n), no allocation, plenty of entropy for skip-detection. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

export function useParsedStream(
  content: string,
  options: UseParsedStreamOptions = {},
): UseParsedStreamResult {
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;

  const [result, setResult] = useState(() => parseMarkdown(content));
  // Snapshot the initial hash so the first flush has something to compare against.
  const lastCommittedHashRef = useRef<string>(fnv1a(content));
  // Always-fresh content. Read by the timer callback; the effect updates it
  // synchronously on every content change.
  const pendingRef = useRef<string>(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flips to true on unmount so a timer mid-flight can't re-arm itself.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (pendingRef.current === content) return;
    pendingRef.current = content;
    if (timerRef.current == null) {
      timerRef.current = setTimeout(flush, throttleMs);
    }
  }, [content, throttleMs]);

  function flush() {
    if (cancelledRef.current) {
      timerRef.current = null;
      return;
    }
    const source = pendingRef.current;
    const sourceHash = fnv1a(source);

    if (sourceHash === lastCommittedHashRef.current) {
      // Parse would be a no-op. Re-arm only if more content arrived during
      // the hash pass (rare — the hash is microseconds).
      timerRef.current = null;
      if (pendingRef.current !== source && !cancelledRef.current) {
        timerRef.current = setTimeout(flush, throttleMs);
      }
      return;
    }

    const next = parseMarkdown(source);
    lastCommittedHashRef.current = sourceHash;
    setResult(next);

    timerRef.current = null;
    if (pendingRef.current !== source && !cancelledRef.current) {
      timerRef.current = setTimeout(flush, throttleMs);
    }
  }

  return { blocks: result.blocks, partial: result.partial };
}
