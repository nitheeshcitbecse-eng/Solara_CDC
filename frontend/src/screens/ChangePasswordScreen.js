import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../Components/Screen";
import Card from "../Components/Card";
import Input from "../Components/Input";
import Button from "../Components/Button";
import Alert from "../Components/Alert";
import api from "../api/api";
import { saveToken } from "../utils/storage";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";

export default function ChangePasswordScreen({ navigation }) {
  const theme = useTheme();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) return setMessage("Please fill all fields");
    if (newPassword.length < 8) return setMessage("New password must be at least 8 characters");
    if (newPassword !== confirmPassword) return setMessage("Passwords do not match");

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.put("/auth/change-password", { oldPassword, newPassword });
      if (data.success) {
        // Other devices are signed out; this device keeps working with the fresh token.
        if (data.token) await saveToken(data.token);
        setAlertMessage(data.message);
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not change your password");
      console.log("Change Password Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Change Password" onBack={() => navigation.goBack()}>
      {/* Info */}
      <View style={[styles.info, { backgroundColor: theme.accentSoft }]}>
        <MaterialIcons name="shield" size={22} color={theme.accent} />
        <Text style={styles.infoText}>Use at least 8 characters. All your other devices will be logged out.</Text>
      </View>

      {/* Form */}
      <Card>
        <View style={styles.stack}>
          <Input label="Current password" icon="lock-outline" placeholder="Your current password" secure value={oldPassword} onChangeText={setOldPassword} />
          <Input label="New password" icon="lock-open" placeholder="At least 8 characters" secure value={newPassword} onChangeText={setNewPassword} />
          <Input label="Confirm new password" icon="lock-open" placeholder="Type it again" secure value={confirmPassword} onChangeText={setConfirmPassword} />

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Submit Button */}
          <Button title="Update Password" icon="check" onPress={handleChange} loading={loading} />
        </View>
      </Card>

      <Alert
        visible={alertVisible}
        tone="success"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, marginBottom: 14 },
  infoText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.body, lineHeight: 19 },
  stack: { gap: 16 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, fontSize: 14 },
});
