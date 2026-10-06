import { BriefcaseBusiness, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PostedJobList } from '../../Components/domain/PostedJobList';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { IconButton } from '../../Components/ui/IconButton';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { useMyPostedJobs } from '../../api/queries/admin';
import { spacing } from '../../lib/theme/tokens';
import type { AdminJobState } from '../../lib/types/jobs';
import type { AdminTabScreenProps } from '../../lib/types/navigation';

export function AdminJobsScreen({ navigation }: AdminTabScreenProps<'AdminJobs'>) {
  const { t } = useTranslation();
  const [state, setState] = useState<AdminJobState>('active');
  const jobs = useMyPostedJobs(state);

  const open = useCallback((jobId: string) => navigation.navigate('JobManage', { jobId }), [navigation]);

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <View>
          <Header
            back={false}
            title={t('tabs.myJobs')}
            right={<IconButton icon={Plus} onPress={() => navigation.navigate('AddWork')} accessibilityLabel={t('dashboard.addWork')} />}
          />
          <View style={styles.segment}>
            <SegmentedControl
              segments={[
                { value: 'active', label: t('myPosted.active') },
                { value: 'pending', label: t('myPosted.pending') },
                { value: 'closed', label: t('myPosted.closed') },
              ]}
              value={state}
              onChange={setState}
              accessibilityLabel={t('tabs.myJobs')}
            />
          </View>
        </View>
      }
    >
      <PostedJobList
        query={jobs}
        onPressJob={open}
        empty={{
          icon: BriefcaseBusiness,
          title: t(`myPosted.empty.${state}`),
          body: t('myPosted.emptyBody'),
          action: { label: t('dashboard.addWork'), onPress: () => navigation.navigate('AddWork') },
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
