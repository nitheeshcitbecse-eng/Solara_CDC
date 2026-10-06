import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../Components/Screen";
import Card from "../Components/Card";
import Input from "../Components/Input";
import Button from "../Components/Button";
import ImagePickerField from "../Components/ImagePickerField";
import StatusBadge from "../Components/StatusBadge";
import Alert from "../Components/Alert";
import { AuthContext } from "../context/AuthContext";
import colors from "../colors";
import { fonts, radius } from "../theme";
import uploadDocuments from "../lib/uploadDocuments";
import useImagePreview from "../lib/useImagePreview";
import useTheme from "../lib/useTheme";

const STATUS_TEXT = {
  hirer: {
    none: "Upload a photo of your Aadhaar card. Our team checks it before you can post jobs.",
    pending: "Your Aadhaar is under review. This usually takes less than 24 hours.",
    verified: "You are verified. Job seekers see a verified badge on every job you post.",
    rejected: "Your Aadhaar was not accepted. Please upload it again.",
  },
  seeker: {
    none: "Upload a photo of your Aadhaar card to get a verified badge.",
    pending: "Your Aadhaar is under review. You can keep applying for jobs meanwhile.",
    verified: "You are verified. Hirers see a verified badge on your applications.",
    rejected: "Your Aadhaar was not accepted. Please upload it again.",
  },
};

const STATUS_ICON = { none: "shield", pending: "hourglass-top", verified: "verified-user", rejected: "gpp-bad" };
const STATUS_TINT = { none: colors.muted, pending: colors.warning, verified: colors.success, rejected: colors.error };

export default function VerificationScreen({ navigation }) {
  const { user, setUser } = useContext(AuthContext);
  const theme = useTheme();
  const front = useImagePreview({ max: 1 });
  const back = useImagePreview({ max: 1 });
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const status = user.verificationStatus;
  const canUpload = status === "none" || status === "rejected";

  const handleUpload = async () => {
    if (!front.images.length) return setMessage("Add a photo of the front of your Aadhaar card");
    if (last4 && !/^\d{4}$/.test(last4)) return setMessage("Enter the last 4 digits of your Aadhaar number");

    setLoading(true);
    setMessage("");
    try {
      const data = await uploadDocuments({ aadhaarFront: front.images[0], aadhaarBack: back.images[0], last4 });
      if (data.success) {
        setUser(data.user);
        setAlertMessage("Thanks! We'll review your Aadhaar within 24 hours.");
        setAlertVisible(true);
        front.clearImages();
        back.clearImages();
        setLast4("");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed. Please try again.");
      console.log("Upload Aadhaar Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Verification" onBack={() => navigation.goBack()}>
      {/* Status */}
      <Card style={styles.statusCard}>
        <View style={[styles.statusIcon, { backgroundColor: `${STATUS_TINT[status]}1A` }]}>
          <MaterialIcons name={STATUS_ICON[status]} size={38} color={STATUS_TINT[status]} />
        </View>
        <StatusBadge status={status} />
        <Text style={styles.statusText}>{STATUS_TEXT[user.role]?.[status]}</Text>
        {status === "rejected" && user.verificationNote ? (
          <View style={styles.note}>
            <MaterialIcons name="info-outline" size={18} color={colors.error} />
            <Text style={styles.noteText}>{user.verificationNote}</Text>
          </View>
        ) : null}
        {status === "verified" && user.role === "hirer" ? (
          <Button title="Post a Job" icon="add" onPress={() => navigation.navigate("AddJobScreen")} style={{ marginTop: 8 }} />
        ) : null}
      </Card>

      {/* Upload Form */}
      {canUpload ? (
        <Card title="Upload Aadhaar">
          <ImagePickerField label="Front side *" picker={front} accent={theme.accent} />
          <ImagePickerField label="Back side" hint="Optional" picker={back} accent={theme.accent} />
          <Input
            label="Last 4 digits (optional)"
            icon="badge"
            placeholder="e.g. 4821"
            keyboardType="number-pad"
            maxLength={4}
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, ""))}
            style={{ marginTop: 20 }}
          />

          <View style={styles.privacy}>
            <MaterialIcons name="lock" size={16} color={colors.muted} />
            <Text style={styles.privacyText}>Only the Solara verification team can see your documents.</Text>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Submit Button */}
          <Button title="Submit for Review" icon="upload" onPress={handleUpload} loading={loading} style={{ marginTop: 16 }} />
        </Card>
      ) : null}

      <Alert visible={alertVisible} tone="success" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: { alignItems: "center", gap: 12, paddingVertical: 24 },
  statusIcon: { width: 76, height: 76, borderRadius: 38, justifyContent: "center", alignItems: "center" },
  statusText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.body, textAlign: "center", lineHeight: 21, paddingHorizontal: 8 },
  note: { flexDirection: "row", gap: 8, backgroundColor: colors.errorSoft, padding: 12, borderRadius: radius.md, alignSelf: "stretch" },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.error },
  privacy: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginTop: 12, fontSize: 14 },
});
