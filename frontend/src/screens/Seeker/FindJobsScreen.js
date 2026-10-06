import React, { useCallback, useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import SearchBox from "../../Components/SearchBox";
import CategoryCarousel from "../../Components/CategoryCarousel";
import JobCard from "../../Components/JobCard";
import StatusBadge from "../../Components/StatusBadge";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import colors from "../../colors";
import { fonts } from "../../theme";
import useTheme from "../../lib/useTheme";

export default function FindJobsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const premium = user.tier === "premium";
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [sectorId, setSectorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/jobs/get-all-jobs", { params: sectorId ? { sectorId } : {} });
      if (data.success) {
        setJobs(data.jobs);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load jobs");
      console.log("Fetch Jobs Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sectorId]);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const { data } = await api.get("/sectors/get-all-sectors");
        if (data.success) setSectors(data.sectors);
      } catch (err) {
        console.log("Fetch Sectors Error:", err.message);
      }
    };
    fetchSectors();
  }, []);

  // Reload on focus so "Applied" and "Saved" stay current after visiting a job.
  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredJobs(
      jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.city.toLowerCase().includes(term) ||
          (job.address || "").toLowerCase().includes(term) ||
          (job.hirer.businessName || job.hirer.name).toLowerCase().includes(term)
      )
    );
  }, [search, jobs]);

  return (
    <Screen
      title={premium ? "Browse Openings" : "Find Work"}
      subtitle={loading ? "Loading…" : `${filteredJobs.length} ${filteredJobs.length === 1 ? "job" : "jobs"} available`}
      onBack={() => navigation.goBack()}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchJobs();
      }}
    >
      <SearchBox value={search} onChangeText={setSearch} placeholder={premium ? "Role, hospital, company or city" : "Job, area or hirer"} />
      <CategoryCarousel sectors={sectors} selected={sectorId} onSelect={setSectorId} tier={user.tier} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon="work-off"
          title="No jobs found"
          message={search || sectorId ? "Try another search or category." : "New jobs are added every day. Check back soon."}
        />
      ) : (
        filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} onPress={() => navigation.navigate("JobDetailsScreen", { jobId: job.id })}>
            {job.myApplicationId || job.saved ? (
              <View style={styles.tags}>
                {job.myApplicationId ? <StatusBadge status="applied" /> : null}
                {job.saved ? (
                  <View style={[styles.savedTag, { backgroundColor: theme.accentSoft }]}>
                    <MaterialIcons name="bookmark" size={14} color={theme.accent} />
                    <Text style={[styles.savedText, { color: theme.accent }]}>Saved</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </JobCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  tags: { flexDirection: "row", gap: 8, marginTop: 10 },
  savedTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  savedText: { fontFamily: fonts.bold, fontSize: 11.5 },
});
