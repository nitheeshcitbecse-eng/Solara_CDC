import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import useTheme from "../lib/useTheme";

// Small number tile: icon, big value, label. `tone` overrides the theme colour.
export default function StatCard({ icon, value, label, tone, onPress, style }) {
  const theme = useTheme();
  const tint = tone || theme.accent;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, style]}>
      <View style={[styles.iconTile, { backgroundColor: `${tint}1A` }]}>
        <MaterialIcons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.value}>{value ?? "–"}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  iconTile: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  value: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.heading },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
});
