import React, { useState, useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import AuthLayout from "../Components/AuthLayout";
import Input from "../Components/Input";
import Button from "../Components/Button";
import TierBadge from "../Components/TierBadge";
import { AuthContext } from "../context/AuthContext";
import colors from "../colors";
import { fonts, radius } from "../theme";
import tierTheme from "../lib/tierTheme";
import { heroImage } from "../lib/sectorImages";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

const TITLES = {
  seeker: { normal: "Find daily work", premium: "Join as a professional" },
  hirer: { normal: "Hire daily workers", premium: "Hire professionals" },
};

const NEXT_STEPS = {
  normal: ["Create your account", "Add your photo and Aadhaar", "Start finding work"],
  premium: ["Create your account", "Build your professional profile", "Verify your identity"],
};

export default function RegisterScreen({ navigation, route }) {
  const { register } = useContext(AuthContext);
  const role = route.params?.role || "seeker";
  const tier = route.params?.tier || "normal";
  const premium = tier === "premium";
  const theme = tierTheme(tier);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    if (!name || !phone || !password || !confirmPassword || (premium && !email)) return setMessage("Please fill all required fields");
    if (email && !EMAIL_PATTERN.test(email.trim())) return setMessage("Enter a valid email address");
    if (!PHONE_PATTERN.test(phone)) return setMessage("Enter a valid 10-digit mobile number");
    if (password.length < 8) return setMessage("Password must be at least 8 characters");
    if (password !== confirmPassword) return setMessage("Passwords do not match");

    setLoading(true);
    try {
      const res = await register({ name: name.trim(), email: email.trim() || null, phone, password, role, tier });
      setMessage(res.success ? "" : res.message || "");
    } catch {
      setMessage("Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      gradient={theme.gradient}
      image={heroImage(premium ? "premium" : "normal")}
      title={TITLES[role][tier]}
      badge={<TierBadge tier={tier} onDark />}
      onBack={() => navigation.goBack()}
      footer={
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={styles.footer}>
            Already have an account? <Text style={[styles.footerLink, { color: theme.accent }]}>Login</Text>
          </Text>
        </Pressable>
      }
    >
      {/* What happens next */}
      <View style={[styles.steps, { backgroundColor: theme.accentSoft }]}>
        {NEXT_STEPS[tier].map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: index === 0 ? theme.button : "transparent", borderColor: theme.button }]}>
              {index === 0 ? <MaterialIcons name="edit" size={11} color="#fff" /> : <Text style={[styles.stepNumber, { color: theme.button }]}>{index + 1}</Text>}
            </View>
            <Text style={[styles.stepText, index === 0 && { color: colors.heading, fontFamily: fonts.bold }]}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Form */}
      <Input label="Full name" icon="person-outline" placeholder="As on your Aadhaar" autoCapitalize="words" value={name} onChangeText={setName} />
      <Input
        label="Mobile number"
        icon="phone-iphone"
        prefix="+91"
        placeholder="10-digit number"
        keyboardType="phone-pad"
        maxLength={10}
        value={phone}
        onChangeText={(text) => setPhone(text.replace(/\D/g, ""))}
      />
      <Input
        label={premium ? (role === "hirer" ? "Work email" : "Email") : "Email (optional)"}
        icon="mail-outline"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        hint={!premium ? "Helps you reset your password later" : undefined}
      />
      <Input label="Password" icon="lock-outline" placeholder="At least 8 characters" secure value={password} onChangeText={setPassword} />
      <Input label="Confirm password" icon="lock-outline" placeholder="Type it again" secure value={confirmPassword} onChangeText={setConfirmPassword} />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* Submit Button */}
      <Button title="Create Account" iconRight="arrow-forward" onPress={handleRegister} loading={loading} style={{ backgroundColor: theme.button, borderColor: theme.button }} />
      <Text style={styles.terms}>By continuing you agree to use Solara responsibly. Never pay anyone to get a job.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  steps: { borderRadius: radius.md, padding: 14, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  stepNumber: { fontFamily: fonts.bold, fontSize: 10 },
  stepText: { fontFamily: fonts.medium, fontSize: 13, color: colors.body },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, fontSize: 14 },
  terms: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 17 },
  footer: { fontFamily: fonts.medium, textAlign: "center", color: colors.muted, fontSize: 15 },
  footerLink: { fontFamily: fonts.bold },
});
