/**
 * Stable-typed markdown blocks + parsing result.
 *
 * A `Block` is the smallest unit the renderer can mount. Each block carries a
 * `BlockId` so React-style diffing can recognize "the same block as last
 * time" and skip re-renders even when surrounding content grows.
 *
 * Inspired by the stream-to-screen-demo architecture where parsed items
 * (not raw text) are the unit of re-render.
 */

export type BlockId = number;

export type Alignment = 'left' | 'center' | 'right';

export type Block =
  | { id: BlockId; type: 'code'; lang?: string; text: string }
  | { id: BlockId; type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { id: BlockId; type: 'blockquote'; text: string }
  | { id: BlockId; type: 'ul'; items: string[] }
  | { id: BlockId; type: 'ol'; items: string[] }
  | { id: BlockId; type: 'hr' }
  | { id: BlockId; type: 'spacer' }
  | { id: BlockId; type: 'para'; text: string }
  | {
      id: BlockId;
      type: 'table';
      headers: string[];
      align: Alignment[];
      rows: string[][];
    };

/**
 * Output of a single parse pass. Identity-stable when the input content is
 * identical, so consumers can use `===` to short-circuit downstream work.
 */
export interface ParseResult {
  blocks: Block[];
  /** Whether the parse hit a partial (still-streaming) trailing state. */
  partial: boolean;
}
