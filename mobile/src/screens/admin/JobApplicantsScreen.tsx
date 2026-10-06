import { UsersRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApplicantCard } from '../../Components/domain/ApplicantCard';
import { JobCardSkeleton } from '../../Components/domain/JobCardSkeleton';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Chip } from '../../Components/ui/Chip';
import { useJobApplicants } from '../../api/queries/applications';
import { useFlatPages } from '../../api/queries/jobs';
import { colors, spacing } from '../../lib/theme/tokens';
import { APPLICATION_STATUSES, type ApplicantSummary, type ApplicationStatus } from '../../lib/types/applications';
import type { RootScreenProps } from '../../lib/types/navigation';

const keyExtractor = (applicant: ApplicantSummary) => applicant.id;

export function JobApplicantsScreen({ navigation, route }: RootScreenProps<'JobApplicants'>) {
  const { jobId, jobTitle } = route.params;
  const { t } = useTranslation();
  const [status, setStatus] = useState<ApplicationStatus | undefined>(undefined);
  const query = useJobApplicants(jobId, status);
  const applicants = useFlatPages(query.data);

  const open = useCallback((applicationId: string) => navigation.navigate('ApplicantDetail', { applicationId }), [navigation]);
  const renderItem = useCallback(({ item }: { item: ApplicantSummary }) => <ApplicantCard applicant={item} onPress={open} />, [open]);

  const placeholder = query.isPending ? (
    <JobCardSkeleton count={4} />
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState icon={UsersRound} title={t('applicants.emptyTitle')} body={t('applicants.emptyBody')} />
  );

  return (
    <Screen
      scroll={false}
      header={
        <View>
          <Header title={t('tabs.applicants')} subtitle={jobTitle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label={t('applied.all')} selected={status === undefined} role="radio" onPress={() => setStatus(undefined)} />
            {APPLICATION_STATUSES.map((value) => (
              <Chip key={value} label={t(`enums.applicationStatus.${value}`)} selected={status === value} role="radio" onPress={() => setStatus(value)} />
            ))}
          </ScrollView>
        </View>
      }
    >
      <FlatList
        data={query.isPending || query.isError ? [] : applicants}
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
