import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { NotoSansTamil_400Regular } from '@expo-google-fonts/noto-sans-tamil/400Regular';
import { NotoSansTamil_600SemiBold } from '@expo-google-fonts/noto-sans-tamil/600SemiBold';
import { NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import type { TextStyle } from 'react-native';

import type { Script } from '../i18n/languages';

/**
 * Font files loaded at startup (see App.tsx). Each weight is imported from its own
 * sub-path so only the weights we use end up in the bundle.
 */
export const fontAssets = {
  BricolageGrotesque_800ExtraBold,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  NotoSansTamil_400Regular,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} as const;

type FontName = keyof typeof fontAssets;
type Weight = 'display' | 'regular' | 'semibold' | 'bold' | 'extrabold';

// With custom fonts each weight is a separate family, so we never set fontWeight
// (Android would otherwise synthesise a fake bold on top of the real one).
const families: Record<Script, Record<Weight, FontName>> = {
  latin: {
    display: 'BricolageGrotesque_800ExtraBold',
    regular: 'PlusJakartaSans_400Regular',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
  },
  // Bricolage Grotesque has no Tamil/Devanagari glyphs, so display text uses the bold Noto face.
  tamil: {
    display: 'NotoSansTamil_700Bold',
    regular: 'NotoSansTamil_400Regular',
    semibold: 'NotoSansTamil_600SemiBold',
    bold: 'NotoSansTamil_700Bold',
    extrabold: 'NotoSansTamil_700Bold',
  },
  devanagari: {
    display: 'NotoSansDevanagari_700Bold',
    regular: 'NotoSansDevanagari_400Regular',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
    extrabold: 'NotoSansDevanagari_700Bold',
  },
};

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'button';

const variants: Record<TextVariant, { size: number; lineHeight: number; weight: Weight }> = {
  display: { size: 36, lineHeight: 42, weight: 'display' },
  title: { size: 28, lineHeight: 34, weight: 'display' },
  heading: { size: 18, lineHeight: 26, weight: 'bold' },
  body: { size: 15, lineHeight: 23, weight: 'regular' },
  bodyStrong: { size: 15, lineHeight: 23, weight: 'semibold' },
  label: { size: 13, lineHeight: 19, weight: 'semibold' },
  caption: { size: 12.5, lineHeight: 19, weight: 'regular' },
  button: { size: 16, lineHeight: 22, weight: 'extrabold' },
};

/**
 * Indic scripts stack vowel signs above and below the base glyph. With Latin line
 * heights those marks get clipped, so we add vertical room. Large display sizes are
 * also scaled down a little because Tamil/Hindi words are much wider.
 */
const scriptMetrics: Record<Script, { lineHeightScale: number; displayScale: number }> = {
  latin: { lineHeightScale: 1, displayScale: 1 },
  tamil: { lineHeightScale: 1.32, displayScale: 0.82 },
  devanagari: { lineHeightScale: 1.28, displayScale: 0.86 },
};

export function getTextStyle(variant: TextVariant, script: Script): TextStyle {
  const spec = variants[variant];
  const metrics = scriptMetrics[script];
  const isDisplay = spec.weight === 'display';
  const fontSize = isDisplay ? Math.round(spec.size * metrics.displayScale) : spec.size;
  const baseLineHeight = isDisplay ? spec.lineHeight * metrics.displayScale : spec.lineHeight;
  return {
    fontFamily: families[script][spec.weight],
    fontSize,
    lineHeight: Math.round(baseLineHeight * metrics.lineHeightScale),
  };
}
