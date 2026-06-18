import { useCallback, useEffect, useRef } from 'react';

import { abort, createController } from '@/utils/abortController';

/**
 * Owns the AbortController for an in-flight streaming request. Callers
 * (useChat) create a fresh signal before each request and call `cancel()`
 * to abort — on Stop, navigation away, or a new message.
 */
export function useStreaming() {
  const controllerRef = useRef<AbortController | null>(null);

  /** Create a new controller and return its signal for the next request. */
  const newSignal = useCallback(() => {
    // Abort any previous in-flight request before starting a new one.
    abort(controllerRef.current);
    controllerRef.current = createController();
    return controllerRef.current.signal;
  }, []);

  const cancel = useCallback(() => {
    abort(controllerRef.current);
    controllerRef.current = null;
  }, []);

  // Abort on unmount (e.g. navigating away from the chat screen).
  useEffect(() => {
    return () => abort(controllerRef.current);
  }, []);

  return { newSignal, cancel };
}
