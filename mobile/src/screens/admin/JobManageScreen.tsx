import { zodResolver } from '@hookform/resolvers/zod';
import { CirclePlay, Clock, MapPin, Pencil, UsersRound, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AnalysisResult } from '../../Components/domain/AnalysisResult';
import { JobDetailsFields } from '../../Components/domain/JobDetailsFields';
import { JobStatusBadge } from '../../Components/domain/JobStatusBadge';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { PhotoCarousel } from '../../Components/media/PhotoCarousel';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { useToast } from '../../context/ToastContext';
import { useCloseJob, useJobAnalysis, useUpdateJob } from '../../api/queries/admin';
import { useJob } from '../../api/queries/jobs';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { sectorLabel } from '../../lib/i18n/labels';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { JobStatus } from '../../lib/types/jobs';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatRupees } from '../../utils/format';
import { emptyJobDetails, jobDetailsFrom, jobFieldsFrom } from '../../utils/jobForms';
import { jobDetailsSchema, type JobDetailsForm } from '../../utils/validation';

const EDITABLE: readonly JobStatus[] = ['draft', 'pending_review', 'active', 'rejected'];
const CLOSABLE: readonly JobStatus[] = ['active', 'pending_review'];
const NEEDS_SETUP: readonly JobStatus[] = ['draft', 'rejected'];

/** A hirer's own job: status, applicants, edit details, continue setup or close. */
export function JobManageScreen({ navigation, route }: RootScreenProps<'JobManage'>) {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const job = useJob(jobId);
  const hasPhotos = (job.data?.photos.length ?? 0) > 0;
  const analysis = useJobAnalysis(jobId, hasPhotos);
  const update = useUpdateJob(jobId);
  const close = useCloseJob();
  const [editing, setEditing] = useState(false);

  const form = useForm<JobDetailsForm>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: emptyJobDetails(null),
    values: job.data ? jobDetailsFrom(job.data) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(editing && form.formState.isDirty && !update.isPending);

  if (job.isPending || job.isError) {
    return (
      <Screen header={<Header title={t('manage.title')} />}>
        {job.isPending ? <ScreenSkeleton variant="detail" /> : <ErrorState error={job.error} onRetry={() => void job.refetch()} />}
      </Screen>
    );
  }

  const data = job.data;

  const save = form.handleSubmit((values) => {
    update.mutate(jobFieldsFrom(values), {
      onSuccess: (updated) => {
        form.reset(jobDetailsFrom(updated));
        showToast(t('manage.saved'), 'success');
        setEditing(false);
      },
    });
  });

  const confirmClose = () =>
    Alert.alert(t('manage.closeTitle'), t('manage.closeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manage.close'),
        style: 'destructive',
        onPress: () =>
          close.mutate(jobId, {
            onSuccess: () => showToast(t('manage.closed'), 'success'),
            onError: (error) => showToast(errorMessage(error), 'error'),
          }),
      },
    ]);

  const stopEditing = () => {
    form.reset(jobDetailsFrom(data));
    setEditing(false);
  };

  // Back while editing returns to the job (asking first if there are unsaved changes).
  const leaveEdit = () => {
    if (!form.formState.isDirty) return stopEditing();
    Alert.alert(t('common.unsavedTitle'), t('common.unsavedBody'), [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: stopEditing },
    ]);
  };

  if (editing) {
    return (
      <Screen
        header={<Header title={t('manage.editTitle')} onBack={leaveEdit} />}
        footer={
          <>
            <Button label={t('common.saveChanges')} onPress={() => void save()} loading={update.isPending} />
            <Button label={t('common.cancel')} variant="secondary" onPress={leaveEdit} />
          </>
        }
      >
        {data.status === 'active' ? <InlineAlert tone="info" message={t('manage.editActiveNote')} /> : null}
        <JobDetailsFields control={form.control} />
        {update.error ? <InlineAlert tone="danger" message={errorMessage(update.error)} /> : null}
      </Screen>
    );
  }

  const completeAnalysis = analysis.data?.status === 'complete' ? analysis.data : null;

  return (
    <Screen
      header={
        <Header
          title={t('manage.title')}
          right={
            EDITABLE.includes(data.status) ? (
              <IconButton icon={Pencil} onPress={() => setEditing(true)} accessibilityLabel={t('manage.edit')} />
            ) : null
          }
        />
      }
      footer={
        NEEDS_SETUP.includes(data.status) ? (
          <Button label={t('manage.continueSetup')} icon={CirclePlay} onPress={() => navigation.navigate('AddWork', { jobId })} />
        ) : CLOSABLE.includes(data.status) ? (
          <Button label={t('manage.close')} icon={XCircle} variant="secondary" onPress={confirmClose} loading={close.isPending} />
        ) : null
      }
    >
      <View style={styles.titleRow}>
        <Text variant="title" style={styles.flex} accessibilityRole="header">
          {data.title}
        </Text>
        <JobStatusBadge status={data.status} />
      </View>
      {data.status === 'pending_review' ? <InlineAlert tone="warning" message={t('manage.pendingNote')} /> : null}
      {data.status === 'taken_down' ? <InlineAlert tone="danger" message={t('manage.takenDownNote')} /> : null}

      <ListRow
        icon={UsersRound}
        title={t('manage.viewApplicants')}
        meta={t('myPosted.applicants', { count: data.applicantCount })}
        onPress={() => navigation.navigate('JobApplicants', { jobId, jobTitle: data.title })}
      />

      <PhotoCarousel photos={data.photos} />

      <Card>
        <Text variant="heading" color="primary" latin>
          {`${formatRupees(data.salary.amount)}${t(`enums.salaryPer.${data.salary.type}`)}`}
        </Text>
        <View style={styles.meta}>
          <Clock size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="body" color="textMuted">
            {data.timings ? `${t(`enums.shift.${data.shift}`)} · ${data.timings.start}–${data.timings.end}` : t(`enums.shift.${data.shift}`)}
          </Text>
        </View>
        <View style={styles.meta}>
          <MapPin size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="body" color="textMuted">
            {[data.location.area, data.location.city, data.location.state].filter(Boolean).join(', ')}
          </Text>
        </View>
        <Text variant="caption" color="textMuted">
          {data.sector ? sectorLabel(t, data.sector) : t('manage.proposedSector', { name: data.proposedSectorName ?? '' })}
        </Text>
      </Card>

      <Section title={t('job.about')}>
        <Text variant="body">{data.description}</Text>
      </Section>

      {completeAnalysis ? (
        <Section title={t('manage.analysis')}>
          <AnalysisResult analysis={completeAnalysis} />
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
