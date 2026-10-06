import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SeekerEducationFields } from '../../Components/domain/SeekerEducationFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useMe, useUpdateSeekerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { educationFormFrom, educationPatch, EMPTY_EDUCATION } from '../../utils/profileForms';
import { educationSchema, type EducationForm } from '../../utils/validation';

export function UserOnboardingEducationScreen({ navigation }: RootScreenProps<'UserOnboardingEducation'>) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const seeker = me.data?.seeker ?? null;
  const save = useUpdateSeekerProfile();

  const { control, handleSubmit, reset, setValue, formState } = useForm<EducationForm>({
    resolver: zodResolver(educationSchema),
    defaultValues: EMPTY_EDUCATION,
    values: seeker ? educationFormFrom(seeker) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !save.isPending);

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { ...educationPatch(values), onboardingStep: 3 },
      {
        onSuccess: () => {
          reset(values);
          navigation.navigate('UserOnboardingWork');
        },
      },
    );
  });

  return (
    <Screen header={<Header />} footer={<Button label={t('common.continue')} onPress={() => void onSubmit()} loading={save.isPending} />}>
      <StepProgress current={2} total={3} title={t('onboarding.stepEducation')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.educationTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('onboarding.educationSubtitle')}
        </Text>
      </View>
      <SeekerEducationFields control={control} setValue={setValue} />
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
});
