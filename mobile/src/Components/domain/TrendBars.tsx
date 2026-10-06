import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { TrendPoint } from '../../lib/types/superadmin';
import { formatDate } from '../../utils/format';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type TrendBarsProps = { title: string; points: readonly TrendPoint[]; color?: string };

const BAR_GAP = 4;

/** A compact daily bar chart (react-native-svg) with an accessible text summary. */
export function TrendBars({ title, points, color = colors.primary }: TrendBarsProps) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - spacing.lg * 2 - spacing.md * 2;
  const height = sizes.chartHeight;
  const max = Math.max(1, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const barWidth = points.length > 0 ? (width - BAR_GAP * (points.length - 1)) / points.length : 0;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <Card>
      <View style={styles.header}>
        <Text variant="bodyStrong" style={styles.flex}>
          {title}
        </Text>
        <Text variant="label" color="textMuted">
          {t('superadmin.trendTotal', { count: total })}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('superadmin.trendSummary', { title, total, max, days: points.length })}
      >
        <Svg width={width} height={height}>
          <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke={colors.border} strokeWidth={1} />
          {points.map((point, index) => {
            const barHeight = point.count === 0 ? 2 : Math.max(4, (point.count / max) * (height - spacing.sm));
            return (
              <Rect
                key={point.date}
                x={index * (barWidth + BAR_GAP)}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                rx={Math.min(radius.sm / 2, barWidth / 2)}
                fill={point.count === 0 ? colors.surfaceMuted : color}
              />
            );
          })}
        </Svg>
      </View>
      {first && last ? (
        <View style={styles.axis}>
          <Text variant="caption" color="textSubtle">
            {formatDate(first.date, activeLanguage)}
          </Text>
          <Text variant="caption" color="textSubtle">
            {formatDate(last.date, activeLanguage)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
