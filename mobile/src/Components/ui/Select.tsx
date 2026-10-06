import { Check, ChevronDown, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { BottomSheet } from './BottomSheet';
import { FieldError } from './FieldError';
import { Text } from './Text';
import { TextField } from './TextField';

// Long lists (e.g. 36 states) get a search box so nobody has to scroll through them.
const SEARCH_THRESHOLD = 12;

type SelectOption<T extends string> = { value: T; label: string; description?: string };

type SelectProps<T extends string> = {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
};

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  placeholder,
  optional = false,
  disabled = false,
}: SelectProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const searchable = options.length > SEARCH_THRESHOLD;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="label" color="textMuted">
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" color="textSubtle">
            {t('common.optional')}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? t('common.selectPlaceholder') }}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          { borderColor: error ? colors.danger : colors.borderStrong },
          pressed ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text variant="body" color={selected ? 'text' : 'textSubtle'} style={styles.value} numberOfLines={2}>
          {selected?.label ?? placeholder ?? t('common.selectPlaceholder')}
        </Text>
        <ChevronDown size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
      <FieldError message={error} />

      <BottomSheet visible={open} onClose={close} title={label} scrollable={false}>
        {searchable ? (
          <View style={styles.search}>
            <TextField
              label={t('common.search')}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
            />
          </View>
        ) : null}
        <FlatList
          data={visible}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(option) => option.value}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [styles.option, isSelected ? styles.optionSelected : null, pressed ? styles.pressed : null]}
              >
                <View style={styles.optionText}>
                  <Text variant={isSelected ? 'bodyStrong' : 'body'}>{item.label}</Text>
                  {item.description ? (
                    <Text variant="caption" color="textMuted">
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Check size={sizes.icon} color={colors.primary} strokeWidth={2} /> : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  field: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.5 },
  search: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.xxs },
  option: {
    minHeight: sizes.listRow,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionSelected: { backgroundColor: colors.surfaceSelected },
  optionText: { flex: 1, gap: spacing.xxs },
});
