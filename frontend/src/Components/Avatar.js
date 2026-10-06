import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";
import { apiUrl } from "../lib/fileUrl";
import { getToken } from "../utils/storage";

// Shows a user's profile photo (fetched with the login token) or their initial.
// Pass `version` to force a reload after the photo changes.
export default function Avatar({ userId, name, hasPhoto, size = 64, color = colors.primary, background = colors.onPrimarySoft, version }) {
  const [token, setToken] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (hasPhoto) {
      getToken().then((value) => {
        if (active) setToken(value);
      });
    }
    setFailed(false);
    return () => {
      active = false;
    };
  }, [hasPhoto, userId, version]);

  const box = { width: size, height: size, borderRadius: size / 2 };

  if (hasPhoto && token && !failed) {
    return (
      <Image
        source={{ uri: apiUrl(`/users/get-photo/${userId}${version ? `?v=${version}` : ""}`), headers: { Authorization: `Bearer ${token}` } }}
        style={[box, styles.photo]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[box, styles.fallback, { backgroundColor: background }]}>
      <Text style={[styles.initial, { color, fontSize: size * 0.42 }]}>{(name || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.neutralSoft },
  fallback: { justifyContent: "center", alignItems: "center" },
  initial: { fontFamily: fonts.extrabold },
});
