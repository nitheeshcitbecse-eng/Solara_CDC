import React from "react";
import { ActivityIndicator, Image, ImageBackground, StyleSheet } from "react-native";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";

const sunrise = require("../../assets/images/logo-sunrise.jpg");
const photo = require("../../assets/images/landing.jpg");

// Shown while fonts load and the saved session is checked, so it uses the system font.
export default function LoadingScreen() {
  return (
    <ImageBackground source={photo} style={styles.container} resizeMode="cover">
      <LinearGradient colors={["rgba(24,14,8,0.55)", "rgba(24,14,8,0.92)"]} style={styles.overlay}>
        <Image source={sunrise} style={styles.logo} />
        <Text translate={false} style={styles.title}>Solara</Text>
        <Text style={styles.subtitle}>Safe, verified jobs near you</Text>
        <ActivityIndicator size="small" color="#e8b64c" style={{ marginTop: 36 }} />
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: "rgba(232,182,76,0.6)" },
  title: { color: "#fff", fontSize: 34, fontWeight: "800", marginTop: 18, letterSpacing: 0.5 },
  subtitle: { color: "#fde3cf", fontSize: 15, marginTop: 4 },
});
