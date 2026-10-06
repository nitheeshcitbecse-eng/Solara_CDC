import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';

import { useFlatPages } from '../../api/queries/jobs';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Divider } from '../ui/Divider';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

type PagedListProps<T> = {
  query: UseInfiniteQueryResult<InfiniteData<{ items: T[] }>>;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  empty: { icon: LucideIcon; title: string; body: string };
};

/**
 * Generic paginated list (dense rows separated by dividers) with skeleton, error,
 * empty, pull-to-refresh and load-more handling. Used by the superadmin screens.
 */
export function PagedList<T>({ query, renderItem, keyExtractor, empty }: PagedListProps<T>) {
  const { t } = useTranslation();
  const items = useFlatPages(query.data);

  const placeholder = query.isPending ? (
    <View style={styles.skeletons} accessibilityLabel={t('a11y.loading')}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} height={sizes.listRow} radius={radius.md} />
      ))}
    </View>
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState {...empty} />
  );

  return (
    <FlatList
      data={query.isPending || query.isError ? [] : items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={Divider}
      ListEmptyComponent={placeholder}
      contentContainerStyle={styles.content}
      removeClippedSubviews
      initialNumToRender={12}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
  skeletons: { padding: spacing.sm, gap: spacing.xs },
  footer: { paddingVertical: spacing.lg },
});
