import { useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { StreamdownText } from 'react-native-streamdown';
import type { MarkdownStyle } from 'react-native-enriched-markdown';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Markdown renderer powered by react-native-streamdown.
 *
 * Uses `react-native-enriched-markdown` under the hood for fully native
 * CommonMark + GFM rendering with background-thread processing via
 * `react-native-worklets` Bundle Mode.
 *
 * Streaming-aware: handles incomplete markdown mid-stream (unclosed **,
 * ```, $, etc.) without visual glitches — ideal for LLM token-by-token output.
 *
 * Features:
 * - CommonMark + GitHub Flavored Markdown (tables, task lists)
 * - LaTeX math rendering (inline $...$ and block $$...$$ with flavor="github")
 * - Smooth streaming animation on new tokens
 * - Native text selection, long-press context menu with "Copy as Markdown"
 * - Spoiler text with tap-to-reveal
 * - Fully themed to match the app's light/dark palettes
 */
export function MarkdownRenderer({ content }: { content: string }) {
  const { colors } = useTheme();

  const markdownStyle: MarkdownStyle = useMemo(
    () => ({
      /* ──────────────── base paragraph ──────────────── */
      paragraph: {
        fontSize: 16,
        lineHeight: 23,
        color: colors.text,
      },

      /* ──────────────── headings ──────────────── */
      h1: { fontSize: 24, fontWeight: '700', lineHeight: 30, color: colors.text },
      h2: { fontSize: 20, fontWeight: '700', lineHeight: 26, color: colors.text },
      h3: { fontSize: 17, fontWeight: '600', lineHeight: 23, color: colors.text },
      h4: { fontSize: 16, fontWeight: '600', lineHeight: 22, color: colors.text },
      h5: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: colors.text },
      h6: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: colors.text },

      /* ──────────────── inline formatting ──────────────── */
      strong: { color: colors.text },
      em: { color: colors.text },
      link: { color: colors.link, underline: true },
      code: {
        fontFamily: Fonts.mono,
        fontSize: 14,
        color: colors.codeText,
        backgroundColor: colors.codeBackground,
      },

      /* ──────────────── fenced code blocks ──────────────── */
      codeBlock: {
        fontFamily: Fonts.mono,
        fontSize: 13.5,
        lineHeight: 20,
        color: colors.codeText,
        backgroundColor: colors.codeBackground,
        borderColor: colors.codeBorder,
        borderRadius: Radius.md,
        borderWidth: StyleSheet.hairlineWidth,
      },

      /* ──────────────── blockquote ──────────────── */
      blockquote: {
        borderColor: colors.border,
        borderWidth: 3,
        backgroundColor: colors.surface,
        color: colors.textSecondary,
        gapWidth: Spacing.md,
      },

      /* ──────────────── lists ──────────────── */
      list: {
        fontSize: 16,
        lineHeight: 23,
        color: colors.text,
        bulletColor: colors.textSecondary,
        markerColor: colors.textSecondary,
        gapWidth: Spacing.sm,
        marginLeft: 20,
      },

      /* ──────────────── horizontal rule ──────────────── */
      thematicBreak: {
        color: colors.border,
        height: StyleSheet.hairlineWidth,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
      },

      /* ──────────────── GFM tables (flavor="github") ──────────────── */
      table: {
        fontSize: 14,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: Radius.md,
        headerBackgroundColor: colors.codeBackground,
        headerTextColor: colors.text,
        rowEvenBackgroundColor: 'transparent',
        rowOddBackgroundColor: colors.surface,
        cellPaddingHorizontal: Spacing.sm,
        cellPaddingVertical: Spacing.sm - 2,
      },

      /* ──────────────── LaTeX math ──────────────── */
      math: {
        fontSize: 20,
        color: colors.text,
        backgroundColor: colors.surface,
        textAlign: 'center',
      },
      inlineMath: {
        color: colors.text,
      },
    }),
    [colors],
  );

  return (
    <StreamdownText
      markdown={content}
      flavor="github"
      streamingAnimation
      selectable
      markdownStyle={markdownStyle}
      onLinkPress={({ url }) => {
        Linking.openURL(url).catch(() => {});
      }}
    />
  );
}
