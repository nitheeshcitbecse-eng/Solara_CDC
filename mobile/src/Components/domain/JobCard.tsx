import { BadgeCheck, Clock, MapPin } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { JobSummary } from '../../lib/types/jobs';
import { formatRupees } from '../../utils/format';
import { Text } from '../ui/Text';
import { WorkplaceRatingBadge } from './WorkplaceRatingBadge';

type JobCardProps = {
  job: JobSummary;
  onPress: (jobId: string) => void;
  /** Replaces the rating badge, e.g. a StatusPill on the Applied tab. */
  badge?: ReactNode;
  /** Extra line under the meta row (e.g. "Applied 2 days ago"). */
  footer?: ReactNode;
};

/**
 * Row 1: title + rating (or status) · Row 2: ₹ salary in Indian grouping ·
 * Row 3: city · shift · verified hirer. Memoised because it renders inside long lists.
 */
function JobCardBase({ job, onPress, badge, footer }: JobCardProps) {
  const { t } = useTranslation();
  const salary = `${formatRupees(job.salary.amount)}${t(`enums.salaryPer.${job.salary.type}`)}`;
  const location = job.location.area ? `${job.location.area}, ${job.location.city}` : job.location.city;

  return (
    <Pressable
      onPress={() => onPress(job.id)}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${salary}, ${location}, ${t(`enums.shift.${job.shift}`)}`}
      accessibilityHint={t('job.openHint')}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.titleRow}>
        <Text variant="heading" style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>
        {badge ?? (job.difficulty ? <WorkplaceRatingBadge difficulty={job.difficulty} /> : null)}
      </View>
      <Text variant="bodyStrong" color="primary" latin>
        {salary}
      </Text>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <MapPin size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {location}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="caption" color="textMuted">
            {t(`enums.shift.${job.shift}`)}
          </Text>
        </View>
        {job.hirer.verified ? (
          <View style={styles.metaItem}>
            <BadgeCheck size={sizes.iconSm} color={colors.success} strokeWidth={2} />
            <Text variant="caption" color="success">
              {t('common.verified')}
            </Text>
          </View>
        ) : null}
      </View>
      {footer}
    </Pressable>
  );
}

export const JobCard = memo(JobCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { backgroundColor: colors.surfaceSelected },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: spacing.xxs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 1 },
});
