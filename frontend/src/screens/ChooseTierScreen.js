import React from "react";
import { ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../Components/Text";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../theme";
import colors from "../colors";

const normalPhoto = require("../../assets/images/tier-normal.jpg");
const premiumPhoto = require("../../assets/images/tier-premium.jpg");

const COPY = {
  seeker: {
    title: "What kind of work?",
    normal: { title: "Daily Work", text: "Construction, house help, cooking, driving, security", cta: "Quick sign-up · photo + Aadhaar" },
    premium: { title: "Professional", text: "Doctors, engineers, IT, teachers, finance, legal", cta: "Detailed professional profile" },
  },
  hirer: {
    title: "Who do you want to hire?",
    normal: { title: "Daily Workers", text: "Masons, helpers, house help, cooks, drivers", cta: "Quick sign-up · photo + Aadhaar" },
    premium: { title: "Professionals", text: "Doctors, nurses, engineers, developers, teachers", cta: "Organisation profile" },
  },
};

export default function ChooseTierScreen({ navigation, route }) {
  const role = route.params?.role || "seeker";
  const copy = COPY[role];
  const insets = useSafeAreaInsets();

  const open = (tier) => navigation.navigate("Register", { role, tier });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>Normal and Premium are separate: you only see people and jobs from your side.</Text>

        {/* Normal */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => open("normal")}>
          <ImageBackground source={normalPhoto} style={styles.card} imageStyle={styles.cardImage}>
            <LinearGradient colors={["rgba(60,24,8,0.05)", "rgba(60,24,8,0.92)"]} style={styles.cardOverlay}>
              <View style={[styles.pill, { backgroundColor: colors.primary }]}>
                <Ionicons name="hammer" size={14} color="#fff" />
                <Text style={styles.pillText}>NORMAL</Text>
              </View>
              <Text style={styles.cardTitle}>{copy.normal.title}</Text>
              <Text style={styles.cardText}>{copy.normal.text}</Text>
              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>{copy.normal.cta}</Text>
                <Ionicons name="arrow-forward-circle" size={30} color="#fff" />
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        {/* Premium */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => open("premium")}>
          <ImageBackground source={premiumPhoto} style={styles.card} imageStyle={[styles.cardImage, styles.portraitImage]}>
            <LinearGradient colors={["rgba(18,16,14,0.05)", "rgba(18,16,14,0.94)"]} style={styles.cardOverlay}>
              <View style={[styles.pill, { backgroundColor: colors.premiumGoldBright }]}>
                <Ionicons name="ribbon" size={14} color={colors.premiumInk} />
                <Text style={[styles.pillText, { color: colors.premiumInk }]}>PREMIUM</Text>
              </View>
              <Text style={styles.cardTitle}>{copy.premium.title}</Text>
              <Text style={styles.cardText}>{copy.premium.text}</Text>
              <View style={styles.ctaRow}>
                <Text style={[styles.ctaText, { color: colors.premiumGoldBright }]}>{copy.premium.cta}</Text>
                <Ionicons name="arrow-forward-circle" size={30} color={colors.premiumGoldBright} />
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  title: { fontSize: 28, fontFamily: fonts.extrabold, color: colors.heading, marginTop: 18 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  card: { height: 250, borderRadius: 22, overflow: "hidden", marginBottom: 18, elevation: 6, backgroundColor: colors.neutralSoft },
  cardImage: { borderRadius: 22 },
  // The doctor photo is portrait: anchor it to the top so the face stays in view.
  portraitImage: { height: 470, top: 0 },
  cardOverlay: { flex: 1, justifyContent: "flex-end", padding: 18 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  pillText: { color: "#fff", fontSize: 11, fontFamily: fonts.extrabold, letterSpacing: 0.5 },
  cardTitle: { color: "#fff", fontSize: 26, fontFamily: fonts.extrabold, marginTop: 8 },
  cardText: { fontFamily: fonts.medium, color: "#f5ede4", fontSize: 14, marginTop: 2 },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: fonts.bold },
});
