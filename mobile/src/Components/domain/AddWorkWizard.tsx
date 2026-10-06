import { zodResolver } from '@hookform/resolvers/zod';
import { StackActions, useNavigation, usePreventRemove } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, Clock, ImagePlus, ScanSearch, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useCreateJob, useJobAnalysis, useSubmitJob, useUpdateJob, useUploadJobPhotos } from '../../api/queries/admin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { queryKeys } from '../../api/queryKeys';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import type { JobDetail, Sector } from '../../lib/types/jobs';
import type { HirerProfile } from '../../lib/types/profile';
import { emptyJobDetails, jobDetailsFrom, jobFieldsFrom } from '../../utils/jobForms';
import { jobDetailsSchema, LIMITS, type JobDetailsForm } from '../../utils/validation';
import { InlineAlert } from '../feedback/InlineAlert';
import { Header } from '../layout/Header';
import { Screen } from '../layout/Screen';
import { PhotoPicker } from '../media/PhotoPicker';
import { Button } from '../ui/Button';
import { StepProgress } from '../ui/StepProgress';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { AnalysisResult } from './AnalysisResult';
import { JobDetailsFields } from './JobDetailsFields';
import { SectorPicker, type SectorChoice } from './SectorPicker';

type Step = 'sector' | 'details' | 'photos' | 'analysing' | 'result' | 'success';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 6;

type AddWorkWizardProps = {
  sectors: readonly Sector[];
  hirer: HirerProfile | null;
  /** An existing draft to continue (from My jobs or "Upload new photos"). */
  initialJob: JobDetail | null;
};

function initialSector(job: JobDetail | null): SectorChoice | null {
  if (!job) return null;
  if (job.sector) return { kind: 'existing', sectorId: job.sector.id };
  if (job.proposedSectorName) return { kind: 'new', name: job.proposedSectorName, decision: 'new' };
  return null;
}

function initialStep(job: JobDetail | null): Step {
  if (!job) return 'sector';
  // Photos already uploaded → show (or keep polling) their analysis; otherwise ask for photos.
  return job.photos.length > 0 ? 'analysing' : 'photos';
}

/**
 * Add work: 1 sector → 2 details → 3 workplace photos → AI analysis → result → success.
 * Every step is saved to the server, so leaving mid-way keeps a draft in "My jobs".
 */
