import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing, type ColorToken } from '../../lib/theme/tokens';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'onDark';

const TONES: Record<BadgeTone, { background: string; foreground: ColorToken }> = {
  neutral: { background: colors.surfaceMuted, foreground: 'textMuted' },
  brand: { background: colors.surfaceSelected, foreground: 'primary' },
  success: { background: colors.successSoft, foreground: 'success' },
  warning: { background: colors.warningSoft, foreground: 'warning' },
  danger: { background: colors.dangerSoft, foreground: 'danger' },
  onDark: { background: colors.surface, foreground: 'plumDeep' },
};

type BadgeProps = { label: string; tone?: BadgeTone; icon?: LucideIcon };

export function Badge({ label, tone = 'neutral', icon: Icon }: BadgeProps) {
  const style = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      {Icon ? <Icon size={sizes.iconSm - 2} color={colors[style.foreground]} strokeWidth={2} /> : null}
      <Text variant="label" color={style.foreground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
});
