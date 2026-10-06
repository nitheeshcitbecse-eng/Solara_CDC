import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import ChipGroup from "../../Components/ChipGroup";
import ApplicantCard from "../../Components/ApplicantCard";
import Button from "../../Components/Button";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import ConfirmModal from "../../Components/ConfirmModal";
import Alert from "../../Components/Alert";
import api from "../../api/api";
import colors from "../../colors";
import { fonts, radius } from "../../theme";
import { timeAgo } from "../../lib/formatTimeStamp";

const FILTERS = [
  { label: "Waiting", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

// Premium shortlists: the owner approves before the professional's phone/email reach the hirer.
export default function ShortlistApprovalsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { request, decision }
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/get-shortlist-requests", { params: { status } });
      if (data.success) setRequests(data.requests);
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not load shortlists");
      console.log("Fetch Shortlists Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleDecision = async (note) => {
    if (selected.decision === "reject" && note.length < 5) {
      setSelected(null);
      showAlert("Please give a reason of at least 5 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/review-shortlist/${selected.request.id}`, { decision: selected.decision, note: note || null });
      if (data.success) {
        setRequests((current) => current.filter((item) => item.id !== selected.request.id));
        setSelected(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelected(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Review Shortlist Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const approving = selected?.decision === "approve";

  return (
    <Screen title="Shortlist Approvals" subtitle="Premium contact sharing" onBack={() => navigation.goBack()}>
      <View style={styles.info}>
        <MaterialIcons name="privacy-tip" size={22} color={colors.premiumGold} />
        <Text style={styles.infoText}>
          When a premium hirer shortlists a professional, their phone and email stay hidden until you approve. Check the candidate and the hirer before approving.
        </Text>
      </View>

      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {loading ? (
        <LoadingState />
      ) : requests.length === 0 ? (
        <EmptyState icon="how-to-reg" title={status === "pending" ? "Nothing waiting" : `No ${status} shortlists`} message={status === "pending" ? "New premium shortlists will appear here." : undefined} />
      ) : (
        requests.map((request) => (
          <ApplicantCard
            key={request.id}
            application={request}
            showJob
            onPress={() => navigation.navigate("UserDetailsScreen", { userId: request.seeker.id })}
          >
            <View style={styles.hirerRow}>
              <MaterialIcons name="business" size={15} color={colors.muted} />
              <Text style={styles.hirerText} numberOfLines={1}>
                {request.status === "hired" ? "Hired" : "Shortlisted"} by {request.job.hirer.businessName || request.job.hirer.name}
                {request.job.hirer.verified ? " · verified" : " · not verified"} · {timeAgo(request.createdAt)}
              </Text>
            </View>
            {request.contactNote ? <Text style={styles.note}>Note: {request.contactNote}</Text> : null}
            {status === "pending" ? (
              <View style={styles.actions}>
                <Button title="Reject" icon="close" variant="danger" size="md" onPress={() => setSelected({ request, decision: "reject" })} style={{ flex: 1 }} />
                <Button title="Approve" icon="check" variant="success" size="md" onPress={() => setSelected({ request, decision: "approve" })} style={{ flex: 1 }} />
              </View>
            ) : null}
          </ApplicantCard>
        ))
      )}

      <ConfirmModal
        visible={Boolean(selected)}
        title={approving ? "Share contact details?" : "Reject this shortlist?"}
        message={
          approving
            ? `${selected?.request.job.hirer.businessName || "The hirer"} will see ${selected?.request.seeker.name}'s phone and email and can message them.`
            : "The hirer will see your reason. Contact details stay hidden."
        }
        confirmText={approving ? "Approve" : "Reject"}
        icon={approving ? "lock-open" : undefined}
        danger={!approving}
        loading={saving}
        inputPlaceholder={approving ? undefined : "Reason (at least 5 characters)"}
        onConfirm={handleDecision}
        onCancel={() => setSelected(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.premiumGoldSoft, marginBottom: 16 },
  infoText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.body, lineHeight: 19 },
  hirerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  hirerText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
  note: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.error, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
