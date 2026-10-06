import React from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";

// Horizontal row of image previews. Pass onRemove to show a remove button on each.
export default function PhotoStrip({ uris, onRemove, size = 96 }) {
  if (!uris || uris.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {uris.map((uri) => (
        <View key={uri}>
          <Image source={{ uri }} style={[styles.photo, { width: size, height: size }]} />
          {onRemove ? (
            <TouchableOpacity style={styles.remove} onPress={() => onRemove(uri)} hitSlop={8}>
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  photo: { borderRadius: 12, backgroundColor: colors.neutralSoft },
  remove: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
});
