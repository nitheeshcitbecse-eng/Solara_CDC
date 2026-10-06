import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "./Avatar";
import TierBadge from "./TierBadge";
import ListItem from "./ListItem";
import LanguagePicker from "./LanguagePicker";
import colors from "../colors";
import { fonts } from "../theme";
import { themeForUser } from "../lib/tierTheme";

const ROLE_LABELS = { seeker: "Job Seeker", hirer: "Hirer", admin: "Owner · Admin" };

const ITEMS = [
  { title: "My Profile", subtitle: "View and edit your details", icon: "person-outline", screen: "ProfileScreen" },
  { title: "Notifications", subtitle: "Updates on jobs and applications", icon: "notifications-none", screen: "NotificationsScreen" },
  { title: "Change Password", subtitle: "Keep your account secure", icon: "lock-outline", screen: "ChangePasswordScreen" },
  { title: "Help & Support", subtitle: "FAQs and contact us", icon: "help-outline", screen: "HelpScreen" },
];

export default function SidebarMenu({ visible, user, onClose, onNavigate, onLogout }) {
  const insets = useSafeAreaInsets();
  const theme = themeForUser(user);

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
          {/* Profile Header */}
          <LinearGradient colors={theme.gradient} style={[styles.header, { paddingTop: insets.top + 28 }]}>
            <Avatar userId={user?.id} name={user?.name} hasPhoto={user?.hasPhoto} size={68} background="#fff" color={theme.accent} />
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={[styles.role, { color: theme.onGradientSoft }]} numberOfLines={1}>
              {user?.role === "hirer" && user?.businessName ? user.businessName : ROLE_LABELS[user?.role] || ""}
            </Text>
            {user?.tier ? <View style={{ marginTop: 10 }}><TierBadge tier={user.tier} onDark /></View> : null}
          </LinearGradient>

          {/* Menu Items */}
          <View style={styles.items}>
            {ITEMS.map((item) => (
              <ListItem key={item.screen} icon={item.icon} title={item.title} subtitle={item.subtitle} onPress={() => onNavigate(item.screen)} />
            ))}
            <ListItem icon="logout" title="Logout" danger last onPress={onLogout} right={null} />
          </View>

          <View style={styles.language}>
            <Text style={styles.languageLabel}>App language</Text>
            <LanguagePicker />
          </View>

          <Text translate={false} style={styles.version}>Solara · v1.0</Text>
        </View>

        {/* Tap outside to close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(28,20,14,0.55)" },
  panel: { width: "82%", backgroundColor: colors.card, borderTopRightRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  header: { paddingBottom: 24, paddingHorizontal: 22 },
  name: { color: "#fff", fontFamily: fonts.bold, fontSize: 20, marginTop: 14 },
  role: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  items: { paddingHorizontal: 18, paddingTop: 8, flex: 1 },
  language: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 12 },
  languageLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.body },
  version: { fontFamily: fonts.medium, fontSize: 12, color: colors.subtle, textAlign: "center" },
});
