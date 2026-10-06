import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import StatusBadge from "../../../Components/StatusBadge";
import Avatar from "../../../Components/Avatar";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius, shadow } from "../../../theme";
import { formatDate } from "../../../lib/formatTimeStamp";
import tierTheme from "../../../lib/tierTheme";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Banned", value: "banned" },
];

export default function ViewUsersScreen({ navigation, route }) {
  const { role, tier } = route.params;
  const theme = tierTheme(tier);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/get-all-users", { params: { role, tier } });
      if (data.success) {
        setUsers(data.users);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load users");
      console.log("Fetch Users Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [role, tier]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          (status === "all" || user.status === status) &&
          (user.name.toLowerCase().includes(term) ||
            (user.email || "").toLowerCase().includes(term) ||
            (user.phone || "").includes(term) ||
            (user.businessName || "").toLowerCase().includes(term))
      )
    );
  }, [search, status, users]);

  const title = `${tier === "premium" ? "Premium" : "Normal"} ${role === "hirer" ? "Hirers" : tier === "premium" ? "Professionals" : "Workers"}`;

  return (
    <Screen title={title} subtitle={loading ? undefined : `${users.length} total`} onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Name, email or phone" />
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon="people-outline" title="No one found" message="Try another search or filter." />
      ) : (
        filteredUsers.map((user) => (
          <Pressable
            key={user.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            onPress={() => navigation.navigate("UserDetailsScreen", { userId: user.id })}
          >
            <View style={styles.row}>
              <Avatar userId={user.id} name={user.name} hasPhoto={user.hasPhoto} size={48} color={theme.accent} background={theme.accentSoft} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{user.businessName || user.name}</Text>
                  {user.verificationStatus === "verified" ? <MaterialIcons name="verified" size={16} color={theme.accent} /> : null}
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {[user.details?.profession || (user.businessName ? user.name : null), user.city].filter(Boolean).join(" · ") || "No details yet"}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>{user.phone || user.email}</Text>
              </View>
              <View style={styles.right}>
                <StatusBadge status={user.status} />
                {user.verificationStatus === "pending" ? <StatusBadge status="pending" label="To verify" /> : null}
              </View>
            </View>
            <Text style={styles.joined}>Joined {formatDate(user.createdAt)}{user.onboarded ? "" : " · setup not finished"}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 6 },
  joined: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.subtle, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
});
