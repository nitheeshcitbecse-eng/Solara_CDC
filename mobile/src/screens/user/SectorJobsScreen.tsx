import { BriefcaseBusiness } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { JobList } from '../../Components/domain/JobList';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { useJobSearch } from '../../api/queries/jobs';
import { sectorLabel } from '../../lib/i18n/labels';
import type { RootScreenProps } from '../../lib/types/navigation';

export function SectorJobsScreen({ navigation, route }: RootScreenProps<'SectorJobs'>) {
  const { sectorId, sectorName, sectorSlug } = route.params;
  const { t } = useTranslation();
  const jobs = useJobSearch({ sectorId });
  const openJob = useCallback((jobId: string) => navigation.navigate('JobDetails', { jobId }), [navigation]);

  return (
    <Screen scroll={false} header={<Header title={sectorLabel(t, { slug: sectorSlug, name: sectorName })} />}>
      <JobList
        query={jobs}
        onPressJob={openJob}
        empty={{
          icon: BriefcaseBusiness,
          title: t('explore.noJobsTitle'),
          body: t('explore.noJobsBody'),
          action: { label: t('home.exploreAll'), onPress: () => navigation.goBack() },
        }}
      />
    </Screen>
  );
}
