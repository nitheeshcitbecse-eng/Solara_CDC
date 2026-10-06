import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import JobCard from "../../../Components/JobCard";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import ConfirmModal from "../../../Components/ConfirmModal";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";

export default function ReviewJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { job, decision }
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await api.get("/admin/get-all-jobs", { params: { status: "pending_review" } });
        if (data.success) setJobs(data.jobs);
      } catch (err) {
        showAlert(err.response?.data?.message || "Could not load jobs");
        console.log("Fetch Pending Jobs Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleDecision = async (reason) => {
    if (selected.decision === "reject" && reason.length < 5) {
      setSelected(null);
      showAlert("Please give a reason of at least 5 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/review-job/${selected.job.id}`, { decision: selected.decision, reason: reason || null });
      if (data.success) {
        setJobs((current) => current.filter((job) => job.id !== selected.job.id));
        setSelected(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelected(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Review Job Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const approving = selected?.decision === "approve";

  return (
    <Screen title="Review Jobs" subtitle={loading ? undefined : `${jobs.length} waiting`} onBack={() => navigation.goBack()}>
      {loading ? (
        <LoadingState />
      ) : jobs.length === 0 ? (
        <EmptyState icon="fact-check" title="Nothing to review" message="Jobs that suggest a new sector will appear here." />
      ) : (
        jobs.map((job) => (
          <JobCard key={job.id} job={job} showStatus showTier>
            <Text style={styles.description} numberOfLines={4}>{job.description}</Text>
            {job.proposedSector ? (
              <View style={styles.sectorNote}>
                <MaterialIcons name="new-releases" size={16} color={colors.warning} />
                <Text style={styles.sectorText}>{`Approving also creates the sector "${job.proposedSector}"`}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button title="Reject" icon="close" variant="danger" size="md" onPress={() => setSelected({ job, decision: "reject" })} style={{ flex: 1 }} />
              <Button title="Approve" icon="check" variant="success" size="md" onPress={() => setSelected({ job, decision: "approve" })} style={{ flex: 1 }} />
            </View>
          </JobCard>
        ))
      )}

      <ConfirmModal
        visible={Boolean(selected)}
        title={approving ? "Approve this job?" : "Reject this job?"}
        message={approving ? "The job goes live straight away." : "The hirer will see your reason."}
        confirmText={approving ? "Approve" : "Reject"}
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
  description: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.body, marginTop: 12, lineHeight: 20 },
  sectorNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.warningSoft, padding: 10, borderRadius: radius.sm, marginTop: 10 },
  sectorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, color: colors.body },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
