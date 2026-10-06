import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../../../Components/Card";
import PhotoHero from "../../../Components/PhotoHero";
import { jobImage } from "../../../Components/JobCard";
import InfoRow from "../../../Components/InfoRow";
import PhotoStrip from "../../../Components/PhotoStrip";
import ReportModal from "../../../Components/ReportModal";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import TierBadge from "../../../Components/TierBadge";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius, shadow } from "../../../theme";
import formatSalary, { EMPLOYMENT_LABELS } from "../../../lib/formatSalary";
import fileUrl from "../../../lib/fileUrl";
import { timeAgo } from "../../../lib/formatTimeStamp";
import tierTheme from "../../../lib/tierTheme";

const SHIFT_LABELS = { day: "Day shift", night: "Night shift", flexible: "Flexible hours" };

export default function JobDetailsScreen({ navigation, route }) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/get-job/${jobId}`);
      if (data.success) {
        setJob(data.job);
        setMessage("");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not load this job");
      console.log("Fetch Job Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      fetchJob();
    }, [fetchJob])
  );

  const handleToggleSave = async () => {
    setSaving(true);
    try {
      const { data } = job.saved ? await api.delete(`/jobs/unsave-job/${job.id}`) : await api.post(`/jobs/save-job/${job.id}`);
      if (data.success) setJob((current) => ({ ...current, saved: !current.saved }));
    } catch (err) {
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Save Job Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReport = async ({ reason, details }) => {
    setReporting(true);
    try {
      const { data } = await api.post("/support/add-report", { targetType: "job", targetId: job.id, reason, details });
      if (data.success) {
        setReportVisible(false);
        showAlert(data.message);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Could not send the report");
      console.log("Report Job Error:", err.message);
    } finally {
      setReporting(false);
    }
  };

  if (loading || !job) {
    return (
      <View style={[styles.container, styles.center]}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : <EmptyState icon="work-off" title="Job not available" message={message} actionLabel="Go back" onAction={() => navigation.goBack()} />}
      </View>
    );
  }

  const theme = tierTheme(job.tier);
  const premium = job.tier === "premium";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <PhotoHero source={jobImage(job)} tint={theme.gradient} style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.circleButton} hitSlop={6}>
              <MaterialIcons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable onPress={() => setReportVisible(true)} style={styles.circleButton} hitSlop={6}>
                <MaterialIcons name="outlined-flag" size={21} color="#fff" />
              </Pressable>
              <Pressable onPress={handleToggleSave} disabled={saving} style={styles.circleButton} hitSlop={6}>
                <MaterialIcons name={job.saved ? "bookmark" : "bookmark-border"} size={22} color={job.saved ? "#fbbf24" : "#fff"} />
              </Pressable>
            </View>
          </View>

          <View style={{ flex: 1 }} />
          {job.sector ? (
            <View style={styles.sectorPill}>
              <Text style={styles.sectorPillText}>{job.sector.name}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{job.title}</Text>
          <View style={styles.companyRow}>
            <Text style={[styles.company, { color: theme.onGradientSoft }]}>{job.hirer.businessName || job.hirer.name}</Text>
            {job.hirer.verified ? (
              <View style={styles.verified}>
                <MaterialIcons name="verified" size={14} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>
        </PhotoHero>

        {/* Key facts */}
        <View style={styles.factsCard}>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Salary</Text>
            <Text style={[styles.factValue, { color: premium ? colors.premiumInk : colors.success }]}>{formatSalary(job)}</Text>
          </View>
          <View style={styles.factDivider} />
          <View style={styles.fact}>
            <Text style={styles.factLabel}>{premium ? "Type" : "Shift"}</Text>
            <Text style={styles.factValue}>{premium ? EMPLOYMENT_LABELS[job.employmentType] || "Full-time" : SHIFT_LABELS[job.shift]}</Text>
          </View>
          <View style={styles.factDivider} />
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Openings</Text>
            <Text style={styles.factValue}>{job.openings}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Card title="Details">
            <InfoRow icon="place" label="Location" text={job.address ? `${job.address}, ${job.city}` : job.city} />
            <InfoRow icon="category" label="Sector" text={job.sector?.name} />
            <InfoRow icon="event" label="Posted" text={timeAgo(job.createdAt)} />
            {premium ? (
              <View style={{ marginTop: 12 }}>
                <TierBadge tier="premium" />
              </View>
            ) : null}
          </Card>

          {premium ? (
            <Card title="Requirements">
              <InfoRow icon="school" label="Qualification" text={job.qualification} />
              <InfoRow icon="work-history" label="Experience" text={job.minExperience ? `${job.minExperience}+ years` : "Freshers welcome"} />
              {job.requiredSkills.length ? (
                <View style={styles.skills}>
                  {job.requiredSkills.map((skill) => (
                    <View key={skill} style={[styles.skill, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.skillText, { color: colors.premiumInk }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          <Card title="About the job">
            <Text style={styles.description}>{job.description}</Text>
          </Card>

          {job.photos.length ? (
            <Card title="Workplace photos">
              <PhotoStrip uris={job.photos.map(fileUrl)} size={130} />
            </Card>
          ) : null}

          {/* Safety Note */}
          <View style={styles.safety}>
            <MaterialIcons name="health-and-safety" size={22} color={colors.success} />
            <Text style={styles.safetyText}>Never pay money to get a job. Report anyone who asks.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Apply Bar */}
      <View style={styles.footer}>
        {job.myApplicationId ? (
          <Button title="View My Application" icon="assignment" variant="secondary" onPress={() => navigation.navigate("ApplicationDetailsScreen", { applicationId: job.myApplicationId })} />
        ) : (
          <Button
            title={premium ? "Apply for this Role" : "Apply Now"}
            icon="send"
            onPress={() => navigation.navigate("ApplyJobScreen", { job })}
            style={{ backgroundColor: theme.button, borderColor: theme.button }}
          />
        )}
      </View>

      <ReportModal visible={reportVisible} title="Report this job" loading={reporting} onSubmit={handleReport} onCancel={() => setReportVisible(false)} />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  hero: { paddingBottom: 60, paddingHorizontal: 20, minHeight: 300 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  heroActions: { flexDirection: "row", gap: 10 },
  circleButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  sectorPill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.92)", paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999 },
  sectorPillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.heading },
  title: { fontFamily: fonts.extrabold, fontSize: 25, lineHeight: 32, color: "#fff", marginTop: 10, letterSpacing: -0.3, textShadowColor: "rgba(0,0,0,0.3)", textShadowRadius: 8 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  company: { fontFamily: fonts.semibold, fontSize: 15 },
  verified: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  verifiedText: { fontFamily: fonts.bold, fontSize: 11, color: "#fff" },
  factsCard: { flexDirection: "row", marginHorizontal: 20, marginTop: -36, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 16, ...shadow.md },
  fact: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  factLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  factValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.heading, marginTop: 4, textAlign: "center" },
  factDivider: { width: 1, backgroundColor: colors.divider },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  description: { fontFamily: fonts.regular, fontSize: 15, color: colors.body, lineHeight: 23 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  skill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  skillText: { fontFamily: fonts.semibold, fontSize: 13 },
  safety: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.successSoft, borderRadius: radius.md, padding: 14 },
  safetyText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.body },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider },
});
