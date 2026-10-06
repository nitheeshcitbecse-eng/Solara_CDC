import { BadgeCheck, MapPin } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { ApplicantSummary } from '../../lib/types/applications';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { StatusPill } from './StatusPill';

type ApplicantCardProps = {
  applicant: ApplicantSummary;
  onPress: (applicationId: string) => void;
  /** Show which job they applied for (dashboard), hidden inside a job's own list. */
  showJob?: boolean;
};

function ApplicantCardBase({ applicant, onPress, showJob = false }: ApplicantCardProps) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const open = useCallback(() => onPress(applicant.id), [onPress, applicant.id]);
  const person = applicant.applicant;

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={[person.name, showJob ? applicant.jobTitle : null, t(`enums.applicationStatus.${applicant.status}`)]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Avatar name={person.name} size="md" />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {person.name}
          </Text>
          {person.verified ? <BadgeCheck size={sizes.iconSm} color={colors.success} strokeWidth={2} /> : null}
        </View>
        {showJob ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {applicant.jobTitle}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {person.city ? (
            <>
              <MapPin size={sizes.iconSm - 2} color={colors.textSubtle} strokeWidth={2} />
              <Text variant="caption" color="textSubtle">
                {person.city}
              </Text>
            </>
          ) : null}
          <Text variant="caption" color="textSubtle">
            {`· ${relativeTime(applicant.createdAt)}`}
          </Text>
        </View>
        {person.skills.length > 0 ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {person.skills.slice(0, 3).join(' · ')}
          </Text>
        ) : null}
      </View>
      <StatusPill status={applicant.status} />
    </Pressable>
  );
}

export const ApplicantCard = memo(ApplicantCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceSelected },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  name: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
