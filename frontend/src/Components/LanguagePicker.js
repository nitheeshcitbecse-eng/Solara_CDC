import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Text from "./Text";
import { SOURCE_LANGUAGE, useLanguage } from "../context/LanguageContext";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";

// Pill that shows the current language and opens the list. `light` is for photo / dark backgrounds.
export default function LanguagePicker({ light = false, style }) {
  const { language, languages, setLanguage, offline } = useLanguage();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const current = languages.find((item) => item.code === language) || languages[0];

  const choose = async (code) => {
    setVisible(false);
    await setLanguage(code);
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.pill, light ? styles.pillLight : styles.pillDark, pressed && { opacity: 0.7 }, style]}
      >
        <MaterialIcons name="translate" size={16} color={light ? "#fff" : theme.accent} />
        <Text translate={false} style={[styles.pillText, { color: light ? "#fff" : colors.heading }]}>
          {current?.nativeName}
        </Text>
        <MaterialIcons name="expand-more" size={16} color={light ? "#fff" : colors.muted} />
      </Pressable>

      <Modal transparent statusBarTranslucent visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose your language</Text>
          <Text style={styles.subtitle}>Everything in the app, including job posts and messages, is shown in this language. A new language takes a moment the first time.</Text>
          {offline && language !== SOURCE_LANGUAGE ? (
            <View style={styles.offline}>
              <MaterialIcons name="cloud-off" size={16} color={colors.warning} />
              <Text style={styles.offlineText}>The translation service is not reachable, so some text is still in English.</Text>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {languages.map((item) => {
              const selected = item.code === language;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => choose(item.code)}
                  style={({ pressed }) => [styles.row, selected && { backgroundColor: theme.accentSoft }, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text translate={false} style={styles.native}>{item.nativeName}</Text>
                    {item.nativeName !== item.name ? <Text translate={false} style={styles.english}>{item.name}</Text> : null}
                  </View>
                  {selected ? <MaterialIcons name="check-circle" size={22} color={theme.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radius.pill, alignSelf: "flex-start" },
  pillLight: { backgroundColor: "rgba(0,0,0,0.32)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  pillDark: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  pillText: { fontFamily: fonts.semibold, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(28,20,14,0.55)" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, marginTop: 4, marginBottom: 12, lineHeight: 19 },
  offline: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.warningSoft, padding: 10, borderRadius: radius.md, marginBottom: 12 },
  offlineText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.warning },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, marginBottom: 4 },
  // Plus Jakarta Sans has no Indian scripts, so these use the system font (and fontWeight).
  native: { fontSize: 17, color: colors.heading, fontWeight: "600" },
  english: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 1 },
});
