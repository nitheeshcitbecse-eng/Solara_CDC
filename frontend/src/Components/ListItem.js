import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";

// Row with an icon tile, title, subtitle and a chevron (or a custom right element).
export default function ListItem({ icon, title, subtitle, right, onPress, danger = false, last = false }) {
  const theme = useTheme();
  const tint = danger ? colors.error : theme.accent;
  const soft = danger ? colors.errorSoft : theme.accentSoft;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.6 }]}>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: soft }]}>
          <MaterialIcons name={icon} size={21} color={tint} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, danger && { color: colors.error }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <MaterialIcons name="chevron-right" size={22} color={colors.subtle} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconTile: { width: 40, height: 40, borderRadius: radius.sm + 2, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
});
