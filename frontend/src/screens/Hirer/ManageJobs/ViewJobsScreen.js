import React, { useCallback, useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import JobCard from "../../../Components/JobCard";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import useTheme from "../../../lib/useTheme";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "In Review", value: "pending_review" },
  { label: "Closed", value: "closed" },
  { label: "Rejected", value: "rejected" },
  { label: "Taken Down", value: "taken_down" },
];

export default function ViewJobsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const premium = user.tier === "premium";
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/jobs/get-my-jobs");
      if (data.success) {
        setJobs(data.jobs);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load your jobs");
      console.log("Fetch My Jobs Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredJobs(
      jobs.filter((job) => (status === "all" || job.status === status) && (job.title.toLowerCase().includes(term) || job.city.toLowerCase().includes(term)))
    );
  }, [search, status, jobs]);

  return (
    <Screen
      title={premium ? "Openings" : "My Jobs"}
      subtitle={loading ? undefined : `${jobs.length} total`}
      onBack={() => navigation.goBack()}
      right={
        <MaterialIcons name="add-circle" size={30} color={theme.accent} onPress={() => navigation.navigate(user.verificationStatus === "verified" ? "AddJobScreen" : "VerificationScreen")} />
      }
    >
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search your jobs" />
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon="work-outline"
          title={jobs.length ? "No jobs in this filter" : "No jobs yet"}
          message={jobs.length ? "Try another filter." : "Post your first job to start receiving applications."}
          actionLabel={jobs.length ? undefined : "Post a job"}
          onAction={() => navigation.navigate(user.verificationStatus === "verified" ? "AddJobScreen" : "VerificationScreen")}
        />
      ) : (
        filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} showStatus onPress={() => navigation.navigate("JobApplicantsScreen", { jobId: job.id, jobTitle: job.title })}>
            <View style={[styles.applicantRow, { backgroundColor: theme.accentSoft }]}>
              <MaterialIcons name="people-outline" size={20} color={theme.accent} />
              <Text style={styles.applicantText}>
                {job.applicantCount} {job.applicantCount === 1 ? "applicant" : "applicants"}
              </Text>
              {job.newApplicants ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>{job.newApplicants} new</Text>
                </View>
              ) : null}
              <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
            </View>
            {job.reviewNote ? <Text style={styles.reviewNote}>Note from Solara: {job.reviewNote}</Text> : null}
          </JobCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  applicantRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 11, borderRadius: radius.md },
  applicantText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.heading },
  newBadge: { backgroundColor: colors.error, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  newText: { color: "#fff", fontFamily: fonts.bold, fontSize: 11 },
  reviewNote: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.error, marginTop: 10 },
});
