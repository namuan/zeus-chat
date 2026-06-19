/**
 * Small abort helpers. Streaming uses an AbortController so callers can
 * cancel an in-flight request from anywhere (navigation away, new message,
 * stop button). See lib/providers/client.ts for how the signal is wired to the
 * underlying transport.
 */

export function createController(): AbortController {
  return new AbortController();
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'DOMException';
}

/** Trigger an abort without throwing if already aborted. */
export function abort(controller: AbortController | null | undefined): void {
  try {
    controller?.abort();
  } catch {
    /* no-op */
  }
}

/**
 * Build an Error that `isAbortError` recognises. Used when rejecting a
 * streaming promise due to cancellation (avoids depending on DOMException).
 */
export function abortError(reason = 'Aborted'): Error {
  const err = new Error(reason);
  err.name = 'AbortError';
  return err;
}
