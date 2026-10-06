import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useFlatPages } from '../../api/queries/jobs';
import { colors, spacing } from '../../lib/theme/tokens';
import type { Page } from '../../lib/types/common';
import type { JobSummary } from '../../lib/types/jobs';
import { EmptyState } from '../layout/EmptyState';
import { ErrorState } from '../layout/ErrorState';
import { Text } from '../ui/Text';
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';
import { JobStatusBadge } from './JobStatusBadge';

type PostedJobListProps = {
  query: UseInfiniteQueryResult<InfiniteData<Page<JobSummary>>>;
  onPressJob: (jobId: string) => void;
  empty: { icon: LucideIcon; title: string; body: string; action?: { label: string; onPress: () => void } };
};

const keyExtractor = (job: JobSummary) => job.id;

/** A hirer's (or the owner's) jobs with their lifecycle status and applicant count. */
export function PostedJobList({ query, onPressJob, empty }: PostedJobListProps) {
  const { t } = useTranslation();
  const jobs = useFlatPages(query.data);

  const renderItem = useCallback(
    ({ item }: { item: JobSummary }) => (
      <JobCard
        job={item}
        onPress={onPressJob}
        badge={<JobStatusBadge status={item.status} />}
        footer={
          <Text variant="caption" color="textSubtle">
            {t('myPosted.applicants', { count: item.applicantCount })}
          </Text>
        }
      />
    ),
    [onPressJob, t],
  );

  let placeholder: ReactElement | null = null;
  if (query.isPending) placeholder = <JobCardSkeleton count={3} />;
  else if (query.isError) placeholder = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  else if (jobs.length === 0) placeholder = <EmptyState {...empty} />;

  return (
    <FlatList
      data={placeholder ? [] : jobs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={placeholder}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
      removeClippedSubviews
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
