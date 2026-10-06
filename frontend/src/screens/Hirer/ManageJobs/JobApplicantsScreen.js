import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import ApplicantCard from "../../../Components/ApplicantCard";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts } from "../../../theme";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "New", value: "applied" },
  { label: "Shortlisted", value: "shortlisted" },
  { label: "Hired", value: "hired" },
  { label: "Rejected", value: "rejected" },
];

export default function JobApplicantsScreen({ navigation, route }) {
  const { jobId, jobTitle } = route.params;
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  const fetchApplicants = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/get-job-applicants/${jobId}`);
      if (data.success) {
        setApplications(data.applications);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load applicants");
      console.log("Fetch Applicants Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      fetchApplicants();
    }, [fetchApplicants])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredApplications(
      applications.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (item.seeker.name.toLowerCase().includes(term) || item.seeker.skills.join(" ").toLowerCase().includes(term))
      )
    );
  }, [search, status, applications]);

  return (
    <Screen title="Applicants" subtitle={jobTitle} onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search by name or skill" />
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={applications.length ? "No applicants in this filter" : "No applicants yet"}
          message={applications.length ? "Try another filter." : "You'll be notified as soon as someone applies."}
        />
      ) : (
        filteredApplications.map((item) => (
          <ApplicantCard key={item.id} application={item} onPress={() => navigation.navigate("ApplicantDetailsScreen", { applicationId: item.id })} />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
});
