import React from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";
import useAuthImage from "../lib/useAuthImage";

// A private image from the API (e.g. an Aadhaar photo), loaded with the login token.
export default function AuthImage({ path, style, resizeMode = "contain" }) {
  const { uri, failed } = useAuthImage(path);

  if (uri) return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;

  return (
    <View style={[style, styles.placeholder]}>
      {failed ? (
        <>
          <MaterialIcons name="broken-image" size={28} color={colors.subtle} />
          <Text style={styles.text}>Could not load the image</Text>
        </>
      ) : (
        <ActivityIndicator color={colors.subtle} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: colors.neutralSoft },
  text: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
});
