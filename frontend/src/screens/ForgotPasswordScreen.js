import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import AuthLayout from "../Components/AuthLayout";
import Input from "../Components/Input";
import Button from "../Components/Button";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius } from "../theme";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSendOtp = async () => {
    if (!email) return setMessage("Please enter your email address");
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/auth/send-reset-otp", { email: email.trim() });
      if (data.success) {
        setSuccess(true);
        setMessage(data.message);
        timer.current = setTimeout(() => navigation.navigate("ResetPassword", { email: email.trim() }), 1500);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setSuccess(false);
      setMessage(err.response?.data?.message || "Could not send the code. Please try again.");
      console.log("Send Reset OTP Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot password?" subtitle={"We'll email you a 6-digit code to reset it"} onBack={() => navigation.goBack()}>
      {/* Form */}
      <Input label="Email address" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />

      {message ? <Text style={[styles.message, success && { color: colors.success }]}>{message}</Text> : null}

      {/* Submit Button */}
      <Button title="Send Code" icon="send" onPress={handleSendOtp} loading={loading} disabled={success} />

      <Pressable onPress={() => email && navigation.navigate("ResetPassword", { email: email.trim() })} hitSlop={8}>
        <Text style={styles.link}>I already have a code</Text>
      </Pressable>

      <View style={styles.note}>
        <MaterialIcons name="info-outline" size={18} color={colors.muted} />
        <Text style={styles.noteText}>
          Signed up with only a mobile number? Password reset needs an email. Contact Solara support, or add an email in your profile.
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, fontSize: 14 },
  link: { fontFamily: fonts.semibold, textAlign: "center", color: colors.primary, fontSize: 14 },
  note: { flexDirection: "row", gap: 10, backgroundColor: colors.neutralSoft, padding: 12, borderRadius: radius.md },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, lineHeight: 18 },
});
