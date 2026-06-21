import type { BlockId } from '@/lib/markdown/types';

/**
 * Closure-based identifier generator. Mirrors the Swift `IdentifierGenerator`
 * protocol in stream-to-screen-demo: each call returns a fresh unique id, and
 * `.nested()` carves out a child scope that shares the parent's counter.
 *
 * Why numbered ids (and not content-hashed ones)?
 *   - Cheap O(1) generation.
 *   - React keys just need to be stable per-block; the parser guarantees that
 *     by emitting blocks in document order on every fresh generator, and the
 *     `useParsedStream` hook only swaps in a new parse when the *content*
 *     changes (so the rendered tree stays stable across same-content renders).
 */
export interface IdentifierGenerator {
  /** Allocate and return the next unique id within this scope. */
  (): BlockId;
  /** Carve a nested scope. The returned generator shares the parent's counter. */
  nested(): IdentifierGenerator;
}

/**
 * Create a new identifier generator. The returned value is callable and
 * exposes a `.nested()` method.
 *
 *   const ids = createIdentifierGenerator();
 *   ids();        // 1
 *   ids.nested()(); // 2
 *   ids();        // 3
 */
export function createIdentifierGenerator(): IdentifierGenerator {
  let counter = 0;
  const make = (root: { value: number }): IdentifierGenerator => {
    const fn = (() => ++root.value) as IdentifierGenerator;
    fn.nested = () => make(root);
    return fn;
  };
  return make({ value: 0 });
}
