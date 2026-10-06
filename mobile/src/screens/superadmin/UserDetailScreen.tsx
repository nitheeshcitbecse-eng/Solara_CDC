import { Ban, BadgeCheck, BriefcaseBusiness, ClipboardList, FileText, RotateCcw, ShieldX, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { JobStatusBadge } from '../../Components/domain/JobStatusBadge';
import { ReasonSheet } from '../../Components/domain/ReasonSheet';
import { StatusPill } from '../../Components/domain/StatusPill';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { Avatar } from '../../Components/ui/Avatar';
import { Badge } from '../../Components/ui/Badge';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Text } from '../../Components/ui/Text';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAdminUser, useDecideVerification, useSetUserStatus } from '../../api/queries/superadmin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { getLanguage } from '../../lib/i18n/languages';
import { spacing } from '../../lib/theme/tokens';
import type { AccountStatus } from '../../lib/types/auth';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatDate, formatPhone, maskAadhaar } from '../../utils/format';

type PendingAction = { kind: 'status'; status: AccountStatus } | { kind: 'rejectVerification' } | null;

export function UserDetailScreen({ navigation, route }: RootScreenProps<'UserDetail'>) {
  const { userId } = route.params;
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const user = useAdminUser(userId);
  const setStatus = useSetUserStatus(userId);
  const verification = useDecideVerification(userId);
  const [pending, setPending] = useState<PendingAction>(null);

  if (user.isPending || user.isError) {
    return (
      <Screen header={<Header title={t('superadmin.userTitle')} />}>
        {user.isPending ? <ScreenSkeleton variant="detail" /> : <ErrorState error={user.error} onRetry={() => void user.refetch()} />}
      </Screen>
    );
  }

  const data = user.data;
  const aadhaar = data.seeker?.aadhaar ?? data.hirer?.aadhaar;

  const approveVerification = () =>
    verification.mutate(
      { decision: 'verified' },
      {
        onSuccess: () => showToast(t('superadmin.verified'), 'success'),
        onError: (error) => showToast(errorMessage(error), 'error'),
      },
    );

  const confirmPending = (reason: string) => {
    if (!pending) return;
    if (pending.kind === 'status') {
      setStatus.mutate(
        { status: pending.status, reason },
        {
          onSuccess: () => {
            setPending(null);
            showToast(t(`superadmin.statusChanged.${pending.status}`), 'success');
          },
        },
      );
    } else {
      verification.mutate(
        { decision: 'rejected', reason },
        {
          onSuccess: () => {
            setPending(null);
            showToast(t('superadmin.rejectedVerification'), 'success');
          },
        },
      );
    }
  };

  const sheetCopy =
    pending?.kind === 'status'
      ? {
          title: t(`superadmin.statusSheet.${pending.status}.title`),
          description: t(`superadmin.statusSheet.${pending.status}.body`, { name: data.name ?? '' }),
          confirm: t(`superadmin.statusSheet.${pending.status}.action`),
          tone: pending.status === 'active' ? ('primary' as const) : ('danger' as const),
        }
      : {
          title: t('superadmin.rejectVerificationTitle'),
          description: t('superadmin.rejectVerificationBody'),
          confirm: t('superadmin.reject'),
          tone: 'danger' as const,
        };

  return (
    <Screen header={<Header title={t('superadmin.userTitle')} />}>
      <View style={styles.identity}>
        <Avatar name={data.name} size="lg" />
        <View style={styles.flex}>
          <Text variant="title">{data.name ?? t('profile.notSet')}</Text>
          <Text variant="body" color="textMuted" latin>
            {formatPhone(data.phone)}
          </Text>
          <View style={styles.badges}>
            <Badge label={t(`enums.role.${data.role}`)} tone="neutral" />
            <Badge label={t(`enums.accountStatus.${data.status}`)} tone={data.status === 'active' ? 'success' : 'danger'} />
            <Badge
              label={t(`enums.verification.${data.verificationStatus}`)}
              tone={data.verificationStatus === 'verified' ? 'success' : data.verificationStatus === 'pending' ? 'warning' : data.verificationStatus === 'rejected' ? 'danger' : 'neutral'}
            />
          </View>
        </View>
      </View>
      <Text variant="caption" color="textMuted">
        {t('superadmin.joined', { date: formatDate(data.createdAt, activeLanguage) })}
      </Text>
      {data.statusReason ? <InlineAlert tone="danger" title={t('superadmin.statusReason')} message={data.statusReason} /> : null}

      <Section title={t('superadmin.accountActions')}>
        {data.status === 'active' ? (
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label={t('superadmin.suspend')} icon={UserX} variant="secondary" onPress={() => setPending({ kind: 'status', status: 'suspended' })} />
            </View>
            <View style={styles.flex}>
              <Button label={t('superadmin.ban')} icon={Ban} variant="danger" onPress={() => setPending({ kind: 'status', status: 'banned' })} />
            </View>
          </View>
        ) : (
          <Button label={t('superadmin.reactivate')} icon={RotateCcw} variant="secondary" onPress={() => setPending({ kind: 'status', status: 'active' })} />
        )}
      </Section>

      {aadhaar && aadhaar.status !== 'none' ? (
        <Section title={t('superadmin.verification')}>
          <Card>
            <Text variant="bodyStrong" latin>
              {maskAadhaar(aadhaar.last4)}
            </Text>
            {aadhaar.uploadedAt ? (
              <Text variant="caption" color="textMuted">
                {t('superadmin.uploaded', { date: formatDate(aadhaar.uploadedAt, activeLanguage) })}
              </Text>
            ) : null}
            {aadhaar.rejectionReason ? (
              <Text variant="caption" color="danger">
                {aadhaar.rejectionReason}
              </Text>
            ) : null}
          </Card>
          {data.documents.map((document) => (
            <ListRow
              key={document.id}
              icon={FileText}
              title={t(`superadmin.document.${document.kind}`)}
              subtitle={formatDate(document.uploadedAt, activeLanguage)}
              onPress={() => navigation.navigate('DocumentViewer', { documentId: document.id, title: t(`superadmin.document.${document.kind}`) })}
            />
          ))}
          {aadhaar.status !== 'verified' ? (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button label={t('superadmin.approve')} icon={BadgeCheck} onPress={approveVerification} loading={verification.isPending && !pending} />
              </View>
              {aadhaar.status !== 'rejected' ? (
                <View style={styles.flex}>
                  <Button label={t('superadmin.reject')} icon={ShieldX} variant="secondary" onPress={() => setPending({ kind: 'rejectVerification' })} />
                </View>
              ) : null}
            </View>
          ) : null}
        </Section>
      ) : null}

      {data.seeker ? (
        <Section title={t('superadmin.profileDetails')}>
          <Text variant="body">{[data.seeker.city, data.seeker.district, data.seeker.state].filter(Boolean).join(', ') || t('profile.notSet')}</Text>
          <Text variant="body">
            {data.seeker.qualification ? t(`enums.qualification.${data.seeker.qualification}`) : t('profile.notSet')}
          </Text>
          <Text variant="body">{data.seeker.languagesKnown.map((code) => getLanguage(code).nativeName).join(' · ')}</Text>
          <Text variant="body" color="textMuted">
            {data.seeker.skills.join(' · ')}
          </Text>
        </Section>
      ) : null}
      {data.hirer ? (
        <Section title={t('superadmin.profileDetails')}>
          <Text variant="body">{data.hirer.hirerType ? t(`enums.hirerType.${data.hirer.hirerType}`) : t('profile.notSet')}</Text>
          {data.hirer.businessName ? <Text variant="bodyStrong">{data.hirer.businessName}</Text> : null}
          {data.hirer.address ? (
            <Text variant="body" color="textMuted">
              {`${data.hirer.address.line1}, ${data.hirer.address.city}, ${data.hirer.address.state} ${data.hirer.address.pincode}`}
            </Text>
          ) : null}
          {data.hirer.gstin ? (
            <Text variant="caption" color="textMuted" latin>
              {t('hirer.gstinValue', { gstin: data.hirer.gstin })}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {data.applications.length > 0 ? (
        <Section title={t('superadmin.applications', { count: data.applications.length })}>
          {data.applications.map((application) => (
            <ListRow
              key={application.id}
              icon={ClipboardList}
              title={application.job.title}
              subtitle={formatDate(application.createdAt, activeLanguage)}
              right={<StatusPill status={application.status} />}
              onPress={() => navigation.navigate('SuperJobDetail', { jobId: application.job.id })}
            />
          ))}
        </Section>
      ) : null}
      {data.jobs.length > 0 ? (
        <Section title={t('superadmin.jobs', { count: data.jobs.length })}>
          {data.jobs.map((job) => (
            <ListRow
              key={job.id}
              icon={BriefcaseBusiness}
              title={job.title}
              subtitle={job.location.city}
              right={<JobStatusBadge status={job.status} />}
              onPress={() => navigation.navigate('SuperJobDetail', { jobId: job.id })}
            />
          ))}
        </Section>
      ) : null}

      <ReasonSheet
        visible={pending !== null}
        title={sheetCopy.title}
        description={sheetCopy.description}
        confirmLabel={sheetCopy.confirm}
        tone={sheetCopy.tone}
        loading={setStatus.isPending || verification.isPending}
        error={setStatus.error ? errorMessage(setStatus.error) : verification.error ? errorMessage(verification.error) : null}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, marginTop: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
