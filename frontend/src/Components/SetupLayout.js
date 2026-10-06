import React, { forwardRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import PhotoHero from "./PhotoHero";
import TierBadge from "./TierBadge";
import StepProgress from "./StepProgress";
import Button from "./Button";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import { heroImage } from "../lib/sectorImages";
import tierTheme from "../lib/tierTheme";

// Frame for the premium setup wizards: sunrise photo hero, step progress, form card, Back / Next.
const SetupLayout = forwardRef(function SetupLayout(
  { title, subtitle, steps, step, message, loading, onBack, onNext, nextLabel, onLogout, children },
  scrollRef
) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView ref={scrollRef} bottomOffset={28} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <PhotoHero source={heroImage("premium")} tint={tierTheme("premium").gradient} style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <TierBadge tier="premium" onDark />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </PhotoHero>

        {/* Form */}
        <View style={styles.card}>
          <StepProgress steps={steps} current={step} accent={colors.premiumGold} />
          {children}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Navigation Buttons */}
          <View style={styles.buttons}>
            {step > 0 ? <Button title="Back" variant="secondary" onPress={onBack} disabled={loading} style={{ flex: 1 }} /> : null}
            <Button title={nextLabel} iconRight="arrow-forward" onPress={onNext} loading={loading} style={{ flex: 2 }} />
          </View>
        </View>

        <Pressable onPress={onLogout} hitSlop={8}>
          <Text style={styles.logout}>Not you? Logout</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
});

export default SetupLayout;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.premiumIvory },
  hero: { paddingBottom: 52, paddingHorizontal: 24 },
  title: { fontFamily: fonts.extrabold, color: "#fff", fontSize: 26, lineHeight: 32, marginTop: 14, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.medium, color: colors.premiumGoldBright, fontSize: 14.5, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: colors.card, marginHorizontal: 20, marginTop: -30, padding: 20, borderRadius: radius.xl, ...shadow.md },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginTop: 16, fontSize: 14 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 24 },
  logout: { fontFamily: fonts.medium, textAlign: "center", color: colors.muted, fontSize: 14, marginTop: 20 },
});
