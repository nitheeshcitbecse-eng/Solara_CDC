import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AadhaarFields } from '../../Components/domain/AadhaarFields';
import { AadhaarStatusCard } from '../../Components/domain/AadhaarStatusCard';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { Text } from '../../Components/ui/Text';
import { useToast } from '../../context/ToastContext';
import { useMe, useUploadAadhaar } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import type { LocalFile } from '../../lib/types/common';
import type { RootScreenProps } from '../../lib/types/navigation';
import { aadhaarSchema } from '../../utils/validation';

/** Upload or re-upload Aadhaar (job seekers and hirers). Screenshots are blocked here. */
export function AadhaarUploadScreen({ navigation }: RootScreenProps<'AadhaarUpload'>) {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useUploadAadhaar(setProgress);
  const [front, setFront] = useState<LocalFile | null>(null);
  const [back, setBack] = useState<LocalFile | null>(null);
  const [last4, setLast4] = useState('');
  const [errors, setErrors] = useState<{ front?: string; last4?: string }>({});
  const [done, setDone] = useState(false);

  useUnsavedChangesGuard(!done && (front !== null || last4 !== '') && !upload.isPending);
  useEffect(() => {
    if (done) navigation.goBack();
  }, [done, navigation]);

  const aadhaar = me.data?.seeker?.aadhaar ?? me.data?.hirer?.aadhaar;

  const submit = () => {
    const next: { front?: string; last4?: string } = {};
    if (!front) next.front = 'validation.required';
    if (!aadhaarSchema.safeParse({ last4 }).success) next.last4 = 'validation.last4';
    setErrors(next);
    if (!front || next.last4) return;
    upload.mutate(
      { front, back, last4 },
      {
        onSuccess: () => {
          setProgress(null);
          showToast(t('identity.submitted'), 'success');
          setDone(true);
        },
        onError: () => setProgress(null),
      },
    );
  };

  if (me.isPending || me.isError || !aadhaar) {
    return (
      <Screen header={<Header title={t('identity.title')} />}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton />}
      </Screen>
    );
  }

  const canUpload = aadhaar.status === 'none' || aadhaar.status === 'rejected';

  return (
    <Screen
      header={<Header title={t('identity.title')} />}
      footer={
        canUpload ? (
          <>
            {progress !== null ? (
              <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
                {t('common.uploading', { percent: Math.round(progress * 100) })}
              </Text>
            ) : null}
            <Button label={t('identity.submit')} onPress={submit} loading={upload.isPending} />
          </>
        ) : null
      }
    >
      <AadhaarStatusCard aadhaar={aadhaar} />
      {aadhaar.status === 'pending' ? <InlineAlert tone="info" message={t('identity.pendingNote')} /> : null}
      {aadhaar.status === 'verified' ? <InlineAlert tone="success" message={t('identity.verifiedNote')} /> : null}
      {canUpload ? (
        <>
          <Text variant="body" color="textMuted">
            {t('identity.uploadIntro')}
          </Text>
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
        </>
      ) : null}
      {upload.error ? <InlineAlert tone="danger" message={errorMessage(upload.error)} /> : null}
    </Screen>
  );
}
