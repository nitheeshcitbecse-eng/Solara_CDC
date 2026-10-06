import { zodResolver } from '@hookform/resolvers/zod';
import { usePreventRemove } from '@react-navigation/native';
import { BadgeCheck, Pencil, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { AudioPlayer } from '../../Components/media/AudioPlayer';
import { VoiceRecorder, type VoiceIntroValue } from '../../Components/media/VoiceRecorder';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { DateField } from '../../Components/ui/DateField';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useApplyToJob } from '../../api/queries/applications';
import { useJob } from '../../api/queries/jobs';
import { useMe } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { deleteTempFiles } from '../../utils/files';
import { formatDate, formatRupees, normalizeMultiline } from '../../utils/format';
import { applySchema, LIMITS, type ApplyForm } from '../../utils/validation';

const EMPTY: ApplyForm = { message: '', expectedSalary: '', availableFrom: '', sharePhone: false };

export function ApplyScreen({ navigation, route }: RootScreenProps<'Apply'>) {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const job = useJob(jobId);
  const me = useMe();
  const [progress, setProgress] = useState<number | null>(null);
  const apply = useApplyToJob(jobId, setProgress);
  const [voice, setVoice] = useState<VoiceIntroValue | null>(null);
  const [voiceError, setVoiceError] = useState<string | undefined>();
  const [phase, setPhase] = useState<'edit' | 'review'>('edit');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { control, handleSubmit, getValues, formState } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: EMPTY,
    values: me.data
      ? {
          ...EMPTY,
          expectedSalary: me.data.seeker?.expectedSalary ? String(me.data.seeker.expectedSalary) : '',
          sharePhone: me.data.settings.privacy.sharePhoneByDefault,
        }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  // Review → back returns to editing; editing with changes → confirm before leaving.
  const hasChanges = formState.isDirty || voice !== null;
  usePreventRemove(submittedId === null && (phase === 'review' || hasChanges), ({ data }) => {
    if (phase === 'review') {
      setPhase('edit');
      return;
    }
    Alert.alert(t('common.unsavedTitle'), t('common.unsavedBody'), [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Navigate only after the guard has been switched off by the re-render.
  useEffect(() => {
    if (submittedId) navigation.replace('ApplicationDetails', { applicationId: submittedId });
  }, [submittedId, navigation]);

  // An unsent recording is a temp file; clean it up if the user leaves without applying.
  const latest = useRef({ voice, submittedId });
  useEffect(() => {
    latest.current = { voice, submittedId };
  }, [voice, submittedId]);
  useEffect(
    () => () => {
      const { voice: pending, submittedId: sent } = latest.current;
      if (pending && !sent) deleteTempFiles([pending.uri]);
    },
    [],
  );

  const toReview = handleSubmit(() => {
    if (!voice) {
      setVoiceError('validation.required');
      return;
    }
    setPhase('review');
  });

  const submit = () => {
    if (!voice) return;
    const values = getValues();
    apply.mutate(
      {
        message: normalizeMultiline(values.message),
        voiceIntro: voice,
        expectedSalary: values.expectedSalary ? Number(values.expectedSalary) : null,
        availableFrom: values.availableFrom || null,
        sharePhone: values.sharePhone,
      },
      {
        onSuccess: (application) => {
          setProgress(null);
          showToast(t('apply.sent'), 'success');
          setSubmittedId(application.id);
        },
        onError: () => setProgress(null),
      },
    );
  };

  if (job.isPending || job.isError) {
    return (
      <Screen header={<Header title={t('apply.title')} />}>
        {job.isPending ? <ScreenSkeleton /> : <ErrorState error={job.error} onRetry={() => void job.refetch()} />}
      </Screen>
    );
  }

  const jobSummary = (
    <Card tone="muted">
      <Text variant="heading">{job.data.title}</Text>
      <View style={styles.hirer}>
        <Text variant="body" color="textMuted">
          {job.data.hirer.displayName}
        </Text>
        {job.data.hirer.verified ? <BadgeCheck size={sizes.iconSm} color={colors.success} strokeWidth={2} /> : null}
      </View>
      <Text variant="bodyStrong" color="primary" latin>
        {`${formatRupees(job.data.salary.amount)}${t(`enums.salaryPer.${job.data.salary.type}`)}`}
      </Text>
    </Card>
  );

  if (job.data.myApplicationId && !submittedId) {
    const applicationId = job.data.myApplicationId;
    return (
      <Screen header={<Header title={t('apply.title')} />}>
        {jobSummary}
        <InlineAlert tone="info" message={t('errors.ALREADY_APPLIED')} />
        <Button label={t('job.viewApplication')} onPress={() => navigation.replace('ApplicationDetails', { applicationId })} />
      </Screen>
    );
  }

  if (phase === 'review') {
    const values = getValues();
    return (
      <Screen
        header={<Header title={t('apply.reviewTitle')} onBack={() => setPhase('edit')} />}
        footer={
          <>
            {progress !== null ? (
              <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
                {t('common.uploading', { percent: Math.round(progress * 100) })}
              </Text>
            ) : null}
            <Button label={t('apply.submit')} icon={Send} onPress={submit} loading={apply.isPending} />
            <Button label={t('common.edit')} icon={Pencil} variant="secondary" onPress={() => setPhase('edit')} disabled={apply.isPending} />
          </>
        }
      >
        <Text variant="body" color="textMuted">
          {t('apply.reviewSubtitle')}
        </Text>
        {jobSummary}
        <Section title={t('apply.message')}>
          <Text variant="body">{normalizeMultiline(values.message)}</Text>
        </Section>
        {voice ? (
          <Section title={t('apply.voice')}>
            <AudioPlayer uri={voice.uri} durationSec={voice.durationSec} />
          </Section>
        ) : null}
        <Section title={t('apply.details')}>
          <Text variant="body">
            {`${t('apply.expectedSalary')}: ${values.expectedSalary ? formatRupees(Number(values.expectedSalary)) : t('apply.notSpecified')}`}
          </Text>
          <Text variant="body">
            {`${t('apply.availableFrom')}: ${values.availableFrom ? formatDate(values.availableFrom, activeLanguage) : t('apply.notSpecified')}`}
          </Text>
          <Text variant="body">{values.sharePhone ? t('apply.phoneShared') : t('apply.phoneHidden')}</Text>
        </Section>
        {apply.error ? <InlineAlert tone="danger" message={errorMessage(apply.error)} /> : null}
      </Screen>
    );
  }

  const thisYear = new Date().getFullYear();

  return (
    <Screen header={<Header title={t('apply.title')} />} footer={<Button label={t('apply.review')} onPress={() => void toReview()} />}>
      {jobSummary}
      <Controller
        control={control}
        name="message"
        render={({ field, fieldState }) => (
          <TextField
            label={t('apply.message')}
            hint={t('apply.messageHint')}
            placeholder={t('apply.messagePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={LIMITS.applyMessageMax}
            showCounter
          />
        )}
      />
      <VoiceRecorder
        value={voice}
        onChange={(next) => {
          setVoice(next);
          if (next) setVoiceError(undefined);
        }}
        error={voiceError}
      />
      <Controller
        control={control}
        name="expectedSalary"
        render={({ field, fieldState }) => (
          <TextField
            label={t('apply.expectedSalary')}
            prefix="₹"
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            optional
          />
        )}
      />
      <Controller
        control={control}
        name="availableFrom"
        render={({ field, fieldState }) => (
          <DateField
            mode="date"
            label={t('apply.availableFrom')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            minYear={thisYear}
            maxYear={thisYear + 1}
            optional
          />
        )}
      />
      <Controller
        control={control}
        name="sharePhone"
        render={({ field }) => (
          <View style={styles.consent}>
            <View style={styles.consentText}>
              <Text variant="bodyStrong">{t('apply.sharePhone')}</Text>
              <Text variant="caption" color="textMuted">
                {t('apply.sharePhoneHint')}
              </Text>
            </View>
            <Switch
              value={field.value}
              onValueChange={field.onChange}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              accessibilityLabel={t('apply.sharePhone')}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hirer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  consentText: { flex: 1, gap: 2 },
});
