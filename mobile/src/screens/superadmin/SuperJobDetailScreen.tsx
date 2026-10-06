import { Ban, Check, Clock, MapPin, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { JobStatusBadge } from '../../Components/domain/JobStatusBadge';
import { ReasonSheet } from '../../Components/domain/ReasonSheet';
import { WorkplaceRatingBadge } from '../../Components/domain/WorkplaceRatingBadge';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { PhotoCarousel } from '../../Components/media/PhotoCarousel';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Text } from '../../Components/ui/Text';
import { useToast } from '../../context/ToastContext';
import { useJob } from '../../api/queries/jobs';
import { useActOnJob } from '../../api/queries/superadmin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { sectorLabel } from '../../lib/i18n/labels';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatRupees } from '../../utils/format';

type DestructiveAction = 'reject' | 'take_down';

/** Any job, as seen by the owner: approve a pending one, reject it, or take a live one down. */
export function SuperJobDetailScreen({ route }: RootScreenProps<'SuperJobDetail'>) {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const job = useJob(jobId);
  const act = useActOnJob(jobId);
  const [pending, setPending] = useState<DestructiveAction | null>(null);

  if (job.isPending || job.isError) {
    return (
      <Screen header={<Header title={t('superadmin.jobTitle')} />}>
        {job.isPending ? <ScreenSkeleton variant="detail" /> : <ErrorState error={job.error} onRetry={() => void job.refetch()} />}
      </Screen>
    );
  }

  const data = job.data;

  const approve = () =>
    Alert.alert(t('superadmin.approveJobTitle'), t('superadmin.approveJobBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('superadmin.approve'),
        onPress: () =>
          act.mutate(
            { action: 'approve' },
            {
              onSuccess: () => showToast(t('superadmin.approvedToast'), 'success'),
              onError: (error) => showToast(errorMessage(error), 'error'),
            },
          ),
      },
    ]);

  const confirm = (reason: string) => {
    if (!pending) return;
    act.mutate(
      { action: pending, reason },
      {
        onSuccess: () => {
          setPending(null);
          showToast(pending === 'reject' ? t('superadmin.rejectedToast') : t('superadmin.takenDownToast'), 'success');
        },
      },
    );
  };

  const footer =
    data.status === 'pending_review' ? (
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label={t('superadmin.reject')} icon={X} variant="secondary" onPress={() => setPending('reject')} />
        </View>
        <View style={styles.flex}>
          <Button label={t('superadmin.approve')} icon={Check} onPress={approve} loading={act.isPending && !pending} />
        </View>
      </View>
    ) : data.status === 'active' ? (
      <Button label={t('superadmin.takeDown')} icon={Ban} variant="danger" onPress={() => setPending('take_down')} />
    ) : null;

  return (
    <Screen header={<Header title={t('superadmin.jobTitle')} />} footer={footer}>
      <View style={styles.titleRow}>
        <Text variant="title" style={styles.flex}>
          {data.title}
        </Text>
        <JobStatusBadge status={data.status} />
      </View>
      <Text variant="body" color="textMuted">
        {`${data.hirer.displayName}${data.hirer.verified ? ` · ${t('common.verified')}` : ''}`}
      </Text>
      <PhotoCarousel photos={data.photos} />
      <Card>
        <Text variant="heading" color="primary" latin>
          {`${formatRupees(data.salary.amount)}${t(`enums.salaryPer.${data.salary.type}`)}`}
        </Text>
        <View style={styles.meta}>
          <Clock size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="body" color="textMuted">
            {t(`enums.shift.${data.shift}`)}
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
        {data.difficulty ? <WorkplaceRatingBadge difficulty={data.difficulty} /> : null}
      </Card>
      <Section title={t('job.about')}>
        <Text variant="body">{data.description}</Text>
      </Section>
      {data.requirements.length > 0 ? (
        <Section title={t('job.requirements')}>
          <Text variant="body">{data.requirements.join(' · ')}</Text>
        </Section>
      ) : null}

      <ReasonSheet
        visible={pending !== null}
        title={pending === 'take_down' ? t('superadmin.takeDownTitle') : t('superadmin.rejectJobTitle')}
        description={pending === 'take_down' ? t('superadmin.takeDownBody') : t('superadmin.rejectJobBody')}
        confirmLabel={pending === 'take_down' ? t('superadmin.takeDown') : t('superadmin.reject')}
        loading={act.isPending}
        error={act.error ? errorMessage(act.error) : null}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
