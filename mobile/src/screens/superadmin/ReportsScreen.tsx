import { Flag } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { PagedList } from '../../Components/layout/PagedList';
import { Screen } from '../../Components/layout/Screen';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { useReports } from '../../api/queries/superadmin';
import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { Report, ReportStatus } from '../../lib/types/superadmin';

export function ReportsScreen({ navigation }: RootScreenProps<'Reports'>) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const [status, setStatus] = useState<ReportStatus>('open');
  const reports = useReports({ status });

  const renderItem = useCallback(
    ({ item }: { item: Report }) => (
      <ListRow
        icon={Flag}
        title={item.targetLabel}
        subtitle={`${t(`enums.reportReason.${item.reason}`)} · ${t(`superadmin.targetType.${item.targetType}`)}`}
        meta={relativeTime(item.createdAt)}
        onPress={() => navigation.navigate('ReportDetail', { report: item })}
      />
    ),
    [navigation, relativeTime, t],
  );

  return (
    <Screen
      scroll={false}
      header={
        <View>
          <Header title={t('superadmin.reports')} />
          <View style={styles.segment}>
            <SegmentedControl
              segments={[
                { value: 'open', label: t('superadmin.reportStatus.open') },
                { value: 'resolved', label: t('superadmin.reportStatus.resolved') },
                { value: 'dismissed', label: t('superadmin.reportStatus.dismissed') },
              ]}
              value={status}
              onChange={setStatus}
              accessibilityLabel={t('superadmin.reports')}
            />
          </View>
        </View>
      }
    >
      <PagedList
        query={reports}
        renderItem={renderItem}
        keyExtractor={(report) => report.id}
        empty={{ icon: Flag, title: t('superadmin.noReportsTitle'), body: t('superadmin.noReportsBody') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
