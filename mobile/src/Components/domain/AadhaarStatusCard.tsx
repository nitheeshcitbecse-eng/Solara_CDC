import { BadgeCheck, Clock, IdCard, ShieldX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { AadhaarInfo } from '../../lib/types/profile';
import { maskAadhaar } from '../../utils/format';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

const TONES: Record<AadhaarInfo['status'], BadgeTone> = {
  none: 'neutral',
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
};

/** Masked Aadhaar number (last 4 only) with its verification status. */
export function AadhaarStatusCard({ aadhaar }: { aadhaar: AadhaarInfo }) {
  const { t } = useTranslation();
  const Icon = aadhaar.status === 'verified' ? BadgeCheck : aadhaar.status === 'rejected' ? ShieldX : aadhaar.status === 'pending' ? Clock : IdCard;

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <Icon size={sizes.icon} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.text}>
          <Text variant="label" color="textMuted">
            {t('profile.aadhaar')}
          </Text>
          <Text variant="bodyStrong" latin accessibilityLabel={t('aadhaar.masked', { masked: maskAadhaar(aadhaar.last4) })}>
            {aadhaar.status === 'none' ? t('enums.verification.none') : maskAadhaar(aadhaar.last4)}
          </Text>
        </View>
        <Badge label={t(`enums.verification.${aadhaar.status}`)} tone={TONES[aadhaar.status]} />
      </View>
      {aadhaar.status === 'rejected' && aadhaar.rejectionReason ? (
        <Text variant="caption" color="danger">
          {aadhaar.rejectionReason}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
