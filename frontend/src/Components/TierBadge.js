import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts } from "../theme";

export default function TierBadge({ tier, onDark = false }) {
  if (!tier) return null;
  const premium = tier === "premium";
  const tint = premium ? (onDark ? colors.premiumInk : colors.premiumGold) : onDark ? "#fff" : colors.primary;
  const background = premium
    ? onDark
      ? colors.premiumGoldBright
      : colors.premiumGoldSoft
    : onDark
      ? "rgba(255,255,255,0.18)"
      : colors.primarySoft;

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <MaterialIcons name={premium ? "workspace-premium" : "handyman"} size={13} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{premium ? "PREMIUM" : "NORMAL"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  text: { fontFamily: fonts.extrabold, fontSize: 10.5, letterSpacing: 0.7 },
});
