import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import Avatar from "../../../Components/Avatar";
import StatusBadge from "../../../Components/StatusBadge";
import TierBadge from "../../../Components/TierBadge";
import InfoRow from "../../../Components/InfoRow";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import ConfirmModal from "../../../Components/ConfirmModal";
import ReportModal from "../../../Components/ReportModal";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import { rupees } from "../../../lib/formatSalary";
import { formatDate } from "../../../lib/formatTimeStamp";
import { NOTICE_PERIODS } from "../../../lib/premiumForms";
import tierTheme from "../../../lib/tierTheme";

const ACTIONS = {
  shortlisted: { label: "Shortlist", icon: "star-outline", variant: "secondary", confirm: "Shortlist this applicant?" },
  hired: { label: "Hire", icon: "check-circle-outline", variant: "success", confirm: "Hire this applicant?" },
  rejected: { label: "Reject", icon: "close", variant: "danger", confirm: "Reject this applicant?" },
};

const NEXT_STATUSES = {
  applied: ["shortlisted", "hired", "rejected"],
  shortlisted: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

// Premium contact approval states, as the hirer sees them.
const CONTACT_STATES = {
  none: { icon: "lock", tone: colors.muted, soft: colors.neutralSoft, title: "Contact details locked", text: "Shortlist this professional to request their phone and email. Solara verifies every premium shortlist before sharing." },
  pending: { icon: "hourglass-top", tone: colors.warning, soft: colors.warningSoft, title: "Waiting for Solara approval", text: "We're checking this shortlist. You'll get a notification when the contact details are unlocked." },
  rejected: { icon: "gpp-bad", tone: colors.error, soft: colors.errorSoft, title: "Not approved", text: "Solara did not approve sharing this candidate's details." },
};

export default function ApplicantDetailsScreen({ navigation, route }) {
  const { applicationId } = route.params;
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const { data } = await api.get(`/applications/get-application/${applicationId}`);
        if (data.success) setApplication(data.application);
      } catch (err) {
        setMessage(err.response?.data?.message || "Could not load this applicant");
        console.log("Fetch Applicant Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchApplication();
  }, [applicationId]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const { data } = await api.put(`/applications/update-status/${applicationId}`, { status: pendingStatus });
      if (data.success) {
        setApplication(data.application);
        setPendingStatus(null);
        showAlert(data.message);
      }
    } catch (err) {
      setPendingStatus(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Update Status Error:", err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMessage = async () => {
    setOpening(true);
    try {
      const { data } = await api.post(`/messages/open-conversation/${applicationId}`);
      if (data.success) {
        navigation.navigate("ChatScreen", { conversationId: data.conversation.id, title: data.conversation.otherUser.name });
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not open the chat");
      console.log("Open Conversation Error:", err.message);
    } finally {
      setOpening(false);
    }
  };

  const handleReport = async ({ reason, details }) => {
    setReporting(true);
    try {
      const { data } = await api.post("/support/add-report", { targetType: "user", targetId: application.seeker.id, reason, details });
      if (data.success) {
        setReportVisible(false);
        showAlert(data.message);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not send the report");
      console.log("Report User Error:", err.message);
    } finally {
      setReporting(false);
    }
  };

  if (loading || !application) {
    return (
      <Screen title="Applicant" onBack={() => navigation.goBack()}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : <EmptyState icon="person-off" title="Applicant not found" message={message} />}
      </Screen>
    );
  }

  const seeker = application.seeker;
  const details = seeker.details || {};
  const premium = application.contactStatus !== null && application.contactStatus !== undefined;
  const theme = tierTheme(seeker.tier);
  const contactState = premium && application.contactStatus !== "approved" ? CONTACT_STATES[application.contactStatus] : null;

  return (
    <Screen
      title="Applicant"
      subtitle={application.job.title}
      onBack={() => navigation.goBack()}
      right={
        <Pressable onPress={() => setReportVisible(true)} hitSlop={10} style={styles.flag}>
          <MaterialIcons name="outlined-flag" size={22} color={colors.error} />
        </Pressable>
      }
      footer={
        NEXT_STATUSES[application.status].length ? (
          <View style={styles.actions}>
            {NEXT_STATUSES[application.status].map((status) => (
              <Button
                key={status}
                title={ACTIONS[status].label}
                icon={ACTIONS[status].icon}
                variant={ACTIONS[status].variant}
                size="md"
                onPress={() => setPendingStatus(status)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        ) : null
      }
    >
      {/* Identity */}
      <Card style={styles.identity}>
        <Avatar userId={seeker.id} name={seeker.name} hasPhoto={seeker.hasPhoto} size={84} color={theme.accent} background={theme.accentSoft} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{seeker.name}</Text>
          {seeker.verified ? <MaterialIcons name="verified" size={20} color={theme.accent} /> : null}
        </View>
        {premium && details.profession ? <Text style={styles.headline}>{[details.profession, details.specialization].filter(Boolean).join(" · ")}</Text> : null}
        <View style={styles.badgeRow}>
          <TierBadge tier={seeker.tier} />
          <StatusBadge status={application.status} />
        </View>
        {!seeker.verified ? <Text style={styles.unverified}>Aadhaar not verified yet</Text> : null}
      </Card>

      {/* Contact */}
      {contactState ? (
        <View style={[styles.contactLocked, { backgroundColor: contactState.soft }]}>
          <MaterialIcons name={contactState.icon} size={24} color={contactState.tone} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>{contactState.title}</Text>
            <Text style={styles.contactText}>{application.contactStatus === "rejected" && application.contactNote ? `Reason: ${application.contactNote}` : contactState.text}</Text>
          </View>
        </View>
      ) : (
        <Card title="Contact" right={premium ? <StatusBadge status="approved" label="Unlocked" /> : null}>
          <InfoRow icon="phone-iphone" label="Phone" text={seeker.phone || "Not shared — use messages"} />
          {seeker.email ? <InfoRow icon="mail-outline" label="Email" text={seeker.email} /> : null}
          <View style={styles.contactButtons}>
            {seeker.phone ? (
              <Button title="Call" icon="call" variant="success" size="md" onPress={() => Linking.openURL(`tel:${seeker.phone}`)} style={{ flex: 1 }} />
            ) : null}
            {seeker.email ? (
              <Button title="Email" icon="mail-outline" variant="secondary" size="md" onPress={() => Linking.openURL(`mailto:${seeker.email}`)} style={{ flex: 1 }} />
            ) : null}
            <Button title="Message" icon="chat-bubble-outline" variant="outline" size="md" onPress={handleMessage} loading={opening} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Premium profile */}
      {premium ? (
        <Card title="Qualifications">
          <InfoRow icon="school" label="Qualification" text={details.qualification} />
          <InfoRow icon="account-balance" label="Institution" text={[details.institution, details.graduationYear].filter(Boolean).join(", ")} />
          <InfoRow icon="verified" label="Registration no." text={details.licenseNumber} />
          <InfoRow icon="business" label="Current role" text={[details.currentDesignation, details.currentEmployer].filter(Boolean).join(" at ")} />
          <InfoRow icon="translate" label="Languages" text={(details.languages || []).join(", ")} />
          <InfoRow icon="schedule" label="Notice period" text={details.noticePeriod ? NOTICE_PERIODS.find((item) => item.value === details.noticePeriod)?.label : null} />
          <InfoRow icon="link" label="LinkedIn / portfolio" text={details.linkedinUrl} />
        </Card>
      ) : null}

      <Card title="Profile">
        <InfoRow icon="place" label="City" text={seeker.city || "Not added"} />
        <InfoRow icon="timeline" label="Experience" text={seeker.experienceYears !== null ? `${seeker.experienceYears} years` : null} />
        {seeker.skills.length ? (
          <View style={styles.tags}>
            {seeker.skills.map((skill) => (
              <View key={skill} style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.tagText, { color: theme.accentDark }]}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <InfoRow icon="notes" label="About" text={seeker.about} />
      </Card>

      <Card title="Application">
        <Text style={styles.coverMessage}>{application.message}</Text>
        <InfoRow icon="payments" label="Expected salary" text={application.expectedSalary ? rupees(application.expectedSalary) : null} />
        <InfoRow icon="event-available" label="Can start" text={application.availableFrom ? formatDate(application.availableFrom) : null} />
        <InfoRow icon="event" label="Applied on" text={formatDate(application.createdAt)} />
      </Card>

      <ConfirmModal
        visible={Boolean(pendingStatus)}
        title={pendingStatus ? ACTIONS[pendingStatus].confirm : ""}
        message={
          premium && pendingStatus && pendingStatus !== "rejected" && application.contactStatus === "none"
            ? "The applicant will be notified. Solara will verify this shortlist before sharing their contact details."
            : "The applicant will be notified."
        }
        confirmText={pendingStatus ? ACTIONS[pendingStatus].label : ""}
        danger={pendingStatus === "rejected"}
        loading={updating}
        onConfirm={handleUpdateStatus}
        onCancel={() => setPendingStatus(null)}
      />
      <ReportModal visible={reportVisible} title="Report this applicant" loading={reporting} onSubmit={handleReport} onCancel={() => setReportVisible(false)} />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.errorSoft, justifyContent: "center", alignItems: "center" },
  actions: { flexDirection: "row", gap: 8 },
  identity: { alignItems: "center", gap: 8, paddingVertical: 22 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  name: { fontFamily: fonts.extrabold, fontSize: 21, color: colors.heading },
  headline: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  unverified: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.warning },
  contactLocked: { flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.lg, marginBottom: 14, alignItems: "flex-start" },
  contactTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  contactText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.body, marginTop: 3, lineHeight: 19 },
  contactButtons: { flexDirection: "row", gap: 8, marginTop: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  tagText: { fontFamily: fonts.semibold, fontSize: 13 },
  coverMessage: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.body, lineHeight: 22 },
});
