import { Bell, BriefcaseBusiness, Clock, Handshake, Languages, MessageSquare, Plus, UserPlus, UsersRound } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { ApplicantCard } from '../../Components/domain/ApplicantCard';
import { StatTile } from '../../Components/domain/StatTile';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { Button } from '../../Components/ui/Button';
import { IconButton } from '../../Components/ui/IconButton';
import { Logo } from '../../Components/ui/Logo';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { useSessionUser } from '../../context/AuthContext';
import { useAdminDashboard } from '../../api/queries/admin';
import { useUnreadNotificationCount } from '../../api/queries/notifications';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { AdminTabScreenProps } from '../../lib/types/navigation';

export function DashboardScreen({ navigation }: AdminTabScreenProps<'Dashboard'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const dashboard = useAdminDashboard();
  const unread = useUnreadNotificationCount();
  const openApplicant = useCallback(
    (applicationId: string) => navigation.navigate('ApplicantDetail', { applicationId }),
    [navigation],
  );

  const data = dashboard.data;
  const verified = (data?.verificationStatus ?? user.verificationStatus) === 'verified';

  return (
    <Screen
      edges={['top']}
      refreshControl={
        <RefreshControl
          refreshing={dashboard.isRefetching}
          onRefresh={() => void dashboard.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.topBar}>
        <Logo />
        <View style={styles.actions}>
          <IconButton icon={MessageSquare} onPress={() => navigation.navigate('Messages')} accessibilityLabel={t('home.messages')} />
          <IconButton icon={Languages} onPress={() => navigation.navigate('Language', { mode: 'change' })} accessibilityLabel={t('welcome.language')} />
          <IconButton
            icon={Bell}
            badge={unread}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel={unread > 0 ? `${t('home.notifications')}, ${t('a11y.unreadCount', { count: unread })}` : t('home.notifications')}
          />
        </View>
      </View>

      <Text variant="title" accessibilityRole="header">
        {t('home.greeting', { name: user.firstName ?? '' })}
      </Text>

      {data && data.verificationStatus === 'pending' ? (
        <InlineAlert tone="warning" title={t('dashboard.pendingTitle')} message={t('dashboard.pendingBody')}>
          <Button label={t('dashboard.viewStatus')} variant="secondary" onPress={() => navigation.navigate('VerificationStatus')} />
        </InlineAlert>
      ) : null}
      {data && (data.verificationStatus === 'rejected' || data.verificationStatus === 'none') ? (
        <InlineAlert tone="danger" title={t('dashboard.rejectedTitle')} message={data.rejectionReason ?? t('dashboard.rejectedBody')}>
          <Button label={t('profile.reupload')} variant="secondary" onPress={() => navigation.navigate('AadhaarUpload')} />
        </InlineAlert>
      ) : null}

      <Button
        label={t('dashboard.addWork')}
        icon={Plus}
        onPress={() => (verified ? navigation.navigate('AddWork') : navigation.navigate('VerificationStatus'))}
        accessibilityHint={verified ? undefined : t('dashboard.verifyFirst')}
      />

      {dashboard.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: 2 }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              <View style={styles.flex}>
                <Skeleton height={sizes.chartHeight - spacing.md} radius={radius.lg} />
              </View>
              <View style={styles.flex}>
                <Skeleton height={sizes.chartHeight - spacing.md} radius={radius.lg} />
              </View>
            </View>
          ))}
        </View>
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : data ? (
        <>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <StatTile
                icon={BriefcaseBusiness}
                label={t('dashboard.activeJobs')}
                value={data.stats.activeJobs}
                onPress={() => navigation.navigate('AdminJobs')}
              />
              <StatTile
                icon={UserPlus}
                label={t('dashboard.newApplicants')}
                value={data.stats.newApplicants}
                tone={data.stats.newApplicants > 0 ? 'highlight' : 'default'}
                onPress={() => navigation.navigate('Applicants')}
              />
            </View>
            <View style={styles.gridRow}>
              <StatTile icon={Handshake} label={t('dashboard.hires')} value={data.stats.hires} />
              <StatTile
                icon={Clock}
                label={t('dashboard.pendingReview')}
                value={data.stats.pendingReview}
                onPress={() => navigation.navigate('AdminJobs')}
              />
            </View>
          </View>

          <Section title={t('dashboard.recentApplicants')}>
            {data.recentApplicants.length === 0 ? (
              <EmptyState icon={UsersRound} title={t('dashboard.noApplicantsTitle')} body={t('dashboard.noApplicantsBody')} />
            ) : (
              // At most five rows, sent by the server — not a paginated list.
              data.recentApplicants.map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} onPress={openApplicant} showJob />
              ))
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  grid: { gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
});
