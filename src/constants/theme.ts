/**
 * Design system for Zeus Chat.
 *
 * Direction: ChatGPT minimalism + iMessage spacing + Apple Notes simplicity.
 * Light and dark palettes are defined together so every color has a pair.
 */

import { Platform } from 'react-native';

export type Mode = 'light' | 'dark';

/**
 * Per-mode color tokens. Keep the keys identical across modes so the
 * `useTheme()` hook can index them safely.
 */
export const Colors = {
  light: {
    // Surfaces
    background: '#FFFFFF',
    surface: '#F2F2F7', // assistant bubbles, cards (iOS secondary)
    surfaceElevated: '#FFFFFF',
    surfaceSelected: '#E9E9EE',
    border: '#E5E5EA',
    hairline: '#ECECEF',

    // Text
    text: '#0D0D0D',
    textSecondary: '#5C5C63',
    textMuted: '#9A9AA2',

    // Brand / accents (iMessage-style blue for user bubbles + actions)
    accent: '#2C7BE0',
    accentPressed: '#1E66C4',
    accentText: '#FFFFFF',

    // Chat bubbles
    userBubble: '#2C7BE0',
    userBubbleText: '#FFFFFF',
    assistantBubble: '#F2F2F7',
    assistantBubbleText: '#0D0D0D',

    // Status
    danger: '#D7393B',
    dangerSurface: '#FDEDED',
    warning: '#D48A00',
    warningText: '#FFFFFF',
    success: '#1F9D63',

    // Code
    codeBackground: '#F6F6F8',
    codeBorder: '#E5E5EA',
    codeText: '#1E1E22',

    // Links
    link: '#2C7BE0',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#161617',
    surfaceSelected: '#2C2C2E',
    border: '#2A2A2D',
    hairline: '#1F1F21',

    text: '#FFFFFF',
    textSecondary: '#B8B8BE',
    textMuted: '#6E6E74',

    accent: '#0A84FF',
    accentPressed: '#3D9BFF',
    accentText: '#FFFFFF',

    userBubble: '#0A84FF',
    userBubbleText: '#FFFFFF',
    assistantBubble: '#1C1C1E',
    assistantBubbleText: '#FFFFFF',

    danger: '#FF453A',
    dangerSurface: '#3A1C1C',
    warning: '#F0A000',
    warningText: '#1C1C1E',
    success: '#30D158',

    codeBackground: '#161617',
    codeBorder: '#2A2A2D',
    codeText: '#ECECEF',

    link: '#0A84FF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
}) as {
  sans: string;
  serif: string;
  rounded: string;
  mono: string;
};

/** 4pt spacing scale. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Typography = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 23, fontWeight: '500' as const },
  subtitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
} as const;

/** Max content width for tablet / large screens. */
export const MaxContentWidth = 760;
