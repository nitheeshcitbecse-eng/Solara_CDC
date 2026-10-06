import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import { useTranslated } from "../context/LanguageContext";

export default function SearchBox({ value, onChangeText, placeholder = "Search" }) {
  const translatedPlaceholder = useTranslated(placeholder);
  return (
    <View style={styles.searchBox}>
      <MaterialIcons name="search" size={22} color={colors.subtle} />
      <TextInput
        style={styles.input}
        placeholder={translatedPlaceholder}
        placeholderTextColor={colors.subtle}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} style={styles.clear}>
          <MaterialIcons name="close" size={16} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 14, ...shadow.sm },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.heading, paddingVertical: 13, marginLeft: 10 },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutralSoft, justifyContent: "center", alignItems: "center" },
});
