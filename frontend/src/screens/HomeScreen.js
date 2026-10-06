import React from "react";
import { ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../Components/Text";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "../Components/Logo";
import LanguagePicker from "../Components/LanguagePicker";
import { fonts } from "../theme";
import colors from "../colors";

const wallpaper = require("../../assets/images/landing.jpg");

const FEATURES = [
  { icon: "shield-checkmark-outline", text: "Every hirer is verified with Aadhaar" },
  { icon: "hammer-outline", text: "Daily work: construction, house help, driving" },
  { icon: "medkit-outline", text: "Professionals: doctors, engineers, teachers" },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={wallpaper} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      {/* Darken the photo so the text stays readable */}
      <LinearGradient colors={["rgba(28,20,14,0.25)", "rgba(28,20,14,0.55)", "rgba(28,20,14,0.92)"]} style={{ flex: 1 }}>
        <LanguagePicker light style={[styles.language, { top: insets.top + 12 }]} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 64 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Logo size={76} />
            <Text translate={false} style={styles.title}>Solara</Text>
            <Text style={styles.subtitle}>Safe, verified jobs near you</Text>
          </View>

          <View>
            {/* Features */}
            <View style={styles.features}>
              {FEATURES.map((feature) => (
                <View key={feature.icon} style={styles.featureRow}>
                  <Ionicons name={feature.icon} size={22} color="#fbbf24" />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("ChooseTier", { role: "seeker" })}>
              <Ionicons name="search" size={22} color={colors.primaryDark} />
              <Text style={styles.primaryButtonText}>Find Work</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("ChooseTier", { role: "hirer" })}>
              <Ionicons name="briefcase-outline" size={22} color="#fff" />
              <Text style={styles.secondaryButtonText}>I Want to Hire</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Login")} hitSlop={8}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginLink}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 25, paddingBottom: 30 },
  hero: { alignItems: "center" },
  language: { position: "absolute", right: 18, zIndex: 2 },
  title: { color: "#fff", fontSize: 42, fontFamily: fonts.extrabold, marginTop: 14, letterSpacing: 0.5 },
  subtitle: { fontFamily: fonts.medium, color: "#f5ede4", fontSize: 17, marginTop: 4 },
  features: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { flex: 1, fontFamily: fonts.medium, color: "#fff", fontSize: 15 },
  primaryButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: "#fff", paddingVertical: 15, borderRadius: 14 },
  primaryButtonText: { color: colors.primaryDark, fontSize: 18, fontFamily: fonts.bold, textAlign: "center" },
  secondaryButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#fff", paddingVertical: 15, borderRadius: 14, marginTop: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  secondaryButtonText: { color: "#fff", fontSize: 18, fontFamily: fonts.bold, textAlign: "center" },
  loginText: { fontFamily: fonts.medium, color: "#e7dccf", fontSize: 15, textAlign: "center", marginTop: 20 },
  loginLink: { color: "#fff", fontFamily: fonts.bold },
});
