import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import PhotoHero from "./PhotoHero";
import Logo from "./Logo";
import LanguagePicker from "./LanguagePicker";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import { heroImage } from "../lib/sectorImages";

// Shared frame for sign-in screens: photo hero with the Solara logo and title, then a card that
// overlaps it. The scroll view keeps the focused field above the keyboard.
export default function AuthLayout({ gradient, image, title, subtitle, badge, onBack, children, footer }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        bottomOffset={28}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <PhotoHero source={image || heroImage("city")} tint={gradient} style={[styles.hero, { paddingTop: insets.top + 54 }]}>
          {onBack ? (
            <Pressable style={[styles.back, { top: insets.top + 12 }]} onPress={onBack} hitSlop={10}>
              <MaterialIcons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <LanguagePicker light style={[styles.language, { top: insets.top + 12 }]} />
          <Logo size={58} />
          <Text style={styles.title}>{title}</Text>
          {badge ? <View style={{ marginTop: 10 }}>{badge}</View> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </PhotoHero>

        {/* Card */}
        <View style={styles.card}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { paddingBottom: 66, paddingHorizontal: 24, alignItems: "center" },
  back: { position: "absolute", left: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center", zIndex: 2 },
  language: { position: "absolute", right: 18, zIndex: 2 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: "#fff", marginTop: 16, textAlign: "center", letterSpacing: -0.4 },
  subtitle: { fontFamily: fonts.medium, fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8, textAlign: "center", lineHeight: 21 },
  card: { backgroundColor: colors.card, marginHorizontal: 20, marginTop: -42, padding: 22, borderRadius: radius.xl, gap: 16, ...shadow.md },
  footer: { marginTop: 22, paddingHorizontal: 24 },
});
