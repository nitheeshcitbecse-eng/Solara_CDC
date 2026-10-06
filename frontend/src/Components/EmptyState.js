import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "./Button";
import colors from "../colors";
import { fonts } from "../theme";
import useTheme from "../lib/useTheme";

export default function EmptyState({ icon = "inbox", title, message, actionLabel, onAction }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.accentSoft }]}>
        <MaterialIcons name={icon} size={34} color={theme.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} size="md" fullWidth={false} style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading, textAlign: "center" },
  message: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
});
