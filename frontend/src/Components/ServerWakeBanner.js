import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "./Text";
import { subscribeSlowServer } from "../api/api";
import { fonts, radius, shadow } from "../theme";

// Shown while requests take long: on the free hosting plan the server sleeps when nobody uses it
// and needs up to a minute to start again.
export default function ServerWakeBanner() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeSlowServer(setVisible), []);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <View style={styles.banner}>
        <ActivityIndicator size="small" color="#e8b64c" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Connecting to the server…</Text>
          <Text style={styles.text}>After a break this can take up to a minute. Please wait.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, zIndex: 50 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1c1917", borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16, ...shadow.lg },
  title: { fontFamily: fonts.bold, fontSize: 14, color: "#fff" },
  text: { fontFamily: fonts.medium, fontSize: 12.5, color: "#e7dccf", marginTop: 2 },
});
