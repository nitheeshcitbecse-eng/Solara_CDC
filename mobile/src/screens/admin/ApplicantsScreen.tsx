import { UsersRound } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { PostedJobList } from '../../Components/domain/PostedJobList';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Text } from '../../Components/ui/Text';
import { useMyPostedJobs } from '../../api/queries/admin';
import { useFlatPages } from '../../api/queries/jobs';
import { spacing } from '../../lib/theme/tokens';
import type { AdminTabScreenProps } from '../../lib/types/navigation';

/** Pick a live job to see who applied to it. */
export function ApplicantsScreen({ navigation }: AdminTabScreenProps<'Applicants'>) {
  const { t } = useTranslation();
  const jobs = useMyPostedJobs('active');
  const list = useFlatPages(jobs.data);

  const open = useCallback(
    (jobId: string) => {
      const job = list.find((candidate) => candidate.id === jobId);
      navigation.navigate('JobApplicants', { jobId, jobTitle: job?.title ?? '' });
    },
    [navigation, list],
  );

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <>
          <Header back={false} title={t('tabs.applicants')} />
          <Text variant="body" color="textMuted" style={styles.subtitle}>
            {t('applicants.subtitle')}
          </Text>
        </>
      }
    >
      <PostedJobList
        query={jobs}
        onPressJob={open}
        empty={{
          icon: UsersRound,
          title: t('applicants.noJobsTitle'),
          body: t('applicants.noJobsBody'),
          action: { label: t('dashboard.addWork'), onPress: () => navigation.navigate('AddWork') },
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { paddingHorizontal: spacing.lg },
});
