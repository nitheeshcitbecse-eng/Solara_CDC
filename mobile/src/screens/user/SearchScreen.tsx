import { ArrowLeft, Search, SearchX, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { JobList } from '../../Components/domain/JobList';
import { SectorTile } from '../../Components/domain/SectorTile';
import { Screen } from '../../Components/layout/Screen';
import { BottomSheet } from '../../Components/ui/BottomSheet';
import { Button } from '../../Components/ui/Button';
import { Chip } from '../../Components/ui/Chip';
import { ChipGroup } from '../../Components/ui/ChipGroup';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useJobSearch } from '../../api/queries/jobs';
import { useSectors } from '../../api/queries/sectors';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import { SHIFTS, type Sector, type Shift } from '../../lib/types/jobs';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatRupees, normalizeText } from '../../utils/format';
import { LIMITS } from '../../utils/validation';

type Filters = { city: string; minSalary: number | null; shift: Shift | null };

const SALARY_STEPS = [10000, 15000, 20000, 25000] as const;
const EMPTY_FILTERS: Filters = { city: '', minSalary: null, shift: null };

export function SearchScreen({ navigation, route }: RootScreenProps<'Search'>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(route.params?.q ?? '');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedQuery = useDebounce(normalizeText(query), 350);
  const sectors = useSectors();

  const hasFilters = filters.city !== '' || filters.minSalary !== null || filters.shift !== null;
  const searching = debouncedQuery.length >= 2 || hasFilters;

  const params = useMemo(
    () => ({
      q: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      city: filters.city || undefined,
      minSalary: filters.minSalary ?? undefined,
      shift: filters.shift ?? undefined,
    }),
    [debouncedQuery, filters],
  );
  const results = useJobSearch(params, searching);

  const openJob = useCallback((jobId: string) => navigation.navigate('JobDetails', { jobId }), [navigation]);
  const openSector = useCallback(
    (sector: Sector) => navigation.navigate('SectorJobs', { sectorId: sector.id, sectorName: sector.name, sectorSlug: sector.slug }),
    [navigation],
  );

  const salaryLabel = (amount: number) => t('search.salaryAtLeast', { amount: formatRupees(amount) });

  const activeChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChips}>
      <Chip
        label={hasFilters ? t('search.filtersActive') : t('search.filters')}
        icon={SlidersHorizontal}
        selected={hasFilters}
        role="button"
        onPress={() => {
          setDraft(filters);
          setFiltersOpen(true);
        }}
      />
      {filters.city ? <Chip label={filters.city} onRemove={() => setFilters((current) => ({ ...current, city: '' }))} /> : null}
      {filters.minSalary ? (
        <Chip label={salaryLabel(filters.minSalary)} onRemove={() => setFilters((current) => ({ ...current, minSalary: null }))} />
      ) : null}
      {filters.shift ? (
        <Chip label={t(`enums.shift.${filters.shift}`)} onRemove={() => setFilters((current) => ({ ...current, shift: null }))} />
      ) : null}
    </ScrollView>
  );

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.header}>
          <View style={styles.searchRow}>
            <IconButton icon={ArrowLeft} onPress={() => navigation.goBack()} accessibilityLabel={t('a11y.back')} />
            <View style={styles.searchField}>
              <TextField
                label={t('common.search')}
                placeholder={t('home.searchPlaceholder')}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
                maxLength={LIMITS.search}
                right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
              />
            </View>
          </View>
          {activeChips}
        </View>
      }
    >
      {searching ? (
        <JobList
          query={results}
          onPressJob={openJob}
          empty={{
            icon: SearchX,
            title: t('search.noResultsTitle'),
            body: t('search.noResultsBody'),
            action: hasFilters ? { label: t('search.clearFilters'), onPress: () => setFilters(EMPTY_FILTERS) } : undefined,
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.hint} keyboardShouldPersistTaps="handled">
          <Text variant="body" color="textMuted">
            {t('search.hint')}
          </Text>
          <Text variant="heading">{t('search.browseSectors')}</Text>
          <View style={styles.sectorWrap}>
            {(sectors.data ?? []).map((sector) => (
              <SectorTile key={sector.id} sector={sector} onPress={openSector} />
            ))}
          </View>
        </ScrollView>
      )}

      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('search.filters')}
        footer={
          <>
            <Button
              label={t('search.applyFilters')}
              onPress={() => {
                setFilters({ ...draft, city: normalizeText(draft.city) });
                setFiltersOpen(false);
              }}
            />
            <Button label={t('search.clearFilters')} variant="secondary" onPress={() => setDraft(EMPTY_FILTERS)} />
          </>
        }
      >
        <TextField
          label={t('search.city')}
          value={draft.city}
          onChangeText={(city) => setDraft((current) => ({ ...current, city }))}
          maxLength={LIMITS.place}
          autoCapitalize="words"
        />
        <ChipGroup
          label={t('search.minSalary')}
          options={SALARY_STEPS.map((amount) => ({ value: String(amount), label: salaryLabel(amount) }))}
          value={draft.minSalary ? String(draft.minSalary) : null}
          onChange={(value) =>
            setDraft((current) => ({ ...current, minSalary: current.minSalary === Number(value) ? null : Number(value) }))
          }
        />
        <ChipGroup
          label={t('search.shift')}
          options={SHIFTS.map((shift) => ({ value: shift, label: t(`enums.shift.${shift}`) }))}
          value={draft.shift}
          onChange={(shift) => setDraft((current) => ({ ...current, shift: current.shift === shift ? null : shift }))}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xs, gap: spacing.xs },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xxs, paddingStart: spacing.sm, paddingEnd: spacing.lg },
  searchField: { flex: 1 },
  activeChips: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xxs },
  hint: { padding: spacing.lg, gap: spacing.md },
  sectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
