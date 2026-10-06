import { Check, CircleHelp, Plus, Search, Sparkles } from 'lucide-react-native';
import { memo, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useCheckSector } from '../../api/queries/sectors';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { sectorLabel } from '../../lib/i18n/labels';
import { colors, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Sector, SectorCheckDecision } from '../../lib/types/jobs';
import { normalizeText } from '../../utils/format';
import { LIMITS, sectorNameSchema } from '../../utils/validation';
import { InlineAlert } from '../feedback/InlineAlert';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { SectorIcon } from './SectorIcon';

export type SectorChoice =
  | { kind: 'existing'; sectorId: string }
  | { kind: 'new'; name: string; decision: Exclude<SectorCheckDecision, 'match'> };

type SectorPickerProps = {
  sectors: readonly Sector[];
  value: SectorChoice | null;
  onChange: (value: SectorChoice | null) => void;
  header: ReactElement;
};

type RowProps = { sector: Sector; selected: boolean; onSelect: (sector: Sector) => void };

const SectorRow = memo(function SectorRow({ sector, selected, onSelect }: RowProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => onSelect(sector)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, selected ? styles.rowSelected : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconTile}>
        <SectorIcon slug={sector.slug} size={sizes.icon} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{sectorLabel(t, sector)}</Text>
        <Text variant="caption" color="textMuted">
          {t('explore.jobCount', { count: sector.jobCount })}
        </Text>
      </View>
      {selected ? <Check size={sizes.icon} color={colors.primary} strokeWidth={2} /> : null}
    </Pressable>
  );
});

/**
 * Step 1 of Add work: pick one of the sectors every hirer shares, or type a new
 * one. A new name is checked by the AI, which may map it to an existing sector
 * ("sweeper" → Cleaning), propose a new sector, or ask a moderator to decide.
 */
export function SectorPicker({ sectors, value, onChange, header }: SectorPickerProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const check = useCheckSector();
  const [query, setQuery] = useState('');
  const [addingNew, setAddingNew] = useState(value?.kind === 'new');
  const [newName, setNewName] = useState(value?.kind === 'new' ? value.name : '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [matched, setMatched] = useState<Sector | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sectors;
    return sectors.filter(
      (sector) => sector.name.toLowerCase().includes(needle) || sectorLabel(t, sector).toLowerCase().includes(needle),
    );
  }, [sectors, query, t]);

  const selectExisting = (sector: Sector) => {
    setAddingNew(false);
    setMatched(null);
    check.reset();
    onChange({ kind: 'existing', sectorId: sector.id });
  };

  const runCheck = () => {
    const parsed = sectorNameSchema.safeParse({ name: newName });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message);
      return;
    }
    setNameError(undefined);
    const name = normalizeText(newName);
    check.mutate(name, {
      onSuccess: (result) => {
        if (result.decision === 'match' && result.sector) {
          setMatched(result.sector);
          onChange({ kind: 'existing', sectorId: result.sector.id });
        } else {
          setMatched(null);
          onChange({ kind: 'new', name, decision: result.decision === 'review' ? 'review' : 'new' });
        }
      },
    });
  };

  const footer = (
    <View style={styles.footer}>
      {addingNew ? (
        <View style={styles.newBox}>
          <TextField
            label={t('addWork.newSectorLabel')}
            placeholder={t('addWork.newSectorPlaceholder')}
            value={newName}
            onChangeText={(text) => {
              setNewName(text);
              if (value?.kind === 'new' || matched) {
                setMatched(null);
                onChange(null);
              }
            }}
            error={nameError}
            maxLength={LIMITS.sectorName}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={runCheck}
          />
          <Button label={t('addWork.checkSector')} icon={Sparkles} variant="secondary" onPress={runCheck} loading={check.isPending} />
          {check.error ? <InlineAlert tone="danger" message={errorMessage(check.error)} /> : null}
          {matched ? (
            <InlineAlert tone="success" title={t('addWork.matchTitle', { sector: sectorLabel(t, matched) })} message={t('addWork.matchBody')} />
          ) : null}
          {value?.kind === 'new' && value.decision === 'new' ? (
            <InlineAlert tone="info" title={t('addWork.newTitle')} message={t('addWork.newBody', { name: value.name })} />
          ) : null}
          {value?.kind === 'new' && value.decision === 'review' ? (
            <InlineAlert tone="warning" title={t('addWork.reviewTitle')} message={t('addWork.reviewBody')} />
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setAddingNew(true);
            onChange(null);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, styles.otherRow, pressed ? styles.pressed : null]}
        >
          <View style={styles.iconTile}>
            <Plus size={sizes.icon} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('addWork.otherSector')}</Text>
            <Text variant="caption" color="textMuted">
              {t('addWork.otherSectorHint')}
            </Text>
          </View>
          <CircleHelp size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(sector) => sector.id}
      renderItem={({ item }) => (
        <SectorRow sector={item} selected={value?.kind === 'existing' && value.sectorId === item.id && !addingNew} onSelect={selectExisting} />
      )}
      extraData={[value, addingNew]}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <TextField
            label={t('addWork.searchSectors')}
            value={query}
            onChangeText={setQuery}
            maxLength={LIMITS.search}
            right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
          />
        </View>
      }
      ListFooterComponent={footer}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={Separator}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: spacing.xs },
  row: {
    minHeight: MIN_TOUCH + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, borderWidth: sizes.focusRing, backgroundColor: colors.surfaceSelected },
  otherRow: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { marginTop: spacing.xs },
  newBox: { gap: spacing.md },
});
