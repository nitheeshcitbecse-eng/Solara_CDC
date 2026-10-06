import { LayoutGrid, Search } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { SectorTile } from '../../Components/domain/SectorTile';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { IconButton } from '../../Components/ui/IconButton';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { useSectors } from '../../api/queries/sectors';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Sector } from '../../lib/types/jobs';
import type { UserTabScreenProps } from '../../lib/types/navigation';

export function ExploreScreen({ navigation }: UserTabScreenProps<'Explore'>) {
  const { t } = useTranslation();
  const sectors = useSectors();

  const openSector = useCallback(
    (sector: Sector) => navigation.navigate('SectorJobs', { sectorId: sector.id, sectorName: sector.name, sectorSlug: sector.slug }),
    [navigation],
  );

  const placeholder = sectors.isPending ? (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={styles.skeletonCell}>
          <Skeleton height={sizes.chartHeight - spacing.xl} radius={radius.lg} />
        </View>
      ))}
    </View>
  ) : sectors.isError ? (
    <ErrorState error={sectors.error} onRetry={() => void sectors.refetch()} />
  ) : (
    <EmptyState icon={LayoutGrid} title={t('explore.emptyTitle')} body={t('explore.emptyBody')} />
  );

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <Header
          back={false}
          title={t('explore.title')}
          right={<IconButton icon={Search} onPress={() => navigation.navigate('Search')} accessibilityLabel={t('common.search')} />}
        />
      }
    >
      <FlatList
        data={sectors.data ?? []}
        keyExtractor={(sector) => sector.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text variant="body" color="textMuted" style={styles.subtitle}>
            {t('explore.subtitle')}
          </Text>
        }
        ListEmptyComponent={placeholder}
        renderItem={({ item }) => <SectorTile sector={item} variant="tile" onPress={openSector} />}
        refreshControl={
          <RefreshControl
            refreshing={sectors.isRefetching}
            onRefresh={() => void sectors.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  column: { gap: spacing.sm },
  subtitle: { marginBottom: spacing.xs },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skeletonCell: { width: '48%' },
});
