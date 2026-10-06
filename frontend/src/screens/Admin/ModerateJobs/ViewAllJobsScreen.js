import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import JobCard from "../../../Components/JobCard";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts } from "../../../theme";

const TIER_FILTERS = [
  { label: "All tiers", value: null },
  { label: "Normal", value: "normal" },
  { label: "Premium", value: "premium" },
];

const FILTERS = [
  { label: "Any status", value: null },
  { label: "Active", value: "active" },
  { label: "In Review", value: "pending_review" },
  { label: "Rejected", value: "rejected" },
  { label: "Closed", value: "closed" },
  { label: "Taken Down", value: "taken_down" },
];

export default function ViewAllJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [status, setStatus] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/get-all-jobs", { params: { ...(status ? { status } : {}), ...(tier ? { tier } : {}) } });
      if (data.success) {
        setJobs(data.jobs);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load jobs");
      console.log("Fetch All Jobs Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [status, tier]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredJobs(
      jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.city.toLowerCase().includes(term) ||
          (job.hirer.businessName || job.hirer.name).toLowerCase().includes(term)
      )
    );
  }, [search, jobs]);

  return (
    <Screen title="All Jobs" subtitle={loading ? undefined : `${filteredJobs.length} shown`} onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Job, city or hirer" />
      <ChipGroup options={TIER_FILTERS} selected={tier} onSelect={setTier} />
      <View style={{ height: 8 }} />
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredJobs.length === 0 ? (
        <EmptyState icon="work-off" title="No jobs found" message="Try other filters." />
      ) : (
        filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} showStatus showTier>
            {job.reviewNote ? <Text style={styles.note}>Note: {job.reviewNote}</Text> : null}
          </JobCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  note: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.error, marginTop: 10 },
});
