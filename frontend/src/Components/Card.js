import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";

// White surface with a soft shadow. Pass onPress to make it tappable, title for a card heading.
export default function Card({ children, onPress, title, right, style, padded = true }) {
  const content = (
    <>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {right || null}
        </View>
      ) : null}
      {children}
    </>
  );

  if (!onPress) return <View style={[styles.card, padded && styles.padded, style]}>{content}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, padded && styles.padded, pressed && styles.pressed, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, marginBottom: 14, ...shadow.sm },
  padded: { padding: 18 },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
});
