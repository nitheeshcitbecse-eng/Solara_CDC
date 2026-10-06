import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HirerDetailsFields } from '../../Components/domain/HirerDetailsFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useMe, useUpdateHirerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { hirerDetailsFrom, hirerPatch } from '../../utils/jobForms';
import { hirerDetailsSchema, type HirerDetailsForm } from '../../utils/validation';

const EMPTY: HirerDetailsForm = {
  hirerType: 'individual',
  name: '',
  businessName: '',
  line1: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
};

/** Hirer onboarding 2/3: name, business name, address and optional GSTIN. */
export function AdminOnboardingDetailsScreen({ navigation }: RootScreenProps<'AdminOnboardingDetails'>) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const hirer = me.data?.hirer ?? null;
  const save = useUpdateHirerProfile();
  const { control, handleSubmit, reset, setValue, formState } = useForm<HirerDetailsForm>({
    resolver: zodResolver(hirerDetailsSchema),
    defaultValues: EMPTY,
    values: hirer ? hirerDetailsFrom(hirer) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !save.isPending);

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { ...hirerPatch(values), onboardingStep: Math.max(3, hirer?.onboardingStep ?? 1) as 3 | 4 },
      {
        onSuccess: () => {
          reset(values);
          navigation.navigate('AdminOnboardingAadhaar');
        },
      },
    );
  });

  return (
    <Screen header={<Header />} footer={<Button label={t('common.continue')} onPress={() => void onSubmit()} loading={save.isPending} />}>
      <StepProgress current={2} total={3} title={t('hirer.stepDetails')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('hirer.detailsTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('hirer.detailsSubtitle')}
        </Text>
      </View>
      <HirerDetailsFields control={control} setValue={setValue} />
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
});
