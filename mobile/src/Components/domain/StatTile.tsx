import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { formatNumber } from '../../utils/format';
import { Text } from '../ui/Text';

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  onPress?: () => void;
  tone?: 'default' | 'highlight';
};

/** A number in the display font with its label — dashboards and KPI grids. */
export function StatTile({ icon: Icon, label, value, onPress, tone = 'default' }: StatTileProps) {
  const content = (
    <>
      <View style={[styles.iconTile, tone === 'highlight' ? styles.iconHighlight : null]}>
        <Icon size={sizes.icon} color={tone === 'highlight' ? colors.textOnDark : colors.primary} strokeWidth={2} />
      </View>
      <Text variant="display" latin numberOfLines={1} adjustsFontSizeToFit>
        {formatNumber(value)}
      </Text>
      <Text variant="label" color="textMuted" numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xxs,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceSelected },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconHighlight: { backgroundColor: colors.primary },
});
