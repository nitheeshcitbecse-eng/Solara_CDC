import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { sectorLabel } from '../../lib/i18n/labels';
import { colors, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Sector } from '../../lib/types/jobs';
import { Text } from '../ui/Text';
import { SectorIcon } from './SectorIcon';

type SectorTileProps = {
  sector: Sector;
  onPress: (sector: Sector) => void;
  /** `chip` for the horizontal strip on Home, `tile` for the Explore grid. */
  variant?: 'chip' | 'tile';
};

function SectorTileBase({ sector, onPress, variant = 'chip' }: SectorTileProps) {
  const { t } = useTranslation();
  const label = sectorLabel(t, sector);
  const count = t('explore.jobCount', { count: sector.jobCount });

  return (
    <Pressable
      onPress={() => onPress(sector)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      style={({ pressed }) => [variant === 'tile' ? styles.tile : styles.chip, pressed ? styles.pressed : null]}
    >
      <View style={variant === 'tile' ? styles.iconTileLarge : styles.iconTile}>
        <SectorIcon slug={sector.slug} size={variant === 'tile' ? sizes.iconLg : sizes.iconSm + 2} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text variant={variant === 'tile' ? 'heading' : 'label'} numberOfLines={2}>
          {label}
        </Text>
        <Text variant="caption" color="textMuted">
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

export const SectorTile = memo(SectorTileBase);

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingStart: spacing.xs,
    paddingEnd: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tile: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceSelected },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileLarge: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flexShrink: 1, gap: 2 },
});
