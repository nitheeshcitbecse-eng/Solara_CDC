import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors, MAX_FONT_SCALE, type ColorToken } from '../../lib/theme/tokens';
import { getTextStyle, type TextVariant } from '../../lib/theme/typography';

type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
  align?: 'auto' | 'left' | 'center' | 'right';
  /** Force the Latin font (numbers, the brand name, codes) regardless of UI language. */
  latin?: boolean;
};

/** The only text primitive in the app: picks the right font and line height for the active script. */
export function Text({ variant = 'body', color = 'text', align, latin = false, style, ...rest }: TextProps) {
  const { script } = useLanguage();
  const typography = getTextStyle(variant, latin ? 'latin' : script);
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typography, { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
