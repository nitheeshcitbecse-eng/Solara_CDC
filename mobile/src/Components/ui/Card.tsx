import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  tone?: 'surface' | 'muted' | 'selected';
  style?: StyleProp<ViewStyle>;
};

const BACKGROUNDS = { surface: colors.surface, muted: colors.surfaceMuted, selected: colors.surfaceSelected } as const;

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, tone = 'surface', style }: CardProps) {
  const base = [styles.card, { backgroundColor: BACKGROUNDS[tone] }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { backgroundColor: colors.surfaceSelected },
});
