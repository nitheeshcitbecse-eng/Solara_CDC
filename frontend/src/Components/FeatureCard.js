import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import useTheme from "../lib/useTheme";

// Dashboard tile. `large` gives the bigger, simpler tiles used for daily workers.
export default function FeatureCard({ title, subtitle, icon, onPress, badge, color, background, large = false }) {
  const theme = useTheme();
  const tint = color || theme.accent;
  const soft = background || theme.accentSoft;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, large && styles.large, pressed && styles.pressed]}>
      <View style={[styles.iconBox, large && styles.iconBoxLarge, { backgroundColor: soft }]}>
        <MaterialIcons name={icon} size={large ? 32 : 24} color={tint} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "48%", backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  large: { alignItems: "center", paddingVertical: 22 },
  pressed: { transform: [{ scale: 0.97 }] },
  iconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  iconBoxLarge: { width: 64, height: 64, borderRadius: 20 },
  badge: { position: "absolute", top: -6, right: -8, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.error, justifyContent: "center", alignItems: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: "#fff" },
  badgeText: { color: "#fff", fontFamily: fonts.bold, fontSize: 11 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  titleLarge: { fontSize: 16, textAlign: "center" },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
});
