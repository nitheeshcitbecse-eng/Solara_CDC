import React, { useState, useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import Text from "../Components/Text";
import AuthLayout from "../Components/AuthLayout";
import Input from "../Components/Input";
import Button from "../Components/Button";
import { AuthContext } from "../context/AuthContext";
import colors from "../colors";
import { fonts } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!identifier || !password) return setMessage("Please fill all fields");
    setLoading(true);
    try {
      const res = await login(identifier.trim(), password);
      setMessage(res.message || "");
    } catch {
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in with your mobile number or email"
      onBack={() => navigation.goBack()}
      footer={
        <Pressable onPress={() => navigation.navigate("Home")}>
          <Text style={styles.footer}>
            New to Solara? <Text style={styles.footerLink}>Create an account</Text>
          </Text>
        </Pressable>
      }
    >
      {/* Form */}
      <Input label="Mobile number or email" icon="person-outline" placeholder="9876543210 or you@email.com" keyboardType="email-address" value={identifier} onChangeText={setIdentifier} />
      <Input label="Password" icon="lock-outline" placeholder="Your password" secure value={password} onChangeText={setPassword} />

      <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotRow} hitSlop={8}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* Login Button */}
      <Button title="Login" icon="login" onPress={handleLogin} loading={loading} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignSelf: "flex-end", marginTop: -6 },
  forgot: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 14 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, fontSize: 14 },
  footer: { fontFamily: fonts.medium, textAlign: "center", color: colors.muted, fontSize: 15 },
  footerLink: { fontFamily: fonts.bold, color: colors.primary },
});
