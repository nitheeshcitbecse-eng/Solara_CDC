import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, overlays, pressedColors, radius, sizes, spacing, type ColorToken } from '../../lib/theme/tokens';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'light' | 'outlineLight' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  /** A custom leading element when a lucide icon doesn't fit (e.g. a brand mark). */
  leading?: ReactNode;
  accessibilityHint?: string;
  testID?: string;
};

type VariantStyle = { background: string; pressed: string; border?: string; label: ColorToken; icon: string };

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { background: colors.primary, pressed: colors.primaryPressed, label: 'textOnDark', icon: colors.textOnDark },
  secondary: {
    background: colors.surface,
    pressed: pressedColors.surface,
    border: colors.borderStrong,
    label: 'text',
    icon: colors.text,
  },
  light: { background: colors.surface, pressed: pressedColors.surface, label: 'plumDeep', icon: colors.plumDeep },
  outlineLight: {
    background: overlays.outlineLightBg,
    pressed: overlays.pressedOnDark,
    border: overlays.outlineLightBorder,
    label: 'textOnDark',
    icon: colors.textOnDark,
  },
  danger: { background: colors.danger, pressed: pressedColors.danger, label: 'textOnDark', icon: colors.textOnDark },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  leading,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const style = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? style.pressed : style.background,
          borderColor: style.border ?? 'transparent',
          borderWidth: style.border ? sizes.hairline : 0,
        },
        disabled && !loading ? styles.disabled : null,
      ]}
    >
      {/* The label stays rendered (but invisible) while loading so the button keeps its width. */}
      <View style={[styles.content, loading ? styles.hidden : null]}>
        {leading}
        {Icon ? <Icon size={sizes.icon} color={style.icon} strokeWidth={2} /> : null}
        <Text variant="button" color={style.label} numberOfLines={2} align="center">
          {label}
        </Text>
      </View>
      {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={style.icon} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.buttonHeight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.5 },
});
