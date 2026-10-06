import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";
import useTheme from "../lib/useTheme";

// options: [{ label, value }]. Horizontal scrolling row, or wrapping rows with wrap.
export default function ChipGroup({ options, selected, onSelect, wrap = false }) {
  const theme = useTheme();

  const chips = options.map((option) => {
    const active = option.value === selected;
    return (
      <Pressable
        key={String(option.value)}
        style={[styles.chip, active && { backgroundColor: theme.button, borderColor: theme.button }]}
        onPress={() => onSelect(option.value)}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (wrap) return <View style={styles.wrap}>{chips}</View>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 8, paddingVertical: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body },
  chipTextActive: { color: "#fff" },
});
