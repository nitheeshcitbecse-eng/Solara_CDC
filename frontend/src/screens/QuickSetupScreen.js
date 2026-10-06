import React, { useContext, useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ImagePickerField from "../Components/ImagePickerField";
import PhotoHero from "../Components/PhotoHero";
import Button from "../Components/Button";
import Alert from "../Components/Alert";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import uploadDocuments from "../lib/uploadDocuments";
import { heroImage, sectorImage } from "../lib/sectorImages";
import useImagePreview from "../lib/useImagePreview";

// Normal (daily-wage) onboarding: two photos and you're in.
export default function QuickSetupScreen() {
  const { user, setUser, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const photo = useImagePreview({ max: 1 });
  const aadhaar = useImagePreview({ max: 1 });
  const [sectors, setSectors] = useState([]);
  const [work, setWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [completedUser, setCompletedUser] = useState(null);

  const isSeeker = user.role === "seeker";
  const photoDone = photo.images.length > 0 || user.hasPhoto;
  const aadhaarDone = aadhaar.images.length > 0 || user.hasAadhaar;

  useEffect(() => {
    if (!isSeeker) return;
    const fetchSectors = async () => {
      try {
        const { data } = await api.get("/sectors/get-all-sectors");
        if (data.success) setSectors(data.sectors);
      } catch (err) {
        console.log("Fetch Sectors Error:", err.message);
      }
    };
    fetchSectors();
  }, [isSeeker]);

  const toggleWork = (name) =>
    setWork((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));

  const handleFinish = async () => {
    if (!photoDone) return setMessage("Please add your photo");
    if (!aadhaarDone) return setMessage("Please add a photo of your Aadhaar card");

    setLoading(true);
    setMessage("");
    try {
      if (photo.images.length || aadhaar.images.length) {
        const uploaded = await uploadDocuments({ photo: photo.images[0], aadhaarFront: aadhaar.images[0] });
        if (!uploaded.success) return setMessage(uploaded.message);
        // Keep what's already uploaded so a retry doesn't ask for it again.
        setUser(uploaded.user);
        photo.clearImages();
        aadhaar.clearImages();
      }
      if (isSeeker && work.length) {
        await api.put("/auth/update-profile", { skills: work });
      }
      const { data } = await api.post("/onboarding/complete");
      if (data.success) {
        // The navigator switches to the app once the welcome popup is closed.
        setCompletedUser(data.user);
        setAlertMessage(data.message);
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed. Please try again.");
      console.log("Quick Setup Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const doneCount = [photoDone, aadhaarDone].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView bottomOffset={28} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <PhotoHero source={heroImage("normal")} style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <Text style={styles.hello}>Welcome, {user.name.split(" ")[0]}</Text>
          <Text style={styles.headerTitle}>{"Two photos and\nyou're ready"}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(doneCount / 2) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{doneCount}/2</Text>
          </View>
        </PhotoHero>

        {/* Photos */}
        <View style={styles.card}>
          <ImagePickerField label="1 · Your photo" hint="Look at the camera, face clearly visible" picker={photo} selfie round done={user.hasPhoto} />
        </View>
        <View style={styles.card}>
          <ImagePickerField label="2 · Aadhaar card" hint="Front side, name and photo readable" picker={aadhaar} done={user.hasAadhaar} />
        </View>

        {/* Work Type (optional) */}
        {isSeeker && sectors.length ? (
          <View style={styles.card}>
            <Text style={styles.label}>What work do you do?</Text>
            <Text style={styles.hint}>Optional · tap all that apply</Text>
            <View style={styles.workGrid}>
              {sectors.map((sector) => {
                const active = work.includes(sector.name);
                return (
                  <Pressable key={sector.id} style={[styles.workTile, active && styles.workTileActive]} onPress={() => toggleWork(sector.name)}>
                    <ImageBackground source={sectorImage(sector.name)} style={styles.workImage} imageStyle={{ borderRadius: 12 }}>
                      <LinearGradient colors={["transparent", "rgba(28,20,14,0.85)"]} style={styles.workShade}>
                        <Text style={styles.workText} numberOfLines={1}>{sector.name}</Text>
                      </LinearGradient>
                      {active ? (
                        <View style={styles.workCheck}>
                          <MaterialIcons name="check" size={16} color="#fff" />
                        </View>
                      ) : null}
                    </ImageBackground>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.privacy}>
          <MaterialIcons name="lock" size={16} color={colors.muted} />
          <Text style={styles.privacyText}>Your Aadhaar is only seen by the Solara verification team.</Text>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {/* Submit Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Button title="Start Using Solara" iconRight="arrow-forward" onPress={handleFinish} loading={loading} />
        </View>

        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logout}>Not you? Logout</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <Alert
        visible={alertVisible}
        tone="success"
        title="You're all set!"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (completedUser) setUser(completedUser);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingBottom: 56, paddingHorizontal: 24 },
  hello: { fontFamily: fonts.semibold, color: "#fde3cf", fontSize: 16 },
  headerTitle: { fontFamily: fonts.extrabold, color: "#fff", fontSize: 30, lineHeight: 36, marginTop: 6, letterSpacing: -0.4 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: "#fbbf24" },
  progressText: { fontFamily: fonts.bold, color: "#fff", fontSize: 14 },
  card: { backgroundColor: colors.card, marginHorizontal: 20, padding: 18, paddingTop: 0, borderRadius: radius.xl, marginBottom: 14, ...shadow.md },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading, marginTop: 18 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  workGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  workTile: { width: "31%", borderRadius: 14, borderWidth: 2.5, borderColor: "transparent" },
  workTileActive: { borderColor: colors.primary },
  workImage: { height: 96, justifyContent: "flex-end" },
  workShade: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 8, paddingTop: 18, paddingBottom: 7 },
  workText: { fontFamily: fonts.bold, fontSize: 12, color: "#fff" },
  workCheck: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  privacy: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, marginHorizontal: 24 },
  privacyText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginTop: 12, fontSize: 14 },
  logout: { fontFamily: fonts.medium, textAlign: "center", color: colors.muted, fontSize: 14, marginTop: 18 },
});
