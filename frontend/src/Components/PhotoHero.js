import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Header with a real photo. The top stays close to the photo's own colours; the bottom fades into the
// darkest colour of `tint` (usually the user's theme gradient) so white text stays readable.
export default function PhotoHero({ source, tint, style, children, imageStyle }) {
  const shade = (tint && tint[2]) || "#1f1209";
  return (
    <ImageBackground source={source} style={[styles.hero, style]} imageStyle={[styles.image, imageStyle]} resizeMode="cover">
      <LinearGradient
        colors={["rgba(0,0,0,0.30)", "rgba(0,0,0,0.38)", `${shade}EB`]}
        locations={[0, 0.45, 1]}
        style={[StyleSheet.absoluteFill, styles.overlay]}
      />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" },
  image: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  overlay: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
});
