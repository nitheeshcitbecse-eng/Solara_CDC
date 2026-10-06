import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";

const sunrise = require("../../assets/images/logo-sunrise.jpg");

// The Solara mark (same photo as the app icon): the sun rising over the sea, in a round gold-edged frame.
// `wordmark` adds the name next to it; `light` makes the name white for dark backgrounds.
export default function Logo({ size = 56, wordmark = false, light = false, stacked = false }) {
  const mark = (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: Math.max(1.5, size * 0.035) }]}>
      <Image source={sunrise} style={{ width: "100%", height: "100%", borderRadius: size / 2 }} resizeMode="cover" />
    </View>
  );

  if (!wordmark) return mark;

  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      {mark}
      <Text translate={false} style={[styles.word, { fontSize: stacked ? size * 0.6 : size * 0.5, color: light ? "#fff" : colors.heading }]}>
        Solara
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { backgroundColor: "rgba(232,182,76,0.55)" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  stacked: { flexDirection: "column", gap: 14 },
  word: { fontFamily: fonts.extrabold, letterSpacing: 0.5 },
});
