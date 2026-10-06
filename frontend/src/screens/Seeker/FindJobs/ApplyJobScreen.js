import React, { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import Input from "../../../Components/Input";
import Button from "../../../Components/Button";
import ChipGroup from "../../../Components/ChipGroup";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import formatSalary from "../../../lib/formatSalary";
import tierTheme from "../../../lib/tierTheme";

const START_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "In 1 week", value: 7 },
  { label: "In 2 weeks", value: 14 },
  { label: "In 1 month", value: 30 },
];

// YYYY-MM-DD, `days` from today
const dateFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function ApplyJobScreen({ navigation, route }) {
  const { job } = route.params;
  const premium = job.tier === "premium";
  const theme = tierTheme(job.tier);
  const [coverMessage, setCoverMessage] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [startIn, setStartIn] = useState(0);
  // Daily workers are usually reached by phone; professionals share it after approval anyway.
  const [sharePhone, setSharePhone] = useState(!premium);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [applicationId, setApplicationId] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleApply = async () => {
    const text = coverMessage.trim();
    if (text.length < 20) return setMessage("Tell the hirer about yourself in at least 20 characters");
    if (expectedSalary && Number(expectedSalary) < 100) return setMessage("Enter a valid expected salary");

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/applications/add-application", {
        jobId: job.id,
        message: text,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        availableFrom: dateFromToday(startIn),
        sharePhone,
      });
      if (data.success) {
        setApplicationId(data.application.id);
        setAlertMessage(premium ? "Your application has been sent to the recruiter." : "Your application has been sent. The hirer will contact you soon.");
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not submit your application");
      console.log("Apply Job Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={premium ? "Apply for this role" : "Apply"}
      onBack={() => navigation.goBack()}
      footer={
        <>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button title="Submit Application" icon="send" onPress={handleApply} loading={loading} style={{ backgroundColor: theme.button, borderColor: theme.button }} />
        </>
      }
    >
      {/* Job Summary */}
      <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
        <View style={styles.summaryIcon}>
          <MaterialIcons name={job.sector?.icon || "work"} size={24} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
          <Text style={styles.jobMeta} numberOfLines={1}>{job.hirer.businessName || job.hirer.name} · {formatSalary(job)}</Text>
        </View>
      </View>

      <Card>
        <Input
          label={premium ? "Cover note" : "Why should they hire you?"}
          hint={`${coverMessage.trim().length}/500 · at least 20 characters`}
          icon="edit"
          placeholder={premium ? "Your experience, key achievements and why this role fits you" : "Your experience and the languages you speak"}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          value={coverMessage}
          onChangeText={setCoverMessage}
        />

        <Input
          label={`Expected salary (₹ per ${job.salaryPeriod || "month"}, optional)`}
          icon="payments"
          placeholder={formatSalary(job)}
          keyboardType="number-pad"
          maxLength={8}
          value={expectedSalary}
          onChangeText={(text) => setExpectedSalary(text.replace(/\D/g, ""))}
          style={{ marginTop: 16 }}
        />

        <Text style={styles.label}>When can you start?</Text>
        <ChipGroup wrap options={START_OPTIONS} selected={startIn} onSelect={setStartIn} />

        {/* Contact */}
        {premium ? (
          <View style={[styles.notice, { backgroundColor: colors.premiumGoldSoft }]}>
            <MaterialIcons name="lock" size={20} color={colors.premiumGold} />
            <Text style={styles.noticeText}>
              Your phone and email stay private. They are shared only after the recruiter shortlists you and Solara approves it.
            </Text>
          </View>
        ) : (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Share my phone number</Text>
              <Text style={styles.switchText}>The hirer can call you directly.</Text>
            </View>
            <Switch value={sharePhone} onValueChange={setSharePhone} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
          </View>
        )}
      </Card>

      <Alert
        visible={alertVisible}
        tone="success"
        title="Application sent"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (applicationId) navigation.replace("ApplicationDetailsScreen", { applicationId });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 14 },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  jobTitle: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.heading },
  jobMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.body, marginTop: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginTop: 18, marginBottom: 8 },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.md, marginTop: 20 },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.body, lineHeight: 19 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, padding: 14, backgroundColor: colors.neutralSoft, borderRadius: radius.md },
  switchTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.heading },
  switchText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 10, fontSize: 14 },
});
