import { usePreventScreenCapture } from 'expo-screen-capture';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AadhaarFields } from '../../Components/domain/AadhaarFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useUpdateHirerProfile, useUploadAadhaar } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import type { RootScreenProps } from '../../lib/types/navigation';
import { aadhaarSchema } from '../../utils/validation';

/** Hirer onboarding 3/3: Aadhaar is required before a hirer can post work. */
export function AdminOnboardingAadhaarScreen({ navigation }: RootScreenProps<'AdminOnboardingAadhaar'>) {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useUploadAadhaar(setProgress);
  const save = useUpdateHirerProfile();
  const [front, setFront] = useState<LocalFile | null>(null);
  const [back, setBack] = useState<LocalFile | null>(null);
  const [last4, setLast4] = useState('');
  const [errors, setErrors] = useState<{ front?: string; last4?: string }>({});
  const busy = upload.isPending || save.isPending;
  useUnsavedChangesGuard((front !== null || last4 !== '') && !busy);

  const submit = async () => {
    const next: { front?: string; last4?: string } = {};
    if (!front) next.front = 'validation.required';
    if (!aadhaarSchema.safeParse({ last4 }).success) next.last4 = 'validation.last4';
    setErrors(next);
    if (!front || next.last4) return;
    try {
      await upload.mutateAsync({ front, back, last4 });
      setProgress(null);
      await save.mutateAsync({ onboardingStep: 4 });
      setFront(null);
      setBack(null);
      setLast4('');
      navigation.navigate('VerificationStatus');
    } catch {
      setProgress(null);
    }
  };

  const failure = upload.error ?? save.error;

  return (
    <Screen
      header={<Header />}
      footer={
        <>
          {progress !== null ? (
            <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
              {t('common.uploading', { percent: Math.round(progress * 100) })}
            </Text>
          ) : null}
          <Button label={t('identity.submit')} onPress={() => void submit()} loading={busy} />
        </>
      }
    >
      <StepProgress current={3} total={3} title={t('hirer.stepVerify')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('hirer.verifyTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('hirer.verifySubtitle')}
        </Text>
      </View>
      <AadhaarFields
        front={front}
        back={back}
        last4={last4}
        onFrontChange={setFront}
        onBackChange={setBack}
        onLast4Change={setLast4}
        frontError={errors.front}
        last4Error={errors.last4}
      />
      {failure ? <InlineAlert tone="danger" message={errorMessage(failure)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
});
