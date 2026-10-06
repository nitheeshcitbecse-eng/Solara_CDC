import { BriefcaseBusiness, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { JobStatusBadge } from '../../Components/domain/JobStatusBadge';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { PagedList } from '../../Components/layout/PagedList';
import { Screen } from '../../Components/layout/Screen';
import { Chip } from '../../Components/ui/Chip';
import { TextField } from '../../Components/ui/TextField';
import { useAllJobs } from '../../api/queries/superadmin';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { JobStatus, JobSummary } from '../../lib/types/jobs';
import type { RootScreenProps } from '../../lib/types/navigation';
import { normalizeText } from '../../utils/format';
import { LIMITS } from '../../utils/validation';

const FILTERS: readonly JobStatus[] = ['pending_review', 'active', 'closed', 'rejected', 'taken_down', 'draft'];

export function SuperJobsScreen({ navigation }: RootScreenProps<'SuperJobs'>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<JobStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const q = useDebounce(normalizeText(search), 350);
  const jobs = useAllJobs({ status, q: q || undefined });

  const renderItem = useCallback(
    ({ item }: { item: JobSummary }) => (
      <ListRow
        icon={BriefcaseBusiness}
        title={item.title}
        subtitle={`${item.hirer.displayName} · ${item.location.city}`}
        right={<JobStatusBadge status={item.status} />}
        onPress={() => navigation.navigate('SuperJobDetail', { jobId: item.id })}
      />
    ),
    [navigation],
  );

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.header}>
          <Header title={t('superadmin.allJobs')} />
          <View style={styles.search}>
            <TextField
              label={t('common.search')}
              value={search}
              onChangeText={setSearch}
              maxLength={LIMITS.search}
              right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label={t('applied.all')} selected={status === undefined} role="radio" onPress={() => setStatus(undefined)} />
            {FILTERS.map((value) => (
              <Chip key={value} label={t(`enums.jobStatus.${value}`)} selected={status === value} role="radio" onPress={() => setStatus(value)} />
            ))}
          </ScrollView>
        </View>
      }
    >
      <PagedList
        query={jobs}
        renderItem={renderItem}
        keyExtractor={(job) => job.id}
        empty={{ icon: BriefcaseBusiness, title: t('superadmin.noJobsTitle'), body: t('superadmin.noJobsBody') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  search: { paddingHorizontal: spacing.lg },
  filters: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
