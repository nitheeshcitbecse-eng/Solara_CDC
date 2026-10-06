import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import SearchBox from "../../Components/SearchBox";
import ChipGroup from "../../Components/ChipGroup";
import StatusBadge from "../../Components/StatusBadge";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import api from "../../api/api";
import colors from "../../colors";
import { fonts, radius, shadow } from "../../theme";
import formatSalary from "../../lib/formatSalary";
import { formatDate } from "../../lib/formatTimeStamp";
import { jobImage } from "../../Components/JobCard";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Applied", value: "applied" },
  { label: "Shortlisted", value: "shortlisted" },
  { label: "Hired", value: "hired" },
  { label: "Rejected", value: "rejected" },
];

export default function MyApplicationsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  const fetchApplications = useCallback(async () => {
    try {
      const { data } = await api.get("/applications/get-my-applications");
      if (data.success) {
        setApplications(data.applications);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load your applications");
      console.log("Fetch Applications Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredApplications(
      applications.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (item.job.title.toLowerCase().includes(term) || (item.job.hirer.businessName || item.job.hirer.name).toLowerCase().includes(term))
      )
    );
  }, [search, status, applications]);

  return (
    <Screen title="My Applications" subtitle={loading ? undefined : `${applications.length} total`} onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search by job or hirer" />
      <ChipGroup options={FILTERS} selected={status} onSelect={setStatus} />
      <View style={{ height: 16 }} />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {loading ? (
        <LoadingState />
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="No applications here"
          message={applications.length ? "Try another filter." : "Apply for a job and track its progress here."}
          actionLabel={applications.length ? undefined : "Find jobs"}
          onAction={() => navigation.navigate("FindJobsScreen")}
        />
      ) : (
        filteredApplications.map((item) => {
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
              onPress={() => navigation.navigate("ApplicationDetailsScreen", { applicationId: item.id })}
            >
              <View style={styles.row}>
                <Image source={jobImage(item.job)} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.job.title}</Text>
                  <Text style={styles.company} numberOfLines={1}>{item.job.hirer.businessName || item.job.hirer.name}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.footer}>
                <Text style={styles.meta}>{formatSalary(item.job)}</Text>
                <Text style={styles.meta}>Applied {formatDate(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.neutralSoft },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.heading },
  company: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  meta: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.body },
});
