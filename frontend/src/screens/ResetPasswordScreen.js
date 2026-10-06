import React, { useState } from "react";
import { StyleSheet } from "react-native";
import Text from "../Components/Text";
import AuthLayout from "../Components/AuthLayout";
import Input from "../Components/Input";
import Button from "../Components/Button";
import Alert from "../Components/Alert";
import api from "../api/api";
import colors from "../colors";
import { fonts } from "../theme";

export default function ResetPasswordScreen({ navigation, route }) {
  const email = route.params?.email || "";
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleReset = async () => {
    if (!otp || !newPassword || !confirmPassword) return setMessage("Please fill all fields");
    if (!/^\d{6}$/.test(otp)) return setMessage("The code has 6 digits");
    if (newPassword.length < 8) return setMessage("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return setMessage("Passwords do not match");

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
      if (data.success) {
        setAlertMessage(data.message);
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not reset your password. Please try again.");
      console.log("Reset Password Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout title="Reset password" subtitle={`Enter the code sent to ${email || "your email"}`} onBack={() => navigation.goBack()}>
        {/* Form */}
        <Input
          label="6-digit code"
          icon="dialpad"
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/\D/g, ""))}
        />
        <Input label="New password" icon="lock-outline" placeholder="At least 8 characters" secure value={newPassword} onChangeText={setNewPassword} />
        <Input label="Confirm new password" icon="lock-outline" placeholder="Type it again" secure value={confirmPassword} onChangeText={setConfirmPassword} />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {/* Submit Button */}
        <Button title="Reset Password" icon="check" onPress={handleReset} loading={loading} />
      </AuthLayout>

      <Alert
        visible={alertVisible}
        tone="success"
        title="Password updated"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          navigation.navigate("Login");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, fontSize: 14 },
});
