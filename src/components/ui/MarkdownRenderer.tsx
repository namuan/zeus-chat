import Ionicons from '@expo/vector-icons/Ionicons';
import { setStringAsync } from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Lightweight, dependency-free Markdown renderer tuned for AI responses.
 * Supports: fenced code blocks, inline code, headings, bold/italic, links,
 * blockquotes, ordered/unordered lists, tables, horizontal rules, and paragraphs.
 */

/* ---------------------------------- inline --------------------------------- */

const INLINE_RE =
  /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;

function renderInline(text: string, colors: ReturnType<typeof useTheme>['colors']): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length) {
    const match = INLINE_RE.exec(remaining);
    if (!match || match.index === undefined) {
      nodes.push(<Text key={`t-${key++}`}>{remaining}</Text>);
      break;
    }
    if (match.index > 0) {
      nodes.push(<Text key={`t-${key++}`}>{remaining.slice(0, match.index)}</Text>);
    }
    const [full, , bold1, bold2, italic1, italic2, code, linkText, linkUrl] = match;
    if (bold1 || bold2) {
      nodes.push(
        <Text key={`b-${key++}`} style={{ fontWeight: '700' }}>
          {bold1 ?? bold2}
        </Text>,
      );
    } else if (italic1 || italic2) {
      nodes.push(
        <Text key={`i-${key++}`} style={{ fontStyle: 'italic' }}>
          {italic1 ?? italic2}
        </Text>,
      );
    } else if (code) {
      nodes.push(
        <Text
          key={`c-${key++}`}
          style={{
            fontFamily: Fonts.mono,
            fontSize: 14,
            color: colors.codeText,
            backgroundColor: colors.codeBackground,
            paddingHorizontal: 4,
            borderRadius: 4,
          }}>
          {code}
        </Text>,
      );
    } else if (linkText && linkUrl) {
      nodes.push(
        <Text
          key={`l-${key++}`}
          onPress={() => Linking.openURL(linkUrl).catch(() => {})}
          style={{ color: colors.link, textDecorationLine: 'underline' }}>
          {linkText}
        </Text>,
      );
    }
    remaining = remaining.slice(match.index + full.length);
  }
  return nodes;
}

/* --------------------------------- code block -------------------------------- */

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    await setStringAsync(code);
    setCopied(true);
  };

  return (
    <View style={[styles.codeBlock, { backgroundColor: colors.codeBackground, borderColor: colors.codeBorder }]}>
      <View style={[styles.codeHeader, { borderBottomColor: colors.codeBorder }]}>
        <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: colors.textMuted }}>
          {lang || 'code'}
        </Text>
        <Pressable onPress={copy} hitSlop={8} style={styles.copyBtn}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={14}
            color={copied ? colors.success : colors.textSecondary}
          />
          <Text style={{ fontSize: 11, color: copied ? colors.success : colors.textSecondary, marginLeft: 4 }}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
      </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ flexGrow: 0 }}>
        <Text
          selectable
          style={{
            fontFamily: Fonts.mono,
            fontSize: 13.5,
            lineHeight: 20,
            color: colors.codeText,
            paddingVertical: Spacing.sm,
          }}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

/* -------------------------------- table block ------------------------------ */

