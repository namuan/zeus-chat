import { createIdentifierGenerator, type IdentifierGenerator } from '@/lib/markdown/identifier';
import type { Alignment, Block, ParseResult } from '@/lib/markdown/types';

/**
 * Pure, transport-agnostic markdown → Block[] parser.
 *
 * Behaviour is identical to the previous in-renderer `parseBlocks` (it
 * preserves the same block order, table detection rules, and partial-stream
 * tolerance). The only addition is the `partial` flag on the result: true if
 * the input ended mid-block (e.g. open code fence, unfinished table).
 */

function splitTableRow(line: string): string[] {
  const cells = line.split('|').map((c) => c.trim());
  if (line.trimStart().startsWith('|')) cells.shift();
  if (line.trimEnd().endsWith('|') && cells.length) cells.pop();
  return cells;
}

function isSeparatorLine(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}

function isTableLine(line: string): boolean {
  return line.includes('|');
}

function parseAlign(cell: string): Alignment {
  const t = cell.trim();
  const l = t.startsWith(':');
  const r = t.endsWith(':');
  if (l && r) return 'center';
  if (r) return 'right';
  return 'left';
}

interface ParseState {
  blocks: Block[];
  partial: boolean;
}

// Indexable by `level - 1` so `parseInto` can use a clamped number without
// an unchecked `as` cast.
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const satisfies readonly (1 | 2 | 3 | 4 | 5 | 6)[];

function parseInto(source: string, ids: IdentifierGenerator): ParseState {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const state: ParseState = { blocks: [], partial: false };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\s*\w+)?\s*$/);
    if (fence) {
      const lang = fence[1]?.trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i >= lines.length) {
        state.partial = true;
      } else {
        i++;
      }
      state.blocks.push({ id: ids(), type: 'code', lang, text: buf.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      // Collapse consecutive blanks and skip a trailing blank so streaming
      // messages don't reserve a phantom row of vertical space at the bottom.
      if (state.blocks.at(-1)?.type !== 'spacer') {
        state.blocks.push({ id: ids(), type: 'spacer' });
      }
      i++;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      state.blocks.push({ id: ids(), type: 'hr' });
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = HEADING_LEVELS[Math.min(5, Math.max(0, h[1].length - 1))];
      state.blocks.push({ id: ids(), type: 'heading', level, text: h[2].trim() });
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      state.blocks.push({ id: ids(), type: 'blockquote', text: buf.join('\n') });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      state.blocks.push({ id: ids(), type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      state.blocks.push({ id: ids(), type: 'ol', items });
      continue;
    }

    if (
      isTableLine(line) &&
      i + 1 < lines.length &&
      isSeparatorLine(lines[i + 1])
    ) {
      const headers = splitTableRow(line);
      const alignCells = splitTableRow(lines[i + 1]);
      const align = headers.map((_, ci) => parseAlign(alignCells[ci] || '---'));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      if (i >= lines.length && lines.length > 0) {
        const last = rows.at(-1);
        if (last && last.some((c) => c.endsWith('|') || /-\s*$/.test(c))) {
          state.partial = true;
        }
      }
      state.blocks.push({ id: ids(), type: 'table', headers, align, rows });
      continue;
    }

    // A line that *looks* like a table row but is missing its separator is
    // almost certainly a half-streamed table. Mark the result as partial so
    // the caller can decide to suppress a trailing caret. (Mirrors the Swift
    // `MarkdownEntryBuilder.cleanup()` heuristic of dropping paragraphs
    // that contain '|'.)
    const looksLikeIncompleteTable =
      isTableLine(line) && (i + 1 >= lines.length || !isSeparatorLine(lines[i + 1]));

    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (i >= lines.length) state.partial = true;
    state.blocks.push({ id: ids(), type: 'para', text: buf.join('\n') });
    if (looksLikeIncompleteTable) state.partial = true;
  }

  if (state.blocks.at(-1)?.type === 'spacer') state.blocks.pop();

  return state;
}

/**
 * Parse `source` into a `ParseResult`. Pure & synchronous; safe to call
 * inside a `useMemo`, a worker, or a debounced effect.
 *
 * For content-hash short-circuiting, see `useParsedStream`, which hashes
 * the source first and skips this function entirely on a match.
 */
export function parseMarkdown(source: string): ParseResult {
  const ids = createIdentifierGenerator();
  const { blocks, partial } = parseInto(source, ids);
  return { blocks, partial };
}
