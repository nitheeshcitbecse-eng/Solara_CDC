import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

export type PickerOption = { value: number | string; label: string };

type PickerColumnProps = {
  title: string;
  options: readonly PickerOption[];
  selected: number | string;
  onSelect: (value: number | string) => void;
};

const ROW = sizes.pickerRow;

/** One scrollable column of a date/time picker. Tap a row to select it. */
function PickerColumnBase({ title, options, selected, onSelect }: PickerColumnProps) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected),
  );
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: ROW, offset: ROW * index, index }),
    [],
  );

  return (
    <View style={styles.column} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <Text variant="label" color="textMuted" align="center">
        {title}
      </Text>
      <FlatList
        data={options}
        keyExtractor={(option) => String(option.value)}
        getItemLayout={getItemLayout}
        // Start scrolled so the current value sits near the top of the column.
        initialScrollIndex={Math.max(0, selectedIndex - 1)}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = item.value === selected;
          return (
            <Pressable
              onPress={() => onSelect(item.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={[styles.row, isSelected ? styles.rowSelected : null]}
            >
              <Text variant={isSelected ? 'bodyStrong' : 'body'} color={isSelected ? 'primary' : 'text'} align="center">
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export const PickerColumn = memo(PickerColumnBase);

const styles = StyleSheet.create({
  column: { flex: 1, gap: spacing.xs },
  list: {
    height: sizes.pickerHeight,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
  },
  row: { height: ROW, justifyContent: 'center', paddingHorizontal: spacing.xs },
  rowSelected: { backgroundColor: colors.surfaceSelected },
});
