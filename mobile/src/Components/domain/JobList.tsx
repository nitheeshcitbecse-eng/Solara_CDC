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
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';

type JobListProps = {
  query: UseInfiniteQueryResult<InfiniteData<Page<JobSummary>>>;
  onPressJob: (jobId: string) => void;
  header?: ReactElement;
  empty: { icon: LucideIcon; title: string; body: string; action?: { label: string; onPress: () => void } };
};

const keyExtractor = (job: JobSummary) => job.id;

/**
 * Paginated job list with the standard states: skeleton → error (retry) → empty
 * → rows, plus pull-to-refresh and "load more" when the end is reached.
 */
export function JobList({ query, onPressJob, header, empty }: JobListProps) {
  const { t } = useTranslation();
  const jobs = useFlatPages(query.data);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const renderItem = useCallback(({ item }: { item: JobSummary }) => <JobCard job={item} onPress={onPressJob} />, [onPressJob]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  let placeholder: ReactElement | null = null;
  if (query.isPending) placeholder = <JobCardSkeleton count={4} />;
  else if (query.isError) placeholder = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  else if (jobs.length === 0) placeholder = <EmptyState {...empty} />;

  return (
    <FlatList
      data={placeholder ? [] : jobs}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={placeholder}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loadMore')} />
          </View>
        ) : null
      }
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      removeClippedSubviews
      initialNumToRender={6}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !isFetchingNextPage}
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
