import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius } from "../theme";

// One photo field: preview + "Camera" / "Gallery" buttons.
// `picker` is the object returned by useImagePreview({ max: 1 }).
export default function ImagePickerField({ label, hint, picker, selfie = false, round = false, accent = colors.primary, done = false }) {
  const image = picker.images[0];
  const ready = Boolean(image) || done;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        {ready ? (
          <View style={styles.donePill}>
            <MaterialIcons name="check-circle" size={15} color={colors.success} />
            <Text style={styles.doneText}>{image ? "Added" : "Uploaded"}</Text>
          </View>
        ) : null}
      </View>

      {/* Preview */}
      {image ? (
        <Image source={{ uri: image.uri }} style={round ? styles.round : styles.preview} resizeMode="cover" />
      ) : (
        <Pressable
          onPress={() => picker.takePhoto({ front: selfie })}
          style={[round ? styles.round : styles.preview, styles.empty, { borderColor: `${accent}55` }]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: `${accent}14` }]}>
            <MaterialIcons name={selfie ? "face" : "badge"} size={30} color={accent} />
          </View>
          {!round ? <Text style={[styles.emptyText, { color: accent }]}>{done ? "Tap to replace" : "Tap to take a photo"}</Text> : null}
        </Pressable>
      )}

      {/* Buttons */}
      <View style={styles.buttons}>
        <Pressable style={[styles.button, { borderColor: accent }]} onPress={() => picker.takePhoto({ front: selfie })}>
          <MaterialIcons name="photo-camera" size={19} color={accent} />
          <Text style={[styles.buttonText, { color: accent }]}>{image ? "Retake" : "Camera"}</Text>
        </Pressable>
        <Pressable style={[styles.button, { borderColor: accent }]} onPress={picker.pickImages}>
          <MaterialIcons name="photo-library" size={19} color={accent} />
          <Text style={[styles.buttonText, { color: accent }]}>Gallery</Text>
        </Pressable>
      </View>
      {picker.error ? <Text style={styles.error}>{picker.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 20 },
  labelRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  donePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  doneText: { fontFamily: fonts.bold, fontSize: 11, color: colors.success },
  preview: { width: "100%", height: 180, borderRadius: radius.lg, marginTop: 12, backgroundColor: colors.neutralSoft },
  round: { width: 140, height: 140, borderRadius: 70, alignSelf: "center", marginTop: 12, backgroundColor: colors.neutralSoft },
  empty: { justifyContent: "center", alignItems: "center", borderWidth: 2, borderStyle: "dashed", backgroundColor: colors.background },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  emptyText: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 8 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 12 },
  button: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5 },
  buttonText: { fontFamily: fonts.bold, fontSize: 14 },
  error: { fontFamily: fonts.medium, color: colors.error, fontSize: 12, marginTop: 6 },
});
