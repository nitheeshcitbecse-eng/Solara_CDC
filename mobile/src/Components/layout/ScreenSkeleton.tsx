import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, sizes, spacing } from '../../lib/theme/tokens';
import { Skeleton } from '../ui/Skeleton';

type ScreenSkeletonProps = { variant?: 'form' | 'detail' };

/** Placeholder layout for forms and detail screens while their data loads. */
export function ScreenSkeleton({ variant = 'form' }: ScreenSkeletonProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container} accessibilityLabel={t('a11y.loading')} accessibilityRole="progressbar">
      {variant === 'detail' ? <Skeleton height={sizes.chartHeight + spacing.xxl} radius={radius.xl} /> : null}
      <Skeleton height={spacing.xxl} width="70%" />
      <Skeleton height={spacing.md} width="45%" />
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.field}>
          <Skeleton height={spacing.sm} width="35%" />
          <Skeleton height={sizes.inputHeight} radius={radius.md} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  field: { gap: spacing.xs },
});
