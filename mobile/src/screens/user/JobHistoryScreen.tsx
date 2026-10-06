import { History } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { EngagementList } from '../../Components/domain/EngagementList';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { useEngagements } from '../../api/queries/jobs';
import type { Engagement } from '../../lib/types/jobs';
import type { RootScreenProps } from '../../lib/types/navigation';

export function JobHistoryScreen({ navigation }: RootScreenProps<'JobHistory'>) {
  const { t } = useTranslation();
  const past = useEngagements('past');
  const open = useCallback(
    (engagement: Engagement) => navigation.navigate('ApplicationDetails', { applicationId: engagement.applicationId }),
    [navigation],
  );

  return (
    <Screen scroll={false} header={<Header title={t('menu.jobHistory')} />}>
      <EngagementList query={past} onPress={open} empty={{ icon: History, title: t('myJobs.emptyHistoryTitle'), body: t('myJobs.emptyHistoryBody') }} />
    </Screen>
  );
}
