import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, sizes, spacing, statusColors } from '../../lib/theme/tokens';
import type { ApplicationStatus } from '../../lib/types/applications';
import { Text } from '../ui/Text';

/** Application status with the shared colour mapping (Applied/Shortlisted/Hired/Rejected). */
export function StatusPill({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  const palette = statusColors[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <View style={[styles.dot, { backgroundColor: palette.foreground }]} />
      <Text variant="label" style={{ color: palette.foreground }}>
        {t(`enums.applicationStatus.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  dot: { width: sizes.badgeDot - 2, height: sizes.badgeDot - 2, borderRadius: radius.pill },
});
