import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import colors from "../colors";
import { radius } from "../theme";

// Pulsing placeholder cards shown while a list loads.
export default function LoadingState({ count = 3 }) {
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.card, { opacity: pulse }]}>
          <View style={styles.row}>
            <View style={styles.avatar} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.line, { width: "70%" }]} />
              <View style={[styles.line, { width: "45%" }]} />
            </View>
          </View>
          <View style={[styles.line, { width: "90%", marginTop: 16 }]} />
          <View style={[styles.line, { width: "60%", marginTop: 8 }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.divider },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.neutralSoft },
  line: { height: 11, borderRadius: 6, backgroundColor: colors.neutralSoft },
});
