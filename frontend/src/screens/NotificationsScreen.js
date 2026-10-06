import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../Components/Screen";
import EmptyState from "../Components/EmptyState";
import LoadingState from "../Components/LoadingState";
import Alert from "../Components/Alert";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius } from "../theme";
import { timeAgo } from "../lib/formatTimeStamp";
import useTheme from "../lib/useTheme";

// Picks an icon from the notification title.
const iconFor = (title) => {
  const text = title.toLowerCase();
  if (text.includes("message")) return "chat-bubble-outline";
  if (text.includes("hired") || text.includes("congratulations")) return "celebration";
  if (text.includes("shortlist")) return "star-outline";
  if (text.includes("verif")) return "verified-user";
  if (text.includes("applicant")) return "person-add-alt";
  if (text.includes("reject") || text.includes("not selected") || text.includes("taken down")) return "error-outline";
  if (text.includes("unlock") || text.includes("contact")) return "lock-open";
  return "notifications-none";
};

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications/get-all-notifications");
      if (data.success) {
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not load notifications");
      console.log("Fetch Notifications Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const { data } = await api.put("/notifications/mark-all-read");
      if (data.success) {
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
        setUnread(0);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Mark Read Error:", err.message);
    }
  };

  return (
    <Screen
      title="Notifications"
      subtitle={unread ? `${unread} unread` : "You're all caught up"}
      onBack={() => navigation.goBack()}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchNotifications();
      }}
      right={
        unread ? (
          <Pressable onPress={handleMarkAllRead} hitSlop={10} style={[styles.markAll, { backgroundColor: theme.accentSoft }]}>
            <MaterialIcons name="done-all" size={20} color={theme.accent} />
          </Pressable>
        ) : null
      }
    >
      {loading ? (
        <LoadingState />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-none" title="No notifications yet" message="Updates about your jobs and applications will show up here." />
      ) : (
        notifications.map((item) => (
          <View key={item.id} style={[styles.card, !item.read && { borderColor: theme.accent, backgroundColor: "#fff" }]}>
            <View style={[styles.iconTile, { backgroundColor: item.read ? colors.neutralSoft : theme.accentSoft }]}>
              <MaterialIcons name={iconFor(item.title)} size={20} color={item.read ? colors.muted : theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, item.read && { fontFamily: fonts.semibold }]} numberOfLines={1}>{item.title}</Text>
                {!item.read ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        ))
      )}

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.divider },
  iconTile: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 14.5, color: colors.heading },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.body, marginTop: 3, lineHeight: 19 },
  time: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.subtle, marginTop: 6 },
});
