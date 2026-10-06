import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Skeleton } from '../ui/Skeleton';

/** Loading placeholder shaped like a JobCard, so the list doesn't jump when data arrives. */
export function JobCardSkeleton({ count = 3 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel={t('a11y.loading')}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <Skeleton height={spacing.lg} width="75%" />
          <Skeleton height={spacing.md} width="35%" />
          <Skeleton height={spacing.sm} width="60%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
