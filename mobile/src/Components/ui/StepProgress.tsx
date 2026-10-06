import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type StepProgressProps = { current: number; total: number; title: string };

/** "Step 2 of 3 · Education & location" with a segmented progress bar. */
export function StepProgress({ current, total, title }: StepProgressProps) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`${t('a11y.step', { current, total })}, ${title}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View style={styles.bars}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.bar, index < current ? styles.filled : null]} />
        ))}
      </View>
      <Text variant="label" color="textMuted">
        {`${t('a11y.step', { current, total })} · ${title}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  bars: { flexDirection: 'row', gap: spacing.xxs },
  bar: { flex: 1, height: sizes.progressHeight, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  filled: { backgroundColor: colors.primary },
});
