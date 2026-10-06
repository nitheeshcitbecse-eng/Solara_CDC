import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, TextInput, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "./Button";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import useTheme from "../lib/useTheme";
import { useTranslated } from "../context/LanguageContext";

// Confirmation popup. Pass `inputPlaceholder` to also ask for a reason / note;
// onConfirm then receives the typed text.
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  loading = false,
  inputPlaceholder,
  icon,
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();
  const [text, setText] = useState("");
  const translatedPlaceholder = useTranslated(inputPlaceholder || null);

  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  const tint = danger ? colors.error : theme.accent;
  const soft = danger ? colors.errorSoft : theme.accentSoft;

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={[styles.iconCircle, { backgroundColor: soft }]}>
            <MaterialIcons name={icon || (danger ? "warning-amber" : "help-outline")} size={28} color={tint} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {inputPlaceholder ? (
            <TextInput
              style={styles.input}
              placeholder={translatedPlaceholder}
              placeholderTextColor={colors.subtle}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
          ) : null}

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button title="Cancel" variant="secondary" size="md" onPress={onCancel} disabled={loading} style={{ flex: 1 }} />
            <Button title={confirmText} variant={danger ? "danger" : "primary"} size="md" onPress={() => onConfirm(text.trim())} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(28,20,14,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  box: { width: "100%", maxWidth: 400, backgroundColor: colors.card, padding: 24, borderRadius: radius.xl, ...shadow.lg },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, textAlign: "center" },
  message: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, minHeight: 92, fontFamily: fonts.medium, fontSize: 15, color: colors.heading, marginTop: 16 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 22 },
});
