import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Header from "../Components/Header";
import Alert from "../Components/Alert";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius } from "../theme";
import formatTimeStamp from "../lib/formatTimeStamp";
import useTheme from "../lib/useTheme";
import { useTranslated } from "../context/LanguageContext";

const POLL_MS = 5000;

// "Today", "Yesterday" or the date, for day separators.
const dayLabel = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatTimeStamp(iso).split(",")[0];
};

const timeOnly = (iso) => formatTimeStamp(iso).split(", ")[1];

export default function ChatScreen({ navigation, route }) {
  const { conversationId, title } = route.params;
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const scrollRef = useRef(null);
  const messagePlaceholder = useTranslated("Type a message");

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/get-messages/${conversationId}`);
      if (data.success) {
        setMessages(data.messages);
        setJobTitle(data.conversation.jobTitle);
      }
    } catch (err) {
      console.log("Fetch Messages Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load once, then check for new messages every few seconds while the chat is open.
  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/send-message/${conversationId}`, { text: value });
      if (data.success) {
        setMessages((current) => [...current, data.message]);
        setText("");
      }
    } catch (err) {
      setAlertMessage(err.response?.data?.message || "Message not sent. Please try again.");
      setAlertVisible(true);
      console.log("Send Message Error:", err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior="padding">
      {/* Header */}
      <Header title={title || "Chat"} subtitle={jobTitle ? `About: ${jobTitle}` : undefined} onBack={() => navigation.goBack()} />

      {/* Messages */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="waving-hand" size={30} color={theme.accent} />
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptyText}>Keep it about the job. Never share bank details or pay anyone to get hired.</Text>
            </View>
          ) : (
            messages.map((item, index) => {
              const showDay = index === 0 || dayLabel(item.createdAt) !== dayLabel(messages[index - 1].createdAt);
              return (
                <View key={item.id}>
                  {showDay ? <Text style={styles.day}>{dayLabel(item.createdAt)}</Text> : null}
                  <View style={[styles.bubble, item.mine ? [styles.mine, { backgroundColor: theme.button }] : styles.theirs]}>
                    <Text style={[styles.bubbleText, item.mine && { color: "#fff" }]}>{item.text}</Text>
                    <Text style={[styles.time, item.mine && { color: "rgba(255,255,255,0.75)" }]}>{timeOnly(item.createdAt)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder={messagePlaceholder}
          placeholderTextColor={colors.subtle}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.send, { backgroundColor: theme.button }, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="send" size={20} color="#fff" />}
        </Pressable>
      </View>

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 16, gap: 6 },
  emptyBox: { alignItems: "center", marginTop: 50, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  emptyText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, textAlign: "center", lineHeight: 19 },
  day: { alignSelf: "center", fontFamily: fonts.semibold, fontSize: 11.5, color: colors.muted, backgroundColor: colors.card, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, marginVertical: 10, overflow: "hidden" },
  bubble: { maxWidth: "80%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, marginBottom: 2 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.divider },
  bubbleText: { fontFamily: fonts.medium, fontSize: 15, color: colors.heading, lineHeight: 21 },
  time: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.subtle, marginTop: 4, alignSelf: "flex-end" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.neutralSoft, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 11, fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  send: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
});
