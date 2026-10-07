import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import Avatar from "../../../Components/Avatar";
import StatusBadge from "../../../Components/StatusBadge";
import TierBadge from "../../../Components/TierBadge";
import InfoRow from "../../../Components/InfoRow";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import ConfirmModal from "../../../Components/ConfirmModal";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import AuthImage from "../../../Components/AuthImage";
import { formatDate } from "../../../lib/formatTimeStamp";
import tierTheme from "../../../lib/tierTheme";

// Each action needs a reason (except verifying); the backend records it in the audit log.
const ACTIONS = {
  active: { label: "Activate", icon: "check-circle-outline", variant: "success", title: "Activate this account?" },
  suspended: { label: "Suspend", icon: "pause-circle-outline", variant: "secondary", title: "Suspend this account?" },
  banned: { label: "Ban", icon: "block", variant: "danger", title: "Ban this account?" },
  verified: { label: "Verify", icon: "verified-user", variant: "success", title: "Verify this user?" },
  rejected: { label: "Reject", icon: "close", variant: "danger", title: "Reject these documents?" },
};

// camelCase key → "Camel case"
const labelFor = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

export default function UserDetailsScreen({ navigation, route }) {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/admin/get-user/${userId}`);
        if (data.success) {
          setUser(data.user);
          setStats(data.stats);
        }
      } catch (err) {
        setMessage(err.response?.data?.message || "Could not load this user");
        console.log("Fetch User Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleConfirm = async (reason) => {
    const isVerification = action === "verified" || action === "rejected";
    if (action !== "verified" && reason.length < 5) {
      setAction(null);
      showAlert("Please give a reason of at least 5 characters.");
      return;
    }

    setSaving(true);
    try {
      const { data } = isVerification
        ? await api.put(`/admin/verify-user/${userId}`, { decision: action, reason: reason || null })
        : await api.put(`/admin/update-user-status/${userId}`, { status: action, reason });
      if (data.success) {
        setUser(data.user);
        setAction(null);
        showAlert(data.message);
      }
    } catch (err) {
      setAction(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("User Action Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <Screen title="User" onBack={() => navigation.goBack()}>
        {loading ? <ActivityIndicator size="large" color={colors.adminGreen} style={{ marginTop: 40 }} /> : <EmptyState icon="person-off" title="User not found" message={message} />}
      </Screen>
    );
  }

  const theme = tierTheme(user.tier);
  const statusActions = ["active", "suspended", "banned"].filter((status) => status !== user.status);
  const detailEntries = Object.entries(user.details || {});

  return (
    <Screen title={user.role === "hirer" ? "Hirer" : "Worker"} subtitle={`User #${user.id}`} onBack={() => navigation.goBack()}>
      {/* Identity */}
      <Card style={styles.identity}>
        <Avatar userId={user.id} name={user.name} hasPhoto={user.hasPhoto} size={88} color={theme.accent} background={theme.accentSoft} />
        <Text style={styles.name}>{user.businessName || user.name}</Text>
        <Text style={styles.role}>
          {user.businessName ? `${user.name} · ` : ""}
          {user.details?.profession || (user.role === "hirer" ? "Hirer" : "Job seeker")}
        </Text>
        <View style={styles.badgeRow}>
          <TierBadge tier={user.tier} />
          <StatusBadge status={user.status} />
          <StatusBadge status={user.verificationStatus} />
        </View>
        {user.statusReason && user.status !== "active" ? <Text style={styles.reason}>Reason: {user.statusReason}</Text> : null}
      </Card>

      {/* Details */}
      <Card title="Details">
        <InfoRow icon="phone-iphone" label="Phone" text={user.phone} />
        <InfoRow icon="mail-outline" label="Email" text={user.email} />
        <InfoRow icon="place" label="City" text={user.city} />
        <InfoRow icon="build" label="Skills" text={user.skills.length ? user.skills.join(", ") : null} />
        <InfoRow icon="timeline" label="Experience" text={user.experienceYears !== null ? `${user.experienceYears} years` : null} />
        <InfoRow icon="notes" label="About" text={user.about} />
        <InfoRow icon="event" label="Joined" text={`${formatDate(user.createdAt)}${user.onboarded ? "" : " · setup not finished"}`} />
        {stats?.jobs !== undefined ? <InfoRow icon="work-outline" label="Jobs posted" text={String(stats.jobs)} /> : null}
        {stats?.applications !== undefined ? <InfoRow icon="assignment" label="Applications" text={String(stats.applications)} /> : null}
      </Card>

      {/* Premium Answers */}
      {detailEntries.length ? (
        <Card title={user.role === "hirer" ? "Organisation" : "Professional profile"}>
          {detailEntries.map(([key, value]) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.detailKey}>{labelFor(key)}</Text>
              <Text style={styles.detailValue}>{Array.isArray(value) ? value.join(", ") : String(value)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Aadhaar */}
      {user.hasAadhaarFront || user.verificationStatus !== "none" ? (
        <Card title="Aadhaar" right={<StatusBadge status={user.verificationStatus} />}>
          <InfoRow icon="badge" label="Last 4 digits" text={user.aadhaarLast4 || "Not given"} />
          {user.verificationNote ? <InfoRow icon="info-outline" label="Note" text={user.verificationNote} /> : null}
          {user.hasAadhaarFront ? <AuthImage path={`/admin/get-document/${userId}/front`} style={styles.document} /> : null}
          {user.hasAadhaarBack ? <AuthImage path={`/admin/get-document/${userId}/back`} style={styles.document} /> : null}
          {user.verificationStatus === "pending" ? (
            <View style={styles.actions}>
              <Button title="Reject" icon="close" variant="danger" size="md" onPress={() => setAction("rejected")} style={{ flex: 1 }} />
              <Button title="Verify" icon="verified-user" variant="success" size="md" onPress={() => setAction("verified")} style={{ flex: 1 }} />
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Account Actions */}
      <Card title="Account">
        <Text style={styles.hint}>Suspended or banned users are signed out immediately.</Text>
        <View style={styles.actions}>
          {statusActions.map((key) => (
            <Button key={key} title={ACTIONS[key].label} icon={ACTIONS[key].icon} variant={ACTIONS[key].variant} size="md" onPress={() => setAction(key)} style={{ flex: 1 }} />
          ))}
        </View>
      </Card>

      <ConfirmModal
        visible={Boolean(action)}
        title={action ? ACTIONS[action].title : ""}
        message={action === "verified" ? "They will get a verified badge." : "The user will be notified."}
        confirmText={action ? ACTIONS[action].label : ""}
        danger={action === "banned" || action === "rejected"}
        loading={saving}
        inputPlaceholder={action === "verified" ? undefined : "Reason (at least 5 characters)"}
        onConfirm={handleConfirm}
        onCancel={() => setAction(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", gap: 6, paddingVertical: 22 },
  name: { fontFamily: fonts.extrabold, fontSize: 21, color: colors.heading, textAlign: "center", marginTop: 6 },
  role: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.muted, textAlign: "center" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 6 },
  reason: { fontFamily: fonts.medium, fontSize: 13, color: colors.error, textAlign: "center" },
  detailRow: { flexDirection: "row", gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailKey: { width: "40%", fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  detailValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.heading },
  document: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.neutralSoft, marginTop: 14 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
});
