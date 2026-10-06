import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import JobCard from "../../Components/JobCard";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import Alert from "../../Components/Alert";
import api from "../../api/api";
import colors from "../../colors";
import { fonts } from "../../theme";

export default function SavedJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchSavedJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/jobs/get-saved-jobs");
      if (data.success) setJobs(data.jobs);
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not load saved jobs");
      console.log("Fetch Saved Jobs Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSavedJobs();
    }, [fetchSavedJobs])
  );

  const handleUnsave = async (jobId) => {
    try {
      const { data } = await api.delete(`/jobs/unsave-job/${jobId}`);
      if (data.success) setJobs((current) => current.filter((job) => job.id !== jobId));
    } catch (err) {
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Unsave Job Error:", err.message);
    }
  };

  return (
    <Screen title="Saved Jobs" subtitle={loading ? undefined : `${jobs.length} saved`} onBack={() => navigation.goBack()}>
      {loading ? (
        <LoadingState />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="bookmark-border"
          title="No saved jobs"
          message="Tap the bookmark on any job to keep it here for later."
          actionLabel="Browse jobs"
          onAction={() => navigation.navigate("FindJobsScreen")}
        />
      ) : (
        jobs.map((job) => (
          <JobCard key={job.id} job={job} onPress={() => navigation.navigate("JobDetailsScreen", { jobId: job.id })}>
            <Pressable style={styles.removeRow} onPress={() => handleUnsave(job.id)} hitSlop={8}>
              <MaterialIcons name="bookmark-remove" size={18} color={colors.error} />
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </JobCard>
        ))
      )}

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  removeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start" },
  removeText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.error },
});
