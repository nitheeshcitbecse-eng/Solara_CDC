import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, sizes, spacing, statusColors } from '../../lib/theme/tokens';
import type { StatusEvent } from '../../lib/types/applications';
import { formatDate, formatTime } from '../../utils/format';
import { Text } from '../ui/Text';

/** Vertical timeline of an application's status changes, oldest first. */
export function StatusTimeline({ events }: { events: readonly StatusEvent[] }) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();

  return (
    <View accessibilityRole="list">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const palette = statusColors[event.status];
        return (
          <View key={`${event.status}-${event.at}`} style={styles.row} accessibilityRole="text">
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: palette.foreground }]} />
              {isLast ? null : <View style={styles.line} />}
            </View>
            <View style={[styles.body, isLast ? null : styles.bodySpacing]}>
              <Text variant="bodyStrong">{t(`enums.applicationStatus.${event.status}`)}</Text>
              <Text variant="caption" color="textMuted">
                {`${formatDate(event.at, activeLanguage)} · ${formatTime(event.at, activeLanguage)}`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  rail: { alignItems: 'center', width: sizes.timelineDot },
  dot: { width: sizes.timelineDot, height: sizes.timelineDot, borderRadius: radius.pill, marginTop: spacing.xxs + 2 },
  line: { flex: 1, width: sizes.focusRing, backgroundColor: colors.border, marginVertical: spacing.xxs },
  body: { flex: 1, gap: 2 },
  bodySpacing: { paddingBottom: spacing.md },
});
