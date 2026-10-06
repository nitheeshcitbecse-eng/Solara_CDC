import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Building2,
  Check,
  Clock,
  Flag,
  Languages,
  LayoutGrid,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ReportSheet } from '../../Components/domain/ReportSheet';
import { WorkplaceRatingBadge } from '../../Components/domain/WorkplaceRatingBadge';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { PhotoCarousel } from '../../Components/media/PhotoCarousel';
import { Badge } from '../../Components/ui/Badge';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { useSessionUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useJob, useToggleSaveJob } from '../../api/queries/jobs';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { sectorLabel } from '../../lib/i18n/labels';
import { getLanguage } from '../../lib/i18n/languages';
import { colors, MIN_TOUCH, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatRupees } from '../../utils/format';

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Icon size={sizes.icon} color={colors.primary} strokeWidth={2} />
      <View style={styles.factText}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

export function JobDetailsScreen({ navigation, route }: RootScreenProps<'JobDetails'>) {
  const { jobId } = route.params;
  const { t } = useTranslation();
  const user = useSessionUser();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const relativeTime = useRelativeTime();
  const job = useJob(jobId);
  const toggleSave = useToggleSaveJob();
  const [reportOpen, setReportOpen] = useState(false);
  const isSeeker = user.role === 'user';

  const onToggleSave = () => {
    if (!job.data) return;
    const save = !job.data.saved;
    toggleSave.mutate(
      { jobId, save },
      {
        onSuccess: () => showToast(save ? t('job.saved') : t('job.unsaved'), 'success'),
        onError: (error) => showToast(errorMessage(error), 'error'),
      },
    );
  };

  const headerRight =
    job.data && isSeeker ? (
      <>
        <IconButton
          icon={job.data.saved ? BookmarkCheck : Bookmark}
          color={job.data.saved ? colors.primary : undefined}
          onPress={onToggleSave}
          accessibilityLabel={job.data.saved ? t('job.unsave') : t('job.save')}
        />
        <IconButton icon={Flag} onPress={() => setReportOpen(true)} accessibilityLabel={t('job.report')} />
      </>
    ) : null;

  if (job.isPending || job.isError) {
    return (
      <Screen header={<Header />}>
        {job.isPending ? <ScreenSkeleton variant="detail" /> : <ErrorState error={job.error} onRetry={() => void job.refetch()} />}
      </Screen>
    );
  }

  const data = job.data;
  const salary = `${formatRupees(data.salary.amount)}${t(`enums.salaryPer.${data.salary.type}`)}`;
  const shift = data.timings
    ? `${t(`enums.shift.${data.shift}`)} · ${data.timings.start}–${data.timings.end}`
    : t(`enums.shift.${data.shift}`);
  const place = [data.location.area, data.location.city, data.location.state].filter(Boolean).join(', ');
  const canApply = isSeeker && data.status === 'active' && !data.myApplicationId;

  const footer = isSeeker ? (
    data.myApplicationId ? (
      <Button
        label={t('job.viewApplication')}
        variant="secondary"
        onPress={() => data.myApplicationId && navigation.navigate('ApplicationDetails', { applicationId: data.myApplicationId })}
      />
    ) : canApply ? (
      <Button label={t('job.apply')} onPress={() => navigation.navigate('Apply', { jobId })} />
    ) : null
  ) : null;

  return (
    <Screen header={<Header right={headerRight} />} footer={footer}>
      <PhotoCarousel photos={data.photos} />

      <View style={styles.titleBlock}>
        <Text variant="title" accessibilityRole="header">
          {data.title}
        </Text>
        <View style={styles.hirerRow}>
          <Building2 size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="body" color="textMuted" style={styles.flex}>
            {data.hirer.displayName}
          </Text>
          {data.hirer.verified ? <Badge label={t('job.verifiedHirer')} tone="success" icon={BadgeCheck} /> : null}
        </View>
        <Text variant="caption" color="textSubtle">
          {t('job.posted', { time: relativeTime(data.createdAt) })}
        </Text>
      </View>

      <Card tone="selected">
        <Text variant="caption" color="textMuted">
          {t(`enums.salaryType.${data.salary.type}`)}
        </Text>
        <Text variant="title" color="primary" latin>
          {salary}
        </Text>
      </Card>

      <View style={styles.facts}>
        <Fact icon={Clock} label={t('job.shift')} value={shift} />
        <Fact icon={Users} label={t('job.openings')} value={t('job.openingsCount', { count: data.openings })} />
        <Fact icon={MapPin} label={t('job.location')} value={place} />
        {data.sector ? <Fact icon={LayoutGrid} label={t('job.sector')} value={sectorLabel(t, data.sector)} /> : null}
      </View>

      {data.difficulty ? (
        <Section title={t('job.workplaceRating')}>
          <View style={styles.ratingRow}>
            <WorkplaceRatingBadge difficulty={data.difficulty} size="lg" />
            {data.safety ? (
              <View style={styles.safety}>
                {data.safety === 'safe' ? (
                  <ShieldCheck size={sizes.icon} color={colors.success} strokeWidth={2} />
                ) : (
                  <ShieldAlert size={sizes.icon} color={colors.warning} strokeWidth={2} />
                )}
                <Text variant="bodyStrong" color={data.safety === 'safe' ? 'success' : 'warning'}>
                  {t(`enums.safety.${data.safety}`)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption" color="textMuted">
            {t('job.ratingExplainer')}
          </Text>
        </Section>
      ) : null}

      <Section title={t('job.about')}>
        <Text variant="body">{data.description}</Text>
      </Section>

      {data.requirements.length > 0 ? (
        <Section title={t('job.requirements')}>
          {data.requirements.map((item) => (
            <View key={item} style={styles.bullet}>
              <Check size={sizes.iconSm} color={colors.success} strokeWidth={2} />
              <Text variant="body" style={styles.flex}>
                {item}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      <Section title={t('job.languages')}>
        <View style={styles.bullet}>
          <Languages size={sizes.iconSm} color={colors.primary} strokeWidth={2} />
          <Text variant="body" style={styles.flex}>
            {data.languages.map((code) => getLanguage(code).nativeName).join(' · ')}
          </Text>
        </View>
      </Section>

      {data.benefits.length > 0 ? (
        <Section title={t('job.benefits')}>
          {data.benefits.map((item) => (
            <View key={item} style={styles.bullet}>
              <Check size={sizes.iconSm} color={colors.primary} strokeWidth={2} />
              <Text variant="body" style={styles.flex}>
                {item}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {isSeeker && data.status !== 'active' && !data.myApplicationId ? (
        <Text variant="body" color="textMuted" align="center">
          {t('job.notAccepting')}
        </Text>
      ) : null}

      {isSeeker ? (
        <Pressable onPress={() => setReportOpen(true)} accessibilityRole="button" style={styles.reportLink}>
          <Flag size={sizes.iconSm} color={colors.danger} strokeWidth={2} />
          <Text variant="label" color="danger">
            {t('job.reportLink')}
          </Text>
        </Pressable>
      ) : null}

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} targetType="job" targetId={jobId} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleBlock: { gap: spacing.xs },
  hirerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  facts: { gap: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  factText: { flex: 1, gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  safety: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center', minHeight: MIN_TOUCH },
});
