import Ionicons from '@expo/vector-icons/Ionicons';
import { setStringAsync } from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Alignment, Block } from '@/lib/markdown/types';

/**
 * Pure renderer for a pre-parsed markdown `Block[]`. Stateless and
 * side-effect free beyond what `CodeBlock` / `TableBlock` need for copy +
 * expansion UI.
 *
 * Each block is keyed by its stable `id` from the parser, so React reuses
 * component instances for blocks that survive across re-parses.
 *
 * Supported syntax: fenced code blocks, inline code, headings, bold/italic,
 * links, blockquotes, ordered/unordered lists, tables, horizontal rules,
 * paragraphs.
 */

/* ---------------------------------- inline --------------------------------- */

const INLINE_RE =
  /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/;

function renderInline(
  text: string,
  colors: ReturnType<typeof useTheme>['colors'],
): React.ReactNode[] {
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

const ROW_HEIGHT = 28;
const COL_MIN_WIDTH = 90;
const CHAR_WIDTH = 8;

function TableBlock({
  headers,
  align,
  rows,
}: {
  headers: string[];
  align: Alignment[];
  rows: string[][];
}) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const { columnWidths, tableWidth } = useMemo(() => {
    // Width is computed from the *raw* cell text length so bold markers
    // and backticks don't throw the column-width estimate off. The cells
    // themselves are re-parsed at render time (see below).
    const widths = headers.map((h, ci) => {
      const allInCol = [h, ...rows.map((r) => r[ci] ?? '')];
      const maxLen = Math.max(...allInCol.map((s) => s.length));
      return Math.max(maxLen * CHAR_WIDTH + 32, COL_MIN_WIDTH);
    });
    const total = widths.reduce((s, w) => s + w, 0) + widths.length * StyleSheet.hairlineWidth;
    return { columnWidths: widths, tableWidth: total };
  }, [headers, rows]);

  const height = useMemo(() => {
    const total = 1 + rows.length;
    return total * ROW_HEIGHT + StyleSheet.hairlineWidth;
  }, [rows]);

  const availableWidth = screenWidth - Spacing.sm * 2 - Spacing.md * 2;
  const needsScroll = tableWidth > availableWidth;

  const tableContent = (
    <View style={[styles.table, { width: needsScroll ? tableWidth : undefined, borderColor: colors.border }]}>
      <View style={[styles.tableRow, { backgroundColor: colors.codeBackground }]}>
        {headers.map((h, ci) => (
          <View key={ci} style={[styles.tableCell, styles.tableCellHead, { width: columnWidths[ci], borderColor: colors.border }]}>
            <Text style={[styles.tableCellText, { fontWeight: '700', color: colors.text }]}>
              {renderInline(h, colors)}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 ? { backgroundColor: colors.surface } : {}]}>
          {row.map((cell, ci) => {
            const a = align[ci];
            return (
              <View key={ci} style={[styles.tableCell, { width: columnWidths[ci], borderColor: colors.border }]}>
                <Text
                  style={[
                    styles.tableCellText,
                    { color: colors.text },
                    a === 'left' ? null : { textAlign: a },
                  ]}>
                  {cell ? renderInline(cell, colors) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={needsScroll ? 0.7 : 1}
        disabled={!needsScroll}
        onPress={() => setExpanded(true)}
        style={{ height }}>
        <View style={{ height, overflow: 'hidden' }}>{tableContent}</View>
        {needsScroll && (
          <View style={[styles.tableOverflowHint, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{'← scroll →'}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={expanded}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setExpanded(false)}>
        <View style={[styles.tableModal, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[styles.tableModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Table</Text>
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="close" size={20} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={{ flex: 1, paddingVertical: Spacing.md }} onPress={() => setExpanded(false)}>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: Spacing.md }}>
              <Pressable onPress={(e) => e.stopPropagation()}>{tableContent}</Pressable>
            </ScrollView>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

/* ---------------------------------- style ---------------------------------- */

const HEADING_SIZES: Record<1 | 2 | 3 | 4 | 5 | 6, TextStyle> = {
  1: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  3: { fontSize: 17, fontWeight: '600', lineHeight: 23 },
  4: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  5: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  6: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
};

/* --------------------------------- renderer -------------------------------- */

export interface MarkdownRendererProps {
  /** Pre-parsed blocks. Usually obtained from `useParsedStream`. */
  blocks: Block[];
}

/**
 * Renders a pre-parsed list of markdown blocks. Stateless and side-effect
 * free beyond what `CodeBlock` / `TableBlock` need for copy + expansion UI.
 */
/** A single bullet/numbered row used by both UL and OL rendering. */
function ListItem({
  bullet,
  text,
  colors,
}: {
  bullet: string;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.listItem}>
      <Text style={{ color: colors.textSecondary, marginRight: Spacing.sm }}>{bullet}</Text>
      <Text style={[Typography.body, { color: colors.text, flexShrink: 1 }]}>
        {renderInline(text, colors)}
      </Text>
    </View>
  );
}

export function MarkdownRenderer({ blocks }: MarkdownRendererProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {blocks.map((block) => renderBlock(block, colors))}
    </View>
  );
}

function renderBlock(
  block: Block,
  colors: ReturnType<typeof useTheme>['colors'],
): React.ReactNode {
  switch (block.type) {
    case 'code':
      return <CodeBlock key={block.id} code={block.text} lang={block.lang} />;
    case 'heading':
      return (
        <Text
          key={block.id}
          style={[
            HEADING_SIZES[block.level],
            { color: colors.text, marginTop: Spacing.md },
          ]}>
          {renderInline(block.text, colors)}
        </Text>
      );
    case 'blockquote':
      return (
        <View
          key={block.id}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.border,
            paddingLeft: Spacing.md,
            marginVertical: Spacing.xs,
          }}>
          <Text style={{ color: colors.textSecondary, fontStyle: 'italic', lineHeight: 21 }}>
            {renderInline(block.text, colors)}
          </Text>
        </View>
      );
    case 'ul':
      return (
        <View key={block.id} style={styles.list}>
          {block.items.map((item, j) => (
            <ListItem key={j} bullet="•" text={item} colors={colors} />
          ))}
        </View>
      );
    case 'ol':
      return (
        <View key={block.id} style={styles.list}>
          {block.items.map((item, j) => (
            <ListItem key={j} bullet={`${j + 1}.`} text={item} colors={colors} />
          ))}
        </View>
      );
    case 'table':
      return (
        <TableBlock
          key={block.id}
          headers={block.headers}
          align={block.align}
          rows={block.rows}
        />
      );
    case 'hr':
      return (
        <View
          key={block.id}
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
            marginVertical: Spacing.md,
          }}
        />
      );
    case 'spacer':
      return <View key={block.id} style={{ height: Spacing.sm }} />;
    case 'para':
    default:
      return (
        <Text key={block.id} style={[Typography.body, { color: colors.text }]}>
          {renderInline(block.text, colors)}
        </Text>
      );
  }
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
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  tableRow: { flexDirection: 'row' },
  tableCell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm - 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  tableCellHead: { borderBottomWidth: 1 },
  tableCellText: { fontSize: 13.5, lineHeight: 19 },
  tableOverflowHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  tableModal: { flex: 1 },
  tableModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
