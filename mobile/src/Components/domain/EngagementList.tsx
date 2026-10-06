import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useFlatPages } from '../../api/queries/jobs';
import { colors, spacing } from '../../lib/theme/tokens';
import type { Page } from '../../lib/types/common';
import type { Engagement } from '../../lib/types/jobs';
import { EmptyState } from '../layout/EmptyState';
import { ErrorState } from '../layout/ErrorState';
import { EngagementCard } from './EngagementCard';
import { JobCardSkeleton } from './JobCardSkeleton';

type EngagementListProps = {
  query: UseInfiniteQueryResult<InfiniteData<Page<Engagement>>>;
  onPress: (engagement: Engagement) => void;
  empty: { icon: LucideIcon; title: string; body: string };
};

const keyExtractor = (engagement: Engagement) => engagement.id;

export function EngagementList({ query, onPress, empty }: EngagementListProps) {
  const engagements = useFlatPages(query.data);
  const renderItem = useCallback(({ item }: { item: Engagement }) => <EngagementCard engagement={item} onPress={onPress} />, [onPress]);

  let placeholder: ReactElement | null = null;
  if (query.isPending) placeholder = <JobCardSkeleton count={3} />;
  else if (query.isError) placeholder = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  else if (engagements.length === 0) placeholder = <EmptyState {...empty} />;

  return (
    <FlatList
      data={placeholder ? [] : engagements}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={placeholder}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
