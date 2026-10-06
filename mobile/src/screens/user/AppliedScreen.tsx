import { ClipboardList } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApplicationCard } from '../../Components/domain/ApplicationCard';
import { JobCardSkeleton } from '../../Components/domain/JobCardSkeleton';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Chip } from '../../Components/ui/Chip';
import { useMyApplications } from '../../api/queries/applications';
import { useFlatPages } from '../../api/queries/jobs';
import { colors, spacing } from '../../lib/theme/tokens';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '../../lib/types/applications';
import type { UserTabScreenProps } from '../../lib/types/navigation';

const keyExtractor = (application: Application) => application.id;

export function AppliedScreen({ navigation }: UserTabScreenProps<'Applied'>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ApplicationStatus | undefined>(undefined);
  const query = useMyApplications(status);
  const applications = useFlatPages(query.data);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const open = useCallback(
    (applicationId: string) => navigation.navigate('ApplicationDetails', { applicationId }),
    [navigation],
  );
  const renderItem = useCallback(({ item }: { item: Application }) => <ApplicationCard application={item} onPress={open} />, [open]);

  const placeholder = query.isPending ? (
    <JobCardSkeleton count={4} />
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState
      icon={ClipboardList}
      title={status ? t('applied.emptyFilteredTitle') : t('applied.emptyTitle')}
      body={status ? t('applied.emptyFilteredBody') : t('applied.emptyBody')}
      action={
        status
          ? { label: t('applied.showAll'), onPress: () => setStatus(undefined) }
          : { label: t('home.exploreAll'), onPress: () => navigation.navigate('Explore') }
      }
    />
  );

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <View>
          <Header back={false} title={t('applied.title')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label={t('applied.all')} selected={status === undefined} role="radio" onPress={() => setStatus(undefined)} />
            {APPLICATION_STATUSES.map((value) => (
              <Chip
                key={value}
                label={t(`enums.applicationStatus.${value}`)}
                selected={status === value}
                role="radio"
                onPress={() => setStatus(value)}
              />
            ))}
          </ScrollView>
        </View>
      }
    >
      <FlatList
        data={query.isPending || query.isError ? [] : applications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={placeholder}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  filters: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
