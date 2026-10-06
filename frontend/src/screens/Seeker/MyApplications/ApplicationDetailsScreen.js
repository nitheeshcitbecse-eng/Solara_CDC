import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import JobCard from "../../../Components/JobCard";
import StatusBadge from "../../../Components/StatusBadge";
import InfoRow from "../../../Components/InfoRow";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import { rupees } from "../../../lib/formatSalary";
import { formatDate } from "../../../lib/formatTimeStamp";
import useTheme from "../../../lib/useTheme";

const STATUS_TEXT = {
  applied: "Your application has been sent. The hirer will review it soon.",
  shortlisted: "Good news! You have been shortlisted.",
  hired: "Congratulations, you are hired! Talk to the hirer about your start date.",
  rejected: "This application was not selected. Keep applying — new jobs are added every day.",
};

const STEPS = [
  { key: "applied", label: "Applied", icon: "send" },
  { key: "shortlisted", label: "Shortlisted", icon: "star" },
  { key: "hired", label: "Hired", icon: "verified" },
];

export default function ApplicationDetailsScreen({ navigation, route }) {
  const { applicationId } = route.params;
  const theme = useTheme();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const fetchApplication = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/get-application/${applicationId}`);
      if (data.success) setApplication(data.application);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load this application");
      console.log("Fetch Application Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useFocusEffect(
    useCallback(() => {
      fetchApplication();
    }, [fetchApplication])
  );

  const handleMessageHirer = async () => {
    setOpening(true);
    try {
      const { data } = await api.post(`/messages/open-conversation/${application.id}`);
      if (data.success) {
        navigation.navigate("ChatScreen", { conversationId: data.conversation.id, title: data.conversation.otherUser.name });
      }
    } catch (err) {
      setAlertMessage(err.response?.data?.message || "Could not open the chat");
      setAlertVisible(true);
      console.log("Open Conversation Error:", err.message);
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Application" onBack={() => navigation.goBack()}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (!application) {
    return (
      <Screen title="Application" onBack={() => navigation.goBack()}>
        <EmptyState icon="error-outline" title="Application not found" message={message} />
      </Screen>
    );
  }

  const currentStep = STEPS.findIndex((step) => step.key === application.status);
  const premium = application.contactStatus !== null && application.contactStatus !== undefined;

  // Premium: what the seeker sees about contact sharing.
  const contactInfo = {
    none: { icon: "lock", tone: colors.muted, soft: colors.neutralSoft, text: "Your phone and email are private. They are shared only after the recruiter shortlists you and Solara approves it." },
    pending: { icon: "hourglass-top", tone: colors.warning, soft: colors.warningSoft, text: "You've been shortlisted! Solara is verifying the shortlist before sharing your contact details and opening chat." },
    approved: { icon: "lock-open", tone: colors.success, soft: colors.successSoft, text: "Your contact details were shared with the recruiter. You can message them now." },
    rejected: { icon: "info-outline", tone: colors.error, soft: colors.errorSoft, text: "Solara did not approve sharing your contact details for this application." },
  }[application.contactStatus || "none"];

  return (
    <Screen
      title="Application"
      subtitle={application.job.title}
      onBack={() => navigation.goBack()}
      footer={
        application.canChat ? (
          <Button title="Message Hirer" icon="chat-bubble-outline" onPress={handleMessageHirer} loading={opening} />
        ) : (
          <Button title="Messaging opens after approval" icon="lock" variant="secondary" disabled />
        )
      }
    >
      {/* Status */}
      <Card>
        <View style={styles.statusRow}>
          <Text style={styles.cardTitle}>Status</Text>
          <StatusBadge status={application.status} />
        </View>
        {application.status !== "rejected" ? (
          <View style={styles.steps}>
            {STEPS.map((step, index) => {
              const done = index <= currentStep;
              return (
                <React.Fragment key={step.key}>
                  {index > 0 ? <View style={[styles.stepLine, { backgroundColor: done ? theme.accent : colors.border }]} /> : null}
                  <View style={styles.step}>
                    <View style={[styles.stepCircle, done && { backgroundColor: theme.button, borderColor: theme.button }]}>
                      <MaterialIcons name={step.icon} size={16} color={done ? "#fff" : colors.subtle} />
                    </View>
                    <Text style={[styles.stepText, done && { color: colors.heading }]}>{step.label}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        ) : null}
        <Text style={styles.statusText}>{STATUS_TEXT[application.status]}</Text>
      </Card>

      {/* Premium contact sharing */}
      {premium ? (
        <View style={[styles.contact, { backgroundColor: contactInfo.soft }]}>
          <MaterialIcons name={contactInfo.icon} size={22} color={contactInfo.tone} />
          <Text style={styles.contactText}>{contactInfo.text}</Text>
        </View>
      ) : null}

      {/* Job */}
      <JobCard job={application.job} onPress={() => navigation.navigate("JobDetailsScreen", { jobId: application.job.id })} />

      {/* What You Sent */}
      <Card title="Your application">
        <Text style={styles.coverMessage}>{application.message}</Text>
        <InfoRow icon="payments" label="Expected salary" text={application.expectedSalary ? rupees(application.expectedSalary) : null} />
        <InfoRow icon="event-available" label="Can start" text={application.availableFrom ? formatDate(application.availableFrom) : null} />
        {!premium ? <InfoRow icon="phone-iphone" label="Phone" text={application.sharePhone ? "Shared with hirer" : "Hidden"} /> : null}
        <InfoRow icon="event" label="Applied on" text={formatDate(application.createdAt)} />
      </Card>

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  steps: { flexDirection: "row", alignItems: "flex-start", marginTop: 18, marginBottom: 6 },
  step: { alignItems: "center", gap: 6, width: 72 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" },
  stepLine: { flex: 1, height: 2, marginTop: 16 },
  stepText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.subtle },
  statusText: { fontFamily: fonts.medium, fontSize: 14, color: colors.body, lineHeight: 21, marginTop: 10 },
  contact: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, marginBottom: 14, alignItems: "flex-start" },
  contactText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.body, lineHeight: 19 },
  coverMessage: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.body, lineHeight: 22 },
});
