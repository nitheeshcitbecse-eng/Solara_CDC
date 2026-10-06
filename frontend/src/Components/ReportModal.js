import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "./Button";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import { useTranslated } from "../context/LanguageContext";

const REASONS = [
  { value: "fraud", label: "Fraud or scam", icon: "gpp-bad" },
  { value: "unsafe", label: "Unsafe workplace", icon: "health-and-safety" },
  { value: "inappropriate", label: "Inappropriate behaviour", icon: "do-not-disturb-on" },
  { value: "misleading", label: "Misleading details", icon: "report-gmailerrorred" },
  { value: "other", label: "Something else", icon: "more-horiz" },
];

// Asks for a reason and optional details; onSubmit receives { reason, details }.
export default function ReportModal({ visible, title = "Report", loading = false, onSubmit, onCancel }) {
  const [reason, setReason] = useState("fraud");
  const [details, setDetails] = useState("");
  const detailsPlaceholder = useTranslated("Add details (optional)");

  useEffect(() => {
    if (visible) {
      setReason("fraud");
      setDetails("");
    }
  }, [visible]);

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Your report is confidential.</Text>

          {/* Reasons */}
          {REASONS.map((item) => {
            const active = reason === item.value;
            return (
              <Pressable key={item.value} style={[styles.option, active && styles.optionActive]} onPress={() => setReason(item.value)}>
                <MaterialIcons name={item.icon} size={20} color={active ? colors.error : colors.muted} />
                <Text style={[styles.optionText, active && { color: colors.heading }]}>{item.label}</Text>
                <MaterialIcons name={active ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={active ? colors.error : colors.subtle} />
              </Pressable>
            );
          })}

          <TextInput
            style={styles.input}
            placeholder={detailsPlaceholder}
            placeholderTextColor={colors.subtle}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button title="Cancel" variant="secondary" size="md" onPress={onCancel} disabled={loading} style={{ flex: 1 }} />
            <Button title="Send Report" variant="danger" size="md" loading={loading} onPress={() => onSubmit({ reason, details: details.trim() })} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(28,20,14,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  box: { width: "100%", maxWidth: 420, backgroundColor: colors.card, padding: 22, borderRadius: radius.xl, ...shadow.lg },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, marginBottom: 8 },
  optionActive: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  optionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.body },
  input: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.md, padding: 12, minHeight: 80, fontFamily: fonts.medium, fontSize: 14, color: colors.heading, marginTop: 6 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 18 },
});
