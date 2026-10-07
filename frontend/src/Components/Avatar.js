import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";
import useAuthImage from "../lib/useAuthImage";

// Shows a user's profile photo (downloaded with the login token, see lib/useAuthImage) or their initial.
// Pass `version` to force a reload after the photo changes.
export default function Avatar({ userId, name, hasPhoto, size = 64, color = colors.primary, background = colors.onPrimarySoft, version }) {
  const { uri } = useAuthImage(`/users/get-photo/${userId}${version ? `?v=${version}` : ""}`, Boolean(hasPhoto && userId));
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[box, styles.photo]} />;
  }

  return (
    <View style={[box, styles.fallback, { backgroundColor: background }]}>
      <Text translate={false} style={[styles.initial, { color, fontSize: size * 0.42 }]}>{(name || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.neutralSoft },
  fallback: { justifyContent: "center", alignItems: "center" },
  initial: { fontFamily: fonts.extrabold },
});
