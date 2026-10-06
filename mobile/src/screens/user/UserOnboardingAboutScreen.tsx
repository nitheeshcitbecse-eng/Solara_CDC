import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SeekerAboutFields } from '../../Components/domain/SeekerAboutFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { IconButton } from '../../Components/ui/IconButton';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useMe, useUpdateSeekerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useResumeSteps } from '../../lib/hooks/useResumeSteps';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { USER_ONBOARDING_STEPS } from '../../navigation/onboardingSteps';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { aboutFormFrom, aboutPatch, EMPTY_ABOUT } from '../../utils/profileForms';
import { aboutSchema, type AboutForm } from '../../utils/validation';

export function UserOnboardingAboutScreen({ navigation }: RootScreenProps<'UserOnboardingAbout'>) {
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const seeker = me.data?.seeker ?? null;
  const save = useUpdateSeekerProfile();

  // Returning users continue at the step they last saved.
  useResumeSteps(USER_ONBOARDING_STEPS, seeker?.onboardingStep ?? null);

  const { control, handleSubmit, reset, formState } = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: EMPTY_ABOUT,
    values: seeker ? aboutFormFrom(seeker, me.data?.user.email ?? null) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !save.isPending);

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { ...aboutPatch(values), onboardingStep: Math.max(2, seeker?.onboardingStep ?? 1) as 2 | 3 },
      {
        onSuccess: () => {
          reset(values);
          navigation.navigate('UserOnboardingEducation');
        },
      },
    );
  });

  const header = (
    <Header back={false} right={<IconButton icon={LogOut} onPress={() => void signOut()} accessibilityLabel={t('common.signOut')} />} />
  );

  if (me.isPending || me.isError) {
    return (
      <Screen header={header}>
        {me.isPending ? <ScreenSkeleton /> : <ErrorState error={me.error} onRetry={() => void me.refetch()} />}
      </Screen>
    );
  }

  return (
    <Screen header={header} footer={<Button label={t('common.continue')} onPress={() => void onSubmit()} loading={save.isPending} />}>
      <StepProgress current={1} total={3} title={t('onboarding.stepAbout')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.aboutTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('onboarding.aboutSubtitle')}
        </Text>
      </View>
      <SeekerAboutFields control={control} />
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
});