export function AddWorkWizard({ sectors, hirer, initialJob }: AddWorkWizardProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();

  const [step, setStep] = useState<Step>(() => initialStep(initialJob));
  const [jobId, setJobId] = useState<string | null>(initialJob?.id ?? null);
  const [sector, setSector] = useState<SectorChoice | null>(() => initialSector(initialJob));
  const [sectorError, setSectorError] = useState(false);
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<JobDetail | null>(null);
  const [leaving, setLeaving] = useState(false);

  const createJob = useCreateJob();
  const updateJob = useUpdateJob(jobId ?? '');
  const upload = useUploadJobPhotos(setProgress);
  const submit = useSubmitJob();
  const analysis = useJobAnalysis(jobId, step === 'analysing' || step === 'result');

  const form = useForm<JobDetailsForm>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: initialJob ? jobDetailsFrom(initialJob) : emptyJobDetails(hirer),
  });

  const result = analysis.data?.status === 'complete' ? analysis.data : null;
  // The analysis query decides when "analysing" turns into "result".
  const visibleStep: Step = step === 'analysing' && result ? 'result' : step;

  // The job's status changed on the server (draft / pending review); refresh the hirer's lists.
  useEffect(() => {
    if (result) void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [result, queryClient]);

  const hasWork = form.formState.isDirty || sector !== null || jobId !== null || photos.length > 0;
  usePreventRemove(visibleStep !== 'success' && !leaving && hasWork, ({ data }) => {
    if (visibleStep === 'details') return setStep('sector');
    if (visibleStep === 'photos' && !initialJob) return setStep('details');
    const draftSaved = jobId !== null;
    Alert.alert(
      draftSaved ? t('addWork.leaveTitle') : t('common.unsavedTitle'),
      draftSaved ? t('addWork.leaveBody') : t('common.unsavedBody'),
      [
        { text: t('common.keepEditing'), style: 'cancel' },
        { text: draftSaved ? t('addWork.leave') : t('common.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ],
    );
  });

  // Must come AFTER usePreventRemove: effects run in declaration order, so the guard has
  // already been switched off (leaving === true) by the time we navigate back.
  useEffect(() => {
    if (leaving) navigation.goBack();
  }, [leaving, navigation]);

  const sectorInput = () =>
    sector?.kind === 'existing'
      ? { sectorId: sector.sectorId, proposedSectorName: null }
      : { sectorId: null, proposedSectorName: sector?.name ?? null };

  const continueFromSector = () => {
    if (!sector) {
      setSectorError(true);
      return;
    }
    setSectorError(false);
    setStep('details');
  };

  const saveDetails = form.handleSubmit((values) => {
    const input = { ...sectorInput(), ...jobFieldsFrom(values) };
    const onSuccess = (job: JobDetail) => {
      setJobId(job.id);
      form.reset(values);
      setStep('photos');
    };
    if (jobId) updateJob.mutate(input, { onSuccess });
    else createJob.mutate(input, { onSuccess });
  });

  const uploadPhotos = () => {
    if (!jobId) return;
    if (photos.length < MIN_PHOTOS) {
      setPhotoError('validation.tooShort');
      return;
    }
    setPhotoError(undefined);
    upload.mutate(
      { jobId, photos, note: note.trim() },
      {
        onSuccess: () => {
          setProgress(null);
          setPhotos([]);
          setStep('analysing');
        },
        onError: () => setProgress(null),
      },
    );
  };

  const submitJob = () => {
    if (!jobId) return;
    submit.mutate(jobId, {
      onSuccess: (job) => {
        setSubmitted(job);
        setStep('success');
      },
    });
  };

  const stepNumber = visibleStep === 'sector' ? 1 : visibleStep === 'details' ? 2 : 3;
  const stepTitle = stepNumber === 1 ? t('addWork.stepSector') : stepNumber === 2 ? t('addWork.stepDetails') : t('addWork.stepPhotos');
  const header = <Header title={t('addWork.title')} />;
  const progressBar =
    visibleStep === 'success' ? null : <StepProgress current={stepNumber} total={3} title={stepTitle} />;

  if (visibleStep === 'sector') {
    return (
      <Screen scroll={false} header={header} footer={<Button label={t('common.continue')} onPress={continueFromSector} />}>
        <SectorPicker
          sectors={sectors}
          value={sector}
          onChange={(next) => {
            setSector(next);
            if (next) setSectorError(false);
          }}
          header={
            <View style={styles.intro}>
              {progressBar}
              <Text variant="title" accessibilityRole="header">
                {t('addWork.sectorTitle')}
              </Text>
              <Text variant="body" color="textMuted">
                {t('addWork.sectorSubtitle')}
              </Text>
              {sectorError ? <InlineAlert tone="danger" message={t('addWork.sectorRequired')} /> : null}
            </View>
          }
        />
      </Screen>
    );
  }

  if (visibleStep === 'details') {
    const failure = createJob.error ?? updateJob.error;
    return (
      <Screen
        header={header}
        footer={<Button label={t('common.continue')} onPress={() => void saveDetails()} loading={createJob.isPending || updateJob.isPending} />}
      >
        {progressBar}
        <Text variant="title" accessibilityRole="header">
          {t('addWork.detailsTitle')}
        </Text>
        <JobDetailsFields control={form.control} />
        {failure ? <InlineAlert tone="danger" message={errorMessage(failure)} /> : null}
      </Screen>
    );
  }

  if (visibleStep === 'photos') {
    return (
      <Screen
        header={header}
        footer={
          <>
            {progress !== null ? (
              <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
                {t('common.uploading', { percent: Math.round(progress * 100) })}
              </Text>
            ) : null}
            <Button
              label={t('addWork.uploadAnalyse')}
              icon={ScanSearch}
              onPress={uploadPhotos}
              loading={upload.isPending}
              disabled={photos.length < MIN_PHOTOS}
            />
          </>
        }
      >
        {progressBar}
        <Text variant="title" accessibilityRole="header">
          {t('addWork.photosTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('addWork.photosSubtitle')}
        </Text>
        <PhotoPicker value={photos} onChange={setPhotos} min={MIN_PHOTOS} max={MAX_PHOTOS} error={photoError} />
        <TextField
          label={t('addWork.note')}
          hint={t('addWork.noteHint')}
          value={note}
          onChangeText={setNote}
          maxLength={LIMITS.listItem * 2}
          multiline
          optional
        />
        {upload.error ? <InlineAlert tone="danger" message={errorMessage(upload.error)} /> : null}
      </Screen>
    );
  }

  if (visibleStep === 'analysing') {
    return (
      <Screen header={header} contentStyle={styles.center}>
        <View style={styles.bigIcon}>
          <ScanSearch size={sizes.iconLg + spacing.sm} color={colors.primary} strokeWidth={2} />
        </View>
        <Text variant="title" align="center" accessibilityRole="header">
          {t('addWork.analysingTitle')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t('addWork.analysingBody')}
        </Text>
        {analysis.isError ? (
          <InlineAlert tone="danger" message={errorMessage(analysis.error)} />
        ) : (
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('a11y.loading')} />
        )}
      </Screen>
    );
  }

  if (visibleStep === 'result' && result) {
    const footer =
      result.verdict === 'pass' ? (
        <Button label={t('addWork.submit')} icon={Send} onPress={submitJob} loading={submit.isPending} />
      ) : result.verdict === 'rejected' ? (
        <Button label={t('addWork.newPhotos')} icon={ImagePlus} onPress={() => setStep('photos')} />
      ) : (
        <Button label={t('common.done')} variant="secondary" onPress={() => setLeaving(true)} />
      );
    return (
      <Screen header={header} footer={footer}>
        {progressBar}
        <Text variant="title" accessibilityRole="header">
          {t('addWork.resultTitle')}
        </Text>
        <AnalysisResult analysis={result} />
        {submit.error ? <InlineAlert tone="danger" message={errorMessage(submit.error)} /> : null}
      </Screen>
    );
  }

  // Success
  const live = submitted?.status === 'active';
  return (
    <Screen
      header={<Header back={false} title={t('addWork.title')} />}
      contentStyle={styles.center}
      footer={
        <>
          {/* The guard is off on this step, so plain navigation is safe here. */}
          {submitted ? (
            <Button label={t('addWork.viewJob')} onPress={() => navigation.dispatch(StackActions.replace('JobManage', { jobId: submitted.id }))} />
          ) : null}
          <Button label={t('addWork.backToDashboard')} variant="secondary" onPress={() => navigation.goBack()} />
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.successBody}>
        <View style={[styles.bigIcon, live ? styles.successIcon : styles.pendingIcon]}>
          {live ? (
            <CircleCheckBig size={sizes.iconLg + spacing.sm} color={colors.success} strokeWidth={2} />
          ) : (
            <Clock size={sizes.iconLg + spacing.sm} color={colors.warning} strokeWidth={2} />
          )}
        </View>
        <Text variant="title" align="center" accessibilityRole="header">
          {live ? t('addWork.liveTitle') : t('addWork.pendingTitle')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {live ? t('addWork.liveBody') : t('addWork.pendingBody')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  center: { justifyContent: 'center', alignItems: 'stretch', gap: spacing.md },
  bigIcon: {
    alignSelf: 'center',
    width: sizes.avatarLg + spacing.lg,
    height: sizes.avatarLg + spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: { backgroundColor: colors.successSoft },
  pendingIcon: { backgroundColor: colors.warningSoft },
  successBody: { gap: spacing.md, flexGrow: 1, justifyContent: 'center' },
});
