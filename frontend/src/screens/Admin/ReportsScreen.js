import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../Components/Screen";
import ChipGroup from "../../Components/ChipGroup";
import StatusBadge from "../../Components/StatusBadge";
import Button from "../../Components/Button";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import ConfirmModal from "../../Components/ConfirmModal";
import Alert from "../../Components/Alert";
import api from "../../api/api";
import colors from "../../colors";
import { fonts, radius, shadow } from "../../theme";
import { timeAgo } from "../../lib/formatTimeStamp";

const FILTERS = [
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All", value: null },
];

const REASONS = {
  fraud: { label: "Fraud or scam", icon: "gpp-bad" },
  unsafe: { label: "Unsafe workplace", icon: "health-and-safety" },
  inappropriate: { label: "Inappropriate behaviour", icon: "do-not-disturb-on" },
  misleading: { label: "Misleading details", icon: "report-gmailerrorred" },
  other: { label: "Something else", icon: "more-horiz" },
};

export default function ReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { report, status }
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/get-all-reports", { params: status ? { status } : {} });
      if (data.success) setReports(data.reports);
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not load reports");
      console.log("Fetch Reports Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (note) => {
    if (note.length < 5) {
      setSelected(null);
      showAlert("Please add a note of at least 5 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/resolve-report/${selected.report.id}`, { status: selected.status, note });
      if (data.success) {
        setReports((current) =>
          status === "open"
            ? current.filter((report) => report.id !== selected.report.id)
            : current.map((report) => (report.id === data.report.id ? data.report : report))
        );
        setSelected(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelected(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Resolve Report Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Reports" subtitle="Complaints from users" onBack={() => navigation.goBack()}>
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {loading ? (
        <LoadingState />
      ) : reports.length === 0 ? (
        <EmptyState icon="flag" title="No reports" message={status === "open" ? "Nothing needs your attention right now." : undefined} />
      ) : (
        reports.map((report) => {
          const reason = REASONS[report.reason] || REASONS.other;
          return (
            <View key={report.id} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.iconTile}>
                  <MaterialIcons name={reason.icon} size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{reason.label}</Text>
                  <Text style={styles.meta}>
                    {report.targetType === "job" ? "Job" : "User"} #{report.targetId} · by {report.reporter.name} · {timeAgo(report.createdAt)}
                  </Text>
                </View>
                <StatusBadge status={report.status} />
              </View>

              {report.details ? <Text style={styles.details}>{`"${report.details}"`}</Text> : null}
              {report.note ? <Text style={styles.note}>Resolution: {report.note}</Text> : null}

              {report.targetType === "user" ? (
                <Pressable style={styles.link} onPress={() => navigation.navigate("UserDetailsScreen", { userId: report.targetId })} hitSlop={6}>
                  <Text style={styles.linkText}>View reported user</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.adminGreen} />
                </Pressable>
              ) : null}

              {report.status === "open" ? (
                <View style={styles.actions}>
                  <Button title="Dismiss" variant="secondary" size="md" onPress={() => setSelected({ report, status: "dismissed" })} style={{ flex: 1 }} />
                  <Button title="Resolve" icon="check" variant="success" size="md" onPress={() => setSelected({ report, status: "resolved" })} style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <ConfirmModal
        visible={Boolean(selected)}
        title={selected?.status === "resolved" ? "Resolve this report?" : "Dismiss this report?"}
        message="Add a short note about what you did."
        confirmText={selected?.status === "resolved" ? "Resolve" : "Dismiss"}
        loading={saving}
        inputPlaceholder="Note (at least 5 characters)"
        onConfirm={handleResolve}
        onCancel={() => setSelected(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.errorSoft, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  details: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.body, marginTop: 12, lineHeight: 19, fontStyle: "italic" },
  note: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.success, marginTop: 10 },
  link: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 10 },
  linkText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.adminGreen },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
