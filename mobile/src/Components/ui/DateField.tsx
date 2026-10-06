import { CalendarDays, Clock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { formatDate, formatMonth, localeFor } from '../../utils/format';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldError } from './FieldError';
import { PickerColumn, type PickerOption } from './PickerColumn';
import { Text } from './Text';

type Mode = 'date' | 'month' | 'time';

type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD" (date), "YYYY-MM" (month), "HH:mm" (time) or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  mode: Mode;
  error?: string;
  optional?: boolean;
  minYear?: number;
  maxYear?: number;
  /** Where the picker starts when there's no value yet. */
  defaultValue?: string;
};

const MINUTES = ['00', '15', '30', '45'];
const pad = (value: number) => String(value).padStart(2, '0');
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();

type Draft = { year: number; month: number; day: number; hour: number; minute: string };

function parse(value: string, mode: Mode): Draft {
  const now = new Date();
  const draft: Draft = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: 9, minute: '00' };
  if (mode === 'time') {
    const [hour, minute] = value.split(':');
    if (hour) draft.hour = Number(hour);
    if (minute && MINUTES.includes(minute)) draft.minute = minute;
    return draft;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year) draft.year = year;
  if (month) draft.month = month;
  if (day) draft.day = day;
  return draft;
}

function serialise(draft: Draft, mode: Mode): string {
  if (mode === 'time') return `${pad(draft.hour)}:${draft.minute}`;
  if (mode === 'month') return `${draft.year}-${pad(draft.month)}`;
  return `${draft.year}-${pad(draft.month)}-${pad(Math.min(draft.day, daysIn(draft.year, draft.month)))}`;
}

/** Date, month or time input that opens a column picker in a bottom sheet (no native module needed). */
export function DateField({
  label,
  value,
  onChange,
  mode,
  error,
  optional = false,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
  defaultValue,
}: DateFieldProps) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => parse(value || defaultValue || '', mode));

  const monthOptions = useMemo<PickerOption[]>(() => {
    const formatter = new Intl.DateTimeFormat(localeFor(activeLanguage), { month: 'short' });
    return Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: formatter.format(new Date(2000, index, 1)) }));
  }, [activeLanguage]);

  const yearOptions = useMemo<PickerOption[]>(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => ({ value: maxYear - index, label: String(maxYear - index) })),
    [minYear, maxYear],
  );

  const dayOptions = useMemo<PickerOption[]>(
    () => Array.from({ length: daysIn(draft.year, draft.month) }, (_, index) => ({ value: index + 1, label: String(index + 1) })),
    [draft.year, draft.month],
  );

  const hourOptions = useMemo<PickerOption[]>(
    () => Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: pad(hour) })),
    [],
  );
  const minuteOptions = useMemo<PickerOption[]>(() => MINUTES.map((minute) => ({ value: minute, label: minute })), []);

  const display = !value
    ? null
    : mode === 'date'
      ? formatDate(value, activeLanguage)
      : mode === 'month'
        ? formatMonth(value, activeLanguage)
        : value;

  const openPicker = () => {
    setDraft(parse(value || defaultValue || '', mode));
    setOpen(true);
  };

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const Icon = mode === 'time' ? Clock : CalendarDays;

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
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: display ?? t('common.selectPlaceholder') }}
        style={({ pressed }) => [
          styles.field,
          { borderColor: error ? colors.danger : colors.borderStrong },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text variant="body" color={display ? 'text' : 'textSubtle'} style={styles.value}>
          {display ?? t('common.selectPlaceholder')}
        </Text>
        <Icon size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
      <FieldError message={error} />

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <>
            <Button
              label={t('common.done')}
              onPress={() => {
                onChange(serialise(draft, mode));
                setOpen(false);
              }}
            />
            {optional && value ? (
              <Button
                label={t('common.clear')}
                variant="secondary"
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              />
            ) : null}
          </>
        }
      >
        <View style={styles.columns}>
          {mode === 'date' ? (
            <PickerColumn title={t('picker.day')} options={dayOptions} selected={draft.day} onSelect={(day) => update({ day: Number(day) })} />
          ) : null}
          {mode !== 'time' ? (
            <>
              <PickerColumn
                title={t('picker.month')}
                options={monthOptions}
                selected={draft.month}
                onSelect={(month) => update({ month: Number(month) })}
              />
              <PickerColumn
                title={t('picker.year')}
                options={yearOptions}
                selected={draft.year}
                onSelect={(year) => update({ year: Number(year) })}
              />
            </>
          ) : (
            <>
              <PickerColumn
                title={t('picker.hour')}
                options={hourOptions}
                selected={draft.hour}
                onSelect={(hour) => update({ hour: Number(hour) })}
              />
              <PickerColumn
                title={t('picker.minute')}
                options={minuteOptions}
                selected={draft.minute}
                onSelect={(minute) => update({ minute: String(minute) })}
              />
            </>
          )}
        </View>
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
  pressed: { backgroundColor: colors.surfaceMuted },
  value: { flex: 1 },
  columns: { flexDirection: 'row', gap: spacing.sm },
});
