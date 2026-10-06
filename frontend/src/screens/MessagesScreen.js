import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../Components/Screen";
import SearchBox from "../Components/SearchBox";
import Avatar from "../Components/Avatar";
import EmptyState from "../Components/EmptyState";
import LoadingState from "../Components/LoadingState";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius } from "../theme";
import { timeAgo } from "../lib/formatTimeStamp";
import useTheme from "../lib/useTheme";

export default function MessagesScreen({ navigation }) {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/messages/get-all-conversations");
      if (data.success) {
        setConversations(data.conversations);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load messages");
      console.log("Fetch Conversations Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when coming back from a chat so unread counts stay correct.
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredConversations(
      conversations.filter(
        (item) => item.otherUser.name.toLowerCase().includes(term) || item.jobTitle.toLowerCase().includes(term)
      )
    );
  }, [search, conversations]);

  return (
    <Screen title="Messages" onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search by name or job" />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredConversations.length === 0 ? (
        <EmptyState
          icon="forum"
          title={conversations.length === 0 ? "No conversations yet" : "No conversations found"}
          message={conversations.length === 0 ? "Open an application and tap Message to start a chat." : undefined}
        />
      ) : (
        <View style={styles.list}>
          {filteredConversations.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.row, index < filteredConversations.length - 1 && styles.divider, pressed && { opacity: 0.6 }]}
              onPress={() => navigation.navigate("ChatScreen", { conversationId: item.id, title: item.otherUser.name })}
            >
              <Avatar userId={item.otherUser.id} name={item.otherUser.name} hasPhoto={item.otherUser.hasPhoto} size={50} color={theme.accent} background={theme.accentSoft} />
              <View style={{ flex: 1 }}>
                <View style={styles.topRow}>
                  <Text style={styles.name} numberOfLines={1}>{item.otherUser.name}</Text>
                  <Text style={[styles.time, item.unread && { color: theme.accent }]}>{timeAgo(item.lastMessageAt)}</Text>
                </View>
                <Text style={[styles.job, { color: theme.accent }]} numberOfLines={1}>{item.jobTitle}</Text>
                <View style={styles.topRow}>
                  <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>
                    {item.lastMessage || "No messages yet"}
                  </Text>
                  {item.unread ? (
                    <View style={[styles.badge, { backgroundColor: theme.button }]}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.divider },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  time: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.subtle },
  job: { fontFamily: fonts.semibold, fontSize: 12, marginTop: 1 },
  preview: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, marginTop: 3 },
  previewUnread: { fontFamily: fonts.semibold, color: colors.heading },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontFamily: fonts.bold, fontSize: 11 },
});
