import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Flag,
  Handshake,
  ShieldAlert,
  UsersRound,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { StatTile } from '../../Components/domain/StatTile';
import { TrendBars } from '../../Components/domain/TrendBars';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { Skeleton } from '../../Components/ui/Skeleton';
import { useOverview } from '../../api/queries/superadmin';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { SuperAdminTabScreenProps } from '../../lib/types/navigation';

export function OverviewScreen({ navigation }: SuperAdminTabScreenProps<'Overview'>) {
  const { t } = useTranslation();
  const overview = useOverview();
  const kpis = overview.data?.kpis;

  return (
    <Screen
      edges={['top']}
      header={<Header back={false} title={t('superadmin.overviewTitle')} subtitle={t('superadmin.overviewSubtitle')} />}
      refreshControl={
        <RefreshControl refreshing={overview.isRefetching} onRefresh={() => void overview.refetch()} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      {overview.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: 4 }, (_, row) => (
            <View key={row} style={styles.row}>
              <View style={styles.flex}>
                <Skeleton height={sizes.chartHeight - spacing.md} radius={radius.lg} />
              </View>
              <View style={styles.flex}>
                <Skeleton height={sizes.chartHeight - spacing.md} radius={radius.lg} />
              </View>
            </View>
          ))}
        </View>
      ) : overview.isError || !kpis ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      ) : (
        <>
          <View style={styles.grid}>
            <View style={styles.row}>
              <StatTile icon={UsersRound} label={t('superadmin.kpi.jobSeekers')} value={kpis.jobSeekers} onPress={() => navigation.navigate('Users')} />
              <StatTile icon={Building2} label={t('superadmin.kpi.hirers')} value={kpis.hirers} onPress={() => navigation.navigate('Users')} />
            </View>
            <View style={styles.row}>
              <StatTile icon={BriefcaseBusiness} label={t('superadmin.kpi.activeJobs')} value={kpis.activeJobs} onPress={() => navigation.navigate('SuperJobs')} />
              <StatTile icon={ClipboardList} label={t('superadmin.kpi.applicationsToday')} value={kpis.applicationsToday} />
            </View>
            <View style={styles.row}>
              <StatTile
                icon={BadgeCheck}
                label={t('superadmin.kpi.pendingVerifications')}
                value={kpis.pendingVerifications}
                tone={kpis.pendingVerifications > 0 ? 'highlight' : 'default'}
                onPress={() => navigation.navigate('Users')}
              />
              <StatTile
                icon={ShieldAlert}
                label={t('superadmin.kpi.moderationQueue')}
                value={kpis.moderationQueue}
                tone={kpis.moderationQueue > 0 ? 'highlight' : 'default'}
                onPress={() => navigation.navigate('Moderation')}
              />
            </View>
            <View style={styles.row}>
              <StatTile
                icon={Flag}
                label={t('superadmin.kpi.openReports')}
                value={kpis.openReports}
                tone={kpis.openReports > 0 ? 'highlight' : 'default'}
                onPress={() => navigation.navigate('Reports')}
              />
              <StatTile icon={Handshake} label={t('superadmin.kpi.hiresThisMonth')} value={kpis.hiresThisMonth} />
            </View>
          </View>
          {overview.data ? (
            <Section title={t('superadmin.trends')}>
              <TrendBars title={t('superadmin.trendApplications')} points={overview.data.trends.applications} />
              <TrendBars title={t('superadmin.trendSignups')} points={overview.data.trends.signups} color={colors.plum} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
