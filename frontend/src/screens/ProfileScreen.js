import React, { useContext, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../Components/Card";
import InfoRow from "../Components/InfoRow";
import StatusBadge from "../Components/StatusBadge";
import TierBadge from "../Components/TierBadge";
import Avatar from "../Components/Avatar";
import Button from "../Components/Button";
import Alert from "../Components/Alert";
import PhotoHero from "../Components/PhotoHero";
import { AuthContext } from "../context/AuthContext";
import colors from "../colors";
import { fonts, shadow } from "../theme";
import { rupees } from "../lib/formatSalary";
import { formatDate } from "../lib/formatTimeStamp";
import { NOTICE_PERIODS, ORGANIZATION_TYPES } from "../lib/premiumForms";
import { themeForUser } from "../lib/tierTheme";
import { heroImage } from "../lib/sectorImages";
import uploadDocuments from "../lib/uploadDocuments";
import useImagePreview from "../lib/useImagePreview";

const ROLE_LABELS = { seeker: "Job Seeker", hirer: "Hirer", admin: "Owner · Admin" };
const labelOf = (options, value) => options.find((option) => option.value === value)?.label || value;

export default function ProfileScreen({ navigation }) {
  const { user, setUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const theme = themeForUser(user);
  const details = user.details || {};
  const photo = useImagePreview({ max: 1 });
  const [photoVersion, setPhotoVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const premiumSeeker = user.role === "seeker" && user.tier === "premium";
  const premiumHirer = user.role === "hirer" && user.tier === "premium";

  const handleChangePhoto = async () => {
    const [picked] = await photo.takePhoto({ front: true });
    if (!picked) return;
    setUploading(true);
    try {
      const data = await uploadDocuments({ photo: picked });
      if (data.success) {
        setUser(data.user);
        setPhotoVersion(Date.now());
      }
    } catch (err) {
      setAlertMessage(err.response?.data?.message || "Could not update your photo");
      setAlertVisible(true);
      console.log("Update Photo Error:", err.message);
    } finally {
      setUploading(false);
      photo.clearImages();
    }
  };

  const headline = premiumSeeker
    ? [details.profession, details.specialization].filter(Boolean).join(" · ")
    : premiumHirer
      ? [details.designation, user.businessName].filter(Boolean).join(" · ")
      : user.role === "hirer" && user.businessName
        ? user.businessName
        : ROLE_LABELS[user.role];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <PhotoHero source={heroImage(theme.name)} tint={theme.gradient} style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <View style={styles.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.circleButton} hitSlop={6}>
              <MaterialIcons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("EditProfileScreen")} style={styles.circleButton} hitSlop={6}>
              <MaterialIcons name="edit" size={20} color="#fff" />
            </Pressable>
          </View>
        </PhotoHero>

        {/* Identity */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <Avatar userId={user.id} name={user.name} hasPhoto={user.hasPhoto} size={96} color={theme.accent} background={theme.accentSoft} version={photoVersion} />
            {user.role !== "admin" ? (
              <Pressable style={[styles.cameraButton, { backgroundColor: theme.button }]} onPress={handleChangePhoto} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="photo-camera" size={16} color="#fff" />}
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <View style={styles.badges}>
            {user.tier ? <TierBadge tier={user.tier} /> : null}
            {user.role !== "admin" ? <StatusBadge status={user.verificationStatus} /> : null}
          </View>
        </View>

        <View style={styles.content}>
          {/* Contact */}
          <Card title="Contact">
            <InfoRow icon="phone-iphone" label="Mobile" text={user.phone || "Not added"} />
            <InfoRow icon="mail-outline" label="Email" text={user.email || "Add one to reset your password"} />
            <InfoRow icon="place" label="City" text={user.city || "Not added"} />
            <InfoRow icon="event" label="Member since" text={formatDate(user.createdAt)} />
          </Card>

          {/* Normal Seeker */}
          {user.role === "seeker" && !premiumSeeker ? (
            <Card title="Work">
              {user.skills.length ? (
                <View style={styles.tags}>
                  {user.skills.map((skill) => (
                    <View key={skill} style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.tagText, { color: theme.accentDark }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>Add the work you do so hirers can find you.</Text>
              )}
              <InfoRow icon="timeline" label="Experience" text={user.experienceYears !== null ? `${user.experienceYears} years` : null} />
              <InfoRow icon="notes" label="About" text={user.about} />
            </Card>
          ) : null}

          {/* Premium Seeker */}
          {premiumSeeker ? (
            <>
              <Card title="Qualifications">
                <InfoRow icon="school" label="Qualification" text={details.qualification} />
                <InfoRow icon="account-balance" label="Institution" text={[details.institution, details.graduationYear].filter(Boolean).join(", ")} />
                <InfoRow icon="verified" label="Registration no." text={details.licenseNumber} />
              </Card>
              <Card title="Experience">
                <InfoRow icon="timeline" label="Total" text={user.experienceYears !== null ? `${user.experienceYears} years` : null} />
                <InfoRow icon="business" label="Current role" text={[details.currentDesignation, details.currentEmployer].filter(Boolean).join(" at ")} />
                {user.skills.length ? (
                  <View style={[styles.tags, { marginTop: 14 }]}>
                    {user.skills.map((skill) => (
                      <View key={skill} style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.tagText, { color: theme.accentDark }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <InfoRow icon="notes" label="Summary" text={user.about} />
              </Card>
              <Card title="Preferences">
                <InfoRow icon="translate" label="Languages" text={(details.languages || []).join(", ")} />
                <InfoRow icon="map" label="Preferred cities" text={(details.preferredCities || []).join(", ")} />
                <InfoRow icon="payments" label="Expected salary" text={details.expectedSalary ? `${rupees(details.expectedSalary)} / year` : null} />
                <InfoRow icon="schedule" label="Notice period" text={details.noticePeriod ? labelOf(NOTICE_PERIODS, details.noticePeriod) : null} />
                <InfoRow icon="link" label="LinkedIn / portfolio" text={details.linkedinUrl} />
              </Card>
            </>
          ) : null}

          {/* Hirer */}
          {user.role === "hirer" ? (
            <Card title={premiumHirer ? "Organisation" : "Business"}>
              <InfoRow icon="storefront" label="Name" text={user.businessName || "Not added"} />
              {premiumHirer ? (
                <>
                  <InfoRow icon="category" label="Type" text={labelOf(ORGANIZATION_TYPES, details.organizationType)} />
                  <InfoRow icon="groups" label="Size" text={details.companySize ? `${details.companySize} people` : null} />
                  <InfoRow icon="receipt-long" label="Registration / GST" text={details.registrationNumber} />
                  <InfoRow icon="place" label="Office" text={details.officeAddress} />
                  <InfoRow icon="language" label="Website" text={details.website} />
                </>
              ) : null}
              <InfoRow icon="badge" label="Aadhaar" text={user.aadhaarLast4 ? `•••• ${user.aadhaarLast4}` : null} />
              <InfoRow icon="notes" label="About" text={user.about} />
            </Card>
          ) : null}

          <Button title="Edit Profile" icon="edit" onPress={() => navigation.navigate("EditProfileScreen")} />
        </View>
      </ScrollView>

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { height: 190, paddingHorizontal: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  circleButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  identityCard: { marginTop: -84, marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 26, alignItems: "center", paddingTop: 22, paddingBottom: 20, paddingHorizontal: 16, ...shadow.md },
  avatarWrap: { borderRadius: 52, padding: 4, backgroundColor: colors.card },
  cameraButton: { position: "absolute", right: 0, bottom: 2, width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: colors.card },
  name: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.heading, marginTop: 10, textAlign: "center" },
  headline: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginTop: 3, textAlign: "center" },
  badges: { flexDirection: "row", gap: 8, marginTop: 12 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  tagText: { fontFamily: fonts.semibold, fontSize: 13 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
