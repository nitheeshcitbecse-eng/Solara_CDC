import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts } from "../theme";
import useTheme from "../lib/useTheme";

// Icon + optional label + value. Renders nothing when there is no value.
export default function InfoRow({ icon, label, text, numberOfLines }) {
  const theme = useTheme();
  if (text === null || text === undefined || text === "") return null;
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: theme.accentSoft }]}>
        <MaterialIcons name={icon} size={17} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.text} numberOfLines={numberOfLines}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  iconTile: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  label: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.body },
});
