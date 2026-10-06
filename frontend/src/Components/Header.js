import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../colors";
import { fonts } from "../theme";

// Standard in-app header: round back button · title (+ subtitle) · optional right action.
export default function Header({ title, subtitle, onBack, right }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.heading} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.titleBox}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutralSoft, justifyContent: "center", alignItems: "center" },
  spacer: { width: 40 },
  titleBox: { flex: 1, marginHorizontal: 12 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  right: { minWidth: 40, alignItems: "flex-end" },
});
