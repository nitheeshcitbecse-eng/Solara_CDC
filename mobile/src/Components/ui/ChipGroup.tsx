import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../lib/theme/tokens';
import { Chip } from './Chip';
import { FieldError } from './FieldError';
import { Text } from './Text';

type ChipOption<T extends string> = { value: T; label: string };

type ChipGroupProps<T extends string> = {
  label?: string;
  hint?: string;
  options: readonly ChipOption<T>[];
  error?: string;
} & (
  | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void }
  | { multiple?: false; value: T | null; onChange: (value: T) => void }
);

/**
 * A wrapping set of chips for small, bounded option sets (languages, shifts, sectors).
 * Long or paginated data uses FlatList instead.
 */
export function ChipGroup<T extends string>(props: ChipGroupProps<T>) {
  const { label, hint, options, error } = props;

  const isSelected = (value: T) => (props.multiple ? props.value.includes(value) : props.value === value);

  const toggle = useCallback(
    (value: T) => {
      if (props.multiple) {
        const next = props.value.includes(value) ? props.value.filter((item) => item !== value) : [...props.value, value];
        props.onChange(next);
      } else {
        props.onChange(value);
      }
    },
    [props],
  );

  return (
    <View style={styles.container} accessibilityRole={props.multiple ? undefined : 'radiogroup'} accessibilityLabel={label}>
      {label ? (
        <Text variant="label" color="textMuted">
          {label}
        </Text>
      ) : null}
      {hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
      <View style={styles.wrap}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={isSelected(option.value)}
            role={props.multiple ? 'checkbox' : 'radio'}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
