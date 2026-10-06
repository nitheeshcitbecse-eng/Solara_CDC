import { Gauge } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { difficultyColors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Difficulty } from '../../lib/types/jobs';
import { Text } from '../ui/Text';

/** How demanding the workplace looks (from the photo analysis): Easy / Moderate / Hard. */
export function WorkplaceRatingBadge({ difficulty, size = 'sm' }: { difficulty: Difficulty; size?: 'sm' | 'lg' }) {
  const { t } = useTranslation();
  const palette = difficultyColors[difficulty];
  const label = t(`enums.difficulty.${difficulty}`);
  return (
    <View
      style={[styles.badge, size === 'lg' ? styles.large : null, { backgroundColor: palette.background }]}
      accessibilityLabel={`${t('job.workplaceRating')}: ${label}`}
    >
      <Gauge size={size === 'lg' ? sizes.icon : sizes.iconSm - 2} color={palette.foreground} strokeWidth={2} />
      <Text variant={size === 'lg' ? 'bodyStrong' : 'label'} style={{ color: palette.foreground }}>
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
  large: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 2 },
});
