import React, { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import Button from "./Button";
import colors from "../colors";
import { fonts } from "../theme";

export default function NoInternetScreen({ visible }) {
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await NetInfo.refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="wifi-off" size={44} color={colors.primary} />
        </View>
        <Text style={styles.title}>{"You're offline"}</Text>
        <Text style={styles.subtitle}>{"Check your mobile data or Wi-Fi. We'll reconnect automatically."}</Text>

        {/* Retry Button */}
        <Button title="Try Again" icon="refresh" onPress={handleRetry} loading={checking} style={{ marginTop: 28 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primarySoft, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading, marginTop: 22 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 22 },
});