function TableBlock({
  headers,
  align,
  rows,
}: {
  headers: string[];
  align: ('left' | 'center' | 'right')[];
  rows: string[][];
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
        {/* Header row */}
        <View style={[styles.tableRow, { backgroundColor: colors.codeBackground }]}>
          {headers.map((h, ci) => (
            <View key={ci} style={[styles.tableCell, styles.tableCellHead, { borderColor: colors.border }]}>
              <Text
                style={{ fontWeight: '700', fontSize: 13.5, lineHeight: 19, color: colors.text }}>
                {renderInline(h, colors)}
              </Text>
            </View>
          ))}
        </View>
        {/* Data rows */}
        {rows.map((row, ri) => (
          <View
            key={ri}
            style={[styles.tableRow, ri % 2 === 1 ? { backgroundColor: colors.surface } : {}]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.tableCell, { borderColor: colors.border }]}>
                <Text
                  style={{
                    fontSize: 13.5,
                    lineHeight: 19,
                    color: colors.text,
                    textAlign: align[ci] === 'right' ? 'right' : align[ci] === 'center' ? 'center' : 'left',
                  }}>
                  {renderInline(cell, colors)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
  );
}

/* ---------------------------------- blocks --------------------------------- */

const HEADING_SIZES: Record<number, TextStyle> = {
  1: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  3: { fontSize: 17, fontWeight: '600', lineHeight: 23 },
  4: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  5: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  6: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
};

interface Block {
  type: 'code' | 'heading' | 'blockquote' | 'ul' | 'ol' | 'hr' | 'para' | 'spacer' | 'table';
  level?: number;
  lang?: string;
  text?: string;
  items?: string[];
  headers?: string[];
  align?: ('left' | 'center' | 'right')[];
  rows?: string[][];
}

/* ------------------------------- table helpers ------------------------------ */

/** Split a `| col1 | col2 |` line into trimmed cell strings. */
function splitTableRow(line: string): string[] {
  const cells = line.split('|').map((c) => c.trim());
  // Strip the leading empty cell if the row starts with '|'.
  if (line.trimStart().startsWith('|')) cells.shift();
  // Strip the trailing empty cell if the row ends with '|'.
  if (line.trimEnd().endsWith('|') && cells.length) cells.pop();
  return cells;
}

function isSeparatorLine(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}

function isTableLine(line: string): boolean {
  return line.includes('|');
}

function parseAlign(cell: string): 'left' | 'center' | 'right' {
  const t = cell.trim();
  const l = t.startsWith(':');
  const r = t.endsWith(':');
  if (l && r) return 'center';
  if (r) return 'right';
  return 'left';
}

function alignToFlex(a?: string): 'flex-start' | 'center' | 'flex-end' {
  if (a === 'center') return 'center';
  if (a === 'right') return 'flex-end';
  return 'flex-start';
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\s*\w+)?\s*$/);
    if (fence) {
      const lang = fence[1]?.trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ type: 'code', lang, text: buf.join('\n') });
      continue;
    }

    // Blank line -> spacer (collapsed)
    if (line.trim() === '') {
      blocks.push({ type: 'spacer' });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: buf.join('\n') });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Table — line contains '|' and the very next line is a separator
    if (
      isTableLine(line) &&
      i + 1 < lines.length &&
      isSeparatorLine(lines[i + 1])
    ) {
      const headers = splitTableRow(line);
      const alignCells = splitTableRow(lines[i + 1]);
      const align = headers.map((_, ci) => parseAlign(alignCells[ci] || '---'));
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, align, rows });
      continue;
    }

    // Paragraph: gather until a blank line or a block-starting line.
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
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i]) &&
      !isTableLine(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'para', text: buf.join('\n') });
  }

  return blocks;
}

/* --------------------------------- renderer -------------------------------- */

export function MarkdownRenderer({ content }: { content: string }) {
  const { colors } = useTheme();
  const blocks = parseBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'code':
            return <CodeBlock key={idx} code={block.text ?? ''} lang={block.lang} />;
          case 'heading':
            return (
              <Text key={idx} style={[HEADING_SIZES[block.level ?? 3], { color: colors.text, marginTop: idx ? Spacing.md : 0 }]}>
                {renderInline(block.text ?? '', colors)}
              </Text>
            );
          case 'blockquote':
            return (
              <View
                key={idx}
                style={{ borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: Spacing.md, marginVertical: Spacing.xs }}>
                <Text style={{ color: colors.textSecondary, fontStyle: 'italic', lineHeight: 21 }}>
                  {renderInline(block.text ?? '', colors)}
                </Text>
              </View>
            );
          case 'ul':
            return (
              <View key={idx} style={styles.list}>
                {block.items?.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={{ color: colors.textSecondary, marginRight: Spacing.sm }}>{'•'}</Text>
                    <Text style={[Typography.body, { color: colors.text, flexShrink: 1 }]}>
                      {renderInline(item, colors)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'ol':
            return (
              <View key={idx} style={styles.list}>
                {block.items?.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={{ color: colors.textSecondary, marginRight: Spacing.sm }}>{`${j + 1}.`}</Text>
                    <Text style={[Typography.body, { color: colors.text, flexShrink: 1 }]}>
                      {renderInline(item, colors)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'hr':
            return <View key={idx} style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: Spacing.md }} />;
          case 'table':
            return (
              <TableBlock
                key={idx}
                headers={block.headers ?? []}
                align={block.align ?? []}
                rows={block.rows ?? []}
              />
            );
          case 'spacer':
            return <View key={idx} style={{ height: Spacing.sm }} />;
          case 'para':
          default:
            return (
              <Text key={idx} style={[Typography.body, { color: colors.text }]}>
                {renderInline(block.text ?? '', colors)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  codeBlock: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copyBtn: { flexDirection: 'row', alignItems: 'center' },
  list: { gap: Spacing.xs, marginVertical: Spacing.xs },
  listItem: { flexDirection: 'row', alignItems: 'flex-start' },
  /* table */
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, overflow: 'hidden', marginVertical: Spacing.xs },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm - 2, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  tableCellHead: { borderBottomWidth: 1 },
});
