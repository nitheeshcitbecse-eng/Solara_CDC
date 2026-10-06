import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";
import useTheme from "../lib/useTheme";

export default function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: theme.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, marginTop: 6 },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  action: { fontFamily: fonts.semibold, fontSize: 14 },
});
