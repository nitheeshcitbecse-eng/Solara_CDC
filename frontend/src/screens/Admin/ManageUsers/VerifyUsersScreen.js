import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../Components/Screen";
import Avatar from "../../../Components/Avatar";
import TierBadge from "../../../Components/TierBadge";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius, shadow } from "../../../theme";
import { timeAgo } from "../../../lib/formatTimeStamp";
import tierTheme from "../../../lib/tierTheme";

export default function VerifyUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchPending = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/get-pending-verifications");
      if (data.success) {
        setUsers(data.users);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load verification requests");
      console.log("Fetch Pending Verifications Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload after returning from a decision so verified users drop off the list.
  useFocusEffect(
    useCallback(() => {
      fetchPending();
    }, [fetchPending])
  );

  return (
    <Screen title="Verify Users" subtitle={loading ? undefined : `${users.length} waiting`} onBack={() => navigation.goBack()}>
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState icon="verified-user" title="All caught up" message="Nobody is waiting for Aadhaar verification." />
      ) : (
        users.map((user) => {
          const theme = tierTheme(user.tier);
          return (
            <Pressable
              key={user.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
              onPress={() => navigation.navigate("UserDetailsScreen", { userId: user.id })}
            >
              <Avatar userId={user.id} name={user.name} hasPhoto={user.hasPhoto} size={50} color={theme.accent} background={theme.accentSoft} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{user.businessName || user.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {user.role === "hirer" ? "Hirer" : "Worker"}
                  {user.aadhaarLast4 ? ` · Aadhaar •••• ${user.aadhaarLast4}` : ""} · {timeAgo(user.createdAt)}
                </Text>
                <View style={{ marginTop: 6 }}>
                  <TierBadge tier={user.tier} />
                </View>
              </View>
              <View style={[styles.review, { backgroundColor: colors.adminGreenSoft }]}>
                <Text style={styles.reviewText}>Review</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.adminGreen} />
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  review: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingLeft: 10, paddingRight: 4, borderRadius: 999 },
  reviewText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.adminGreen },
});
