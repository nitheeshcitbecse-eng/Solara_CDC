import { zodResolver } from '@hookform/resolvers/zod';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AadhaarFields } from '../../Components/domain/AadhaarFields';
import { SeekerWorkFields } from '../../Components/domain/SeekerWorkFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { Button } from '../../Components/ui/Button';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useToast } from '../../context/ToastContext';
import { useMe, useUpdateSeekerProfile, useUploadAadhaar } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import type { RootScreenProps } from '../../lib/types/navigation';
import { EMPTY_WORK, workFormFrom, workPatch } from '../../utils/profileForms';
import { aadhaarSchema, workSchema, type WorkForm } from '../../utils/validation';

export function UserOnboardingWorkScreen(_props: RootScreenProps<'UserOnboardingWork'>) {
  // This screen can show an identity document, so screenshots/recording are blocked.
  usePreventScreenCapture();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const seeker = me.data?.seeker ?? null;
  const save = useUpdateSeekerProfile();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const upload = useUploadAadhaar(setUploadProgress);

  const [front, setFront] = useState<LocalFile | null>(null);
  const [back, setBack] = useState<LocalFile | null>(null);
  const [last4, setLast4] = useState('');
  const [aadhaarErrors, setAadhaarErrors] = useState<{ front?: string; last4?: string }>({});

  const { control, handleSubmit, formState } = useForm<WorkForm>({
    resolver: zodResolver(workSchema),
    defaultValues: EMPTY_WORK,
    values: seeker ? workFormFrom(seeker) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const busy = save.isPending || upload.isPending;
  useUnsavedChangesGuard((formState.isDirty || front !== null) && !busy);

  const onFinish = handleSubmit(async (values) => {
    // Aadhaar is optional for job seekers, but if they start it, both parts are needed.
    const wantsAadhaar = front !== null || last4 !== '';
    const errors: { front?: string; last4?: string } = {};
    if (wantsAadhaar && !front) errors.front = 'validation.required';
    if (wantsAadhaar && !aadhaarSchema.safeParse({ last4 }).success) errors.last4 = 'validation.last4';
    setAadhaarErrors(errors);
    if (errors.front || errors.last4) return;

    try {
      if (front) await upload.mutateAsync({ front, back, last4 });
      setUploadProgress(null);
      const updated = await save.mutateAsync({ ...workPatch(values), complete: true });
      // profileComplete is now true, so the navigator switches to the home tabs by itself.
      showToast(t('onboarding.welcome', { name: updated.user.firstName ?? '' }), 'success');
    } catch {
      setUploadProgress(null);
    }
  });

  const failure = upload.error ?? save.error;

  return (
    <Screen
      header={<Header />}
      footer={
        <>
          {uploadProgress !== null ? (
            <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
              {t('common.uploading', { percent: Math.round(uploadProgress * 100) })}
            </Text>
          ) : null}
          <Button label={t('onboarding.finish')} onPress={() => void onFinish()} loading={busy} />
        </>
      }
    >
      <StepProgress current={3} total={3} title={t('onboarding.stepWork')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.workTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('onboarding.workSubtitle')}
        </Text>
      </View>

      <SeekerWorkFields control={control} />

      <Section title={t('onboarding.idTitle')}>
        <Text variant="body" color="textMuted">
          {t('onboarding.idSubtitle')}
        </Text>
        <AadhaarFields
          front={front}
          back={back}
          last4={last4}
          onFrontChange={setFront}
          onBackChange={setBack}
          onLast4Change={setLast4}
          frontError={aadhaarErrors.front}
          last4Error={aadhaarErrors.last4}
        />
      </Section>

      {failure ? <InlineAlert tone="danger" message={errorMessage(failure)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
});
