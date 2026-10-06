import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../Components/Screen";
import Card from "../Components/Card";
import Input from "../Components/Input";
import Button from "../Components/Button";
import ChipGroup from "../Components/ChipGroup";
import SectionHeader from "../Components/SectionHeader";
import LoadingState from "../Components/LoadingState";
import Alert from "../Components/Alert";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";

const TOPICS = [
  { label: "Account", value: "account" },
  { label: "Jobs", value: "jobs" },
  { label: "Payments", value: "payments" },
  { label: "Safety", value: "safety" },
  { label: "Other", value: "other" },
];

export default function HelpScreen({ navigation }) {
  const theme = useTheme();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [topic, setTopic] = useState("account");
  const [ticketMessage, setTicketMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data } = await api.get("/support/get-all-faqs");
        if (data.success) setFaqs(data.faqs);
      } catch (err) {
        console.log("Fetch FAQs Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const handleSendTicket = async () => {
    if (ticketMessage.trim().length < 20) return setMessage("Please describe the problem in at least 20 characters");
    setSending(true);
    setMessage("");
    try {
      const { data } = await api.post("/support/add-ticket", { topic, message: ticketMessage.trim() });
      if (data.success) {
        setAlertMessage(data.message);
        setAlertVisible(true);
        setTicketMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
      console.log("Add Ticket Error:", err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Help & Support" onBack={() => navigation.goBack()}>
      {/* Safety banner */}
      <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
        <MaterialIcons name="health-and-safety" size={26} color={theme.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Solara is always free</Text>
          <Text style={styles.bannerText}>Never pay anyone to apply or get hired. Report such requests from the job page.</Text>
        </View>
      </View>

      {/* FAQs */}
      <SectionHeader title="Frequently asked questions" />
      {loading ? (
        <LoadingState count={2} />
      ) : (
        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const open = openId === faq.id;
            return (
              <Pressable key={faq.id} style={[styles.faq, index < faqs.length - 1 && styles.divider]} onPress={() => setOpenId(open ? null : faq.id)}>
                <View style={styles.faqRow}>
                  <Text style={styles.question}>{faq.question}</Text>
                  <MaterialIcons name={open ? "remove" : "add"} size={22} color={theme.accent} />
                </View>
                {open ? <Text style={styles.answer}>{faq.answer}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Contact Form */}
      <SectionHeader title="Still need help?" subtitle="We reply by email within 2 working days" style={{ marginTop: 22 }} />
      <Card>
        <Text style={styles.label}>Topic</Text>
        <ChipGroup wrap options={TOPICS} selected={topic} onSelect={setTopic} />
        <Input
          label="Message"
          icon="edit"
          placeholder="Tell us what went wrong"
          autoCapitalize="sentences"
          multiline
          maxLength={1000}
          value={ticketMessage}
          onChangeText={setTicketMessage}
          style={{ marginTop: 16 }}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button title="Send Message" icon="send" onPress={handleSendTicket} loading={sending} style={{ marginTop: 16 }} />
      </Card>

      <Alert visible={alertVisible} tone="success" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.lg, marginBottom: 18, alignItems: "center" },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  bannerText: { fontFamily: fonts.regular, fontSize: 13, color: colors.body, marginTop: 2, lineHeight: 18 },
  faqList: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.divider },
  faq: { paddingVertical: 15 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  faqRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  question: { flex: 1, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.heading },
  answer: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.body, marginTop: 8, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginBottom: 8 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginTop: 12, fontSize: 14 },
});
