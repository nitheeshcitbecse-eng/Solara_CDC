import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Modal } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import Button from "./Button";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import useTheme from "../lib/useTheme";

// Custom popup (never React Native's Alert.alert). Optional tone: "info" | "success" | "error".
export default function Alert({ visible, message, onClose, title, tone = "info" }) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const icon = { info: "info-outline", success: "check-circle-outline", error: "error-outline" }[tone];
  const tint = tone === "error" ? colors.error : tone === "success" ? colors.success : theme.accent;
  const soft = tone === "error" ? colors.errorSoft : tone === "success" ? colors.successSoft : theme.accentSoft;

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <View style={[styles.iconCircle, { backgroundColor: soft }]}>
            <MaterialIcons name={icon} size={30} color={tint} />
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.alertText}>{message}</Text>
          <Button title="OK" onPress={onClose} size="md" />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(28,20,14,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  alertBox: { width: "100%", maxWidth: 380, backgroundColor: colors.card, padding: 24, borderRadius: radius.xl, alignItems: "center", ...shadow.lg },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading, textAlign: "center", marginBottom: 6 },
  alertText: { fontFamily: fonts.medium, fontSize: 15, color: colors.body, textAlign: "center", lineHeight: 22, marginBottom: 22 },
});
