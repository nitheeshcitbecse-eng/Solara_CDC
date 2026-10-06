import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import Input from "../../../Components/Input";
import Button from "../../../Components/Button";
import ChipGroup from "../../../Components/ChipGroup";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import useTheme from "../../../lib/useTheme";

const TIERS = [
  { label: "Normal · daily work", value: "normal" },
  { label: "Premium · professionals", value: "premium" },
];

const ICONS = [
  "work", "restaurant", "cleaning-services", "directions-car", "school", "elderly",
  "child-care", "local-shipping", "construction", "yard", "security", "store",
  "local-hospital", "plumbing", "electrical-services", "checkroom",
  "engineering", "computer", "account-balance", "gavel", "medication", "science",
];

export default function AddSectorScreen({ navigation }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("work");
  const [tier, setTier] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleAddSector = async () => {
    if (name.trim().length < 2) return setMessage("Enter a sector name");
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/sectors/add-sector", { name: name.trim(), icon, tier });
      if (data.success) {
        setAlertMessage(data.message);
        setAlertVisible(true);
        setName("");
        setIcon("work");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
      console.log("Add Sector Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Add Sector"
      onBack={() => navigation.goBack()}
      footer={
        <>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button title="Add Sector" icon="add" onPress={handleAddSector} loading={loading} />
        </>
      }
    >
      {/* Preview */}
      <View style={[styles.preview, { backgroundColor: theme.accentSoft }]}>
        <View style={styles.previewIcon}>
          <MaterialIcons name={icon} size={30} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.previewName}>{name.trim() || "Sector name"}</Text>
          <Text style={styles.previewTier}>{tier === "premium" ? "Premium · professionals" : "Normal · daily work"}</Text>
        </View>
      </View>

      <Card>
        <Input label="Sector name" icon="category" placeholder="e.g. Gardening" autoCapitalize="words" maxLength={50} value={name} onChangeText={setName} />
        <Text style={styles.label}>For</Text>
        <ChipGroup wrap options={TIERS} selected={tier} onSelect={setTier} />
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((item) => {
            const active = icon === item;
            return (
              <Pressable key={item} style={[styles.iconBox, active && { backgroundColor: theme.button, borderColor: theme.button }]} onPress={() => setIcon(item)}>
                <MaterialIcons name={item} size={24} color={active ? "#fff" : colors.body} />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Alert visible={alertVisible} tone="success" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, marginBottom: 14 },
  previewIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  previewName: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  previewTier: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginTop: 18, marginBottom: 8 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconBox: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", backgroundColor: colors.card },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 10, fontSize: 14 },
});
