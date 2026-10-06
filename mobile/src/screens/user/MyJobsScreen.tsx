import { Bookmark, BriefcaseBusiness } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EngagementList } from '../../Components/domain/EngagementList';
import { JobList } from '../../Components/domain/JobList';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { useEngagements, useSavedJobs } from '../../api/queries/jobs';
import { spacing } from '../../lib/theme/tokens';
import type { Engagement } from '../../lib/types/jobs';
import type { RootScreenProps } from '../../lib/types/navigation';

type Tab = 'current' | 'saved';

export function MyJobsScreen({ navigation }: RootScreenProps<'MyJobs'>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('current');
  const current = useEngagements('current');
  const saved = useSavedJobs();

  const openEngagement = useCallback(
    (engagement: Engagement) => navigation.navigate('ApplicationDetails', { applicationId: engagement.applicationId }),
    [navigation],
  );
  const openJob = useCallback((jobId: string) => navigation.navigate('JobDetails', { jobId }), [navigation]);

  return (
    <Screen
      scroll={false}
      header={
        <View>
          <Header title={t('menu.myJobs')} />
          <View style={styles.segment}>
            <SegmentedControl
              segments={[
                { value: 'current', label: t('myJobs.current') },
                { value: 'saved', label: t('myJobs.saved') },
              ]}
              value={tab}
              onChange={setTab}
              accessibilityLabel={t('menu.myJobs')}
            />
          </View>
        </View>
      }
    >
      {tab === 'current' ? (
        <EngagementList
          query={current}
          onPress={openEngagement}
          empty={{ icon: BriefcaseBusiness, title: t('myJobs.emptyCurrentTitle'), body: t('myJobs.emptyCurrentBody') }}
        />
      ) : (
        <JobList
          query={saved}
          onPressJob={openJob}
          empty={{ icon: Bookmark, title: t('myJobs.emptySavedTitle'), body: t('myJobs.emptySavedBody') }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
