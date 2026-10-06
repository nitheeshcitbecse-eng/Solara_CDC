import { BadgeCheck, Clock, IdCard, Plus, ShieldX, Upload, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AadhaarStatusCard } from '../../Components/domain/AadhaarStatusCard';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { Text } from '../../Components/ui/Text';
import { useSessionUser } from '../../context/AuthContext';
import { useMe, useUpdateHirerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, radius, sizes, spacing, type ColorToken } from '../../lib/theme/tokens';
import type { VerificationStatus } from '../../lib/types/auth';
import type { RootScreenProps } from '../../lib/types/navigation';

const ICON: Record<VerificationStatus, { icon: LucideIcon; color: ColorToken; background: string }> = {
  none: { icon: IdCard, color: 'textMuted', background: colors.surfaceMuted },
  pending: { icon: Clock, color: 'warning', background: colors.warningSoft },
  verified: { icon: BadgeCheck, color: 'success', background: colors.successSoft },
  rejected: { icon: ShieldX, color: 'danger', background: colors.dangerSoft },
};

/**
 * Hirer verification state. Shown as the last onboarding step (profile not yet
 * complete) and later from the dashboard banner. Polls while review is pending.
 */
export function VerificationStatusScreen({ navigation }: RootScreenProps<'VerificationStatus'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const errorMessage = useErrorMessage();
  const me = useMe(true);
  const complete = useUpdateHirerProfile();
  const inOnboarding = !user.profileComplete;
  const aadhaar = me.data?.hirer?.aadhaar;

  if (me.isPending || me.isError || !aadhaar) {
    return (
      <Screen header={<Header title={t('hirer.verificationTitle')} />}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton />}
      </Screen>
    );
  }

  const style = ICON[aadhaar.status];
  const Icon = style.icon;
  const uploadAgain = () => (inOnboarding ? navigation.navigate('AdminOnboardingAadhaar') : navigation.navigate('AadhaarUpload'));

  const footer = inOnboarding ? (
    aadhaar.status === 'rejected' ? (
      <Button label={t('profile.reupload')} icon={Upload} onPress={uploadAgain} />
    ) : (
      // Completing onboarding flips profileComplete; the navigator then shows the dashboard.
      <Button label={t('hirer.goToDashboard')} onPress={() => complete.mutate({ complete: true })} loading={complete.isPending} />
    )
  ) : aadhaar.status === 'rejected' || aadhaar.status === 'none' ? (
    <Button label={t('profile.reupload')} icon={Upload} onPress={uploadAgain} />
  ) : aadhaar.status === 'verified' ? (
    <Button label={t('dashboard.addWork')} icon={Plus} onPress={() => navigation.navigate('AddWork')} />
  ) : null;

  return (
    <Screen header={<Header title={t('hirer.verificationTitle')} back={inOnboarding ? false : undefined} />} footer={footer}>
      <View style={[styles.bigIcon, { backgroundColor: style.background }]}>
        <Icon size={sizes.iconLg + spacing.sm} color={colors[style.color]} strokeWidth={2} />
      </View>
      <Text variant="title" align="center" accessibilityRole="header">
        {t(`hirer.status.${aadhaar.status}.title`)}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {t(`hirer.status.${aadhaar.status}.body`)}
      </Text>
      <AadhaarStatusCard aadhaar={aadhaar} />
      {complete.error ? <InlineAlert tone="danger" message={errorMessage(complete.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigIcon: {
    alignSelf: 'center',
    width: sizes.avatarLg + spacing.lg,
    height: sizes.avatarLg + spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});
