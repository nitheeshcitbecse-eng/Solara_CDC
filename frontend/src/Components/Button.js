import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";

const SIZES = {
  sm: { paddingVertical: 9, paddingHorizontal: 14, fontSize: 13, icon: 16 },
  md: { paddingVertical: 13, paddingHorizontal: 18, fontSize: 15, icon: 19 },
  lg: { paddingVertical: 16, paddingHorizontal: 22, fontSize: 16, icon: 21 },
};

// variant: primary | secondary | outline | ghost | danger | success | light
export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) {
  const theme = useTheme();
  const scale = SIZES[size];

  const palette = {
    primary: { background: theme.button, text: theme.buttonText, border: theme.button },
    secondary: { background: theme.accentSoft, text: theme.accentDark, border: theme.accentSoft },
    outline: { background: "transparent", text: theme.accentDark, border: theme.accent },
    ghost: { background: "transparent", text: theme.accent, border: "transparent" },
    danger: { background: colors.error, text: "#fff", border: colors.error },
    success: { background: colors.success, text: "#fff", border: colors.success },
    light: { background: "#fff", text: colors.heading, border: "#fff" },
  }[variant];

  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          paddingVertical: scale.paddingVertical,
          paddingHorizontal: scale.paddingHorizontal,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: inactive ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialIcons name={icon} size={scale.icon} color={palette.text} /> : null}
          <Text style={[styles.text, { color: palette.text, fontSize: scale.fontSize }]}>{title}</Text>
          {iconRight ? <MaterialIcons name={iconRight} size={scale.icon} color={palette.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "100%" }, // lets long (translated) labels wrap
  text: { fontFamily: fonts.bold, textAlign: "center" },
});
