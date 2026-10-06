import React, { useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import Card from "../../../Components/Card";
import Input from "../../../Components/Input";
import Button from "../../../Components/Button";
import ChipGroup from "../../../Components/ChipGroup";
import PhotoStrip from "../../../Components/PhotoStrip";
import TierBadge from "../../../Components/TierBadge";
import Alert from "../../../Components/Alert";
import { AuthContext } from "../../../context/AuthContext";
import api, { multipartConfig } from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import useImagePreview from "../../../lib/useImagePreview";
import useTheme from "../../../lib/useTheme";

const NEW_SECTOR = "new";
const MAX_PHOTOS = 6;

// Daily-wage work is usually paid per day; professionals per year.
const PERIODS = {
  normal: [
    { label: "Per day", value: "day" },
    { label: "Per month", value: "month" },
  ],
  premium: [
    { label: "Per year", value: "year" },
    { label: "Per month", value: "month" },
  ],
};

const SHIFTS = [
  { label: "Day", value: "day" },
  { label: "Night", value: "night" },
  { label: "Flexible", value: "flexible" },
];

const EMPLOYMENT_TYPES = [
  { label: "Full-time", value: "full_time" },
  { label: "Part-time", value: "part_time" },
  { label: "Contract", value: "contract" },
  { label: "Internship", value: "internship" },
];

const emptyForm = (premium) => ({
  title: "",
  description: "",
  proposedSector: "",
  city: "",
  address: "",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: premium ? "year" : "day",
  shift: "day",
  openings: "1",
  employmentType: "full_time",
  minExperience: "",
  qualification: "",
  requiredSkills: "",
});

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export default function AddJobScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const premium = user.tier === "premium";
  const [sectors, setSectors] = useState([]);
  const [sectorId, setSectorId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(premium));
  const photos = useImagePreview({ max: MAX_PHOTOS });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

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

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const digits = (field) => (text) => update(field)(text.replace(/\D/g, ""));

  const handleAddJob = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.city.trim() || !form.salaryMin || !form.salaryMax) {
      return setMessage("Please fill all required fields");
    }
    if (!sectorId) return setMessage("Choose a sector");
    if (sectorId === NEW_SECTOR && form.proposedSector.trim().length < 2) return setMessage("Enter the new sector name");
    if (form.description.trim().length < 20) return setMessage("Describe the job in at least 20 characters");
    if (Number(form.salaryMax) < Number(form.salaryMin)) return setMessage("Maximum salary must be at least the minimum");
    if (premium && !form.qualification.trim()) return setMessage("Enter the qualification needed");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      address: form.address.trim() || null,
      salaryMin: Number(form.salaryMin),
      salaryMax: Number(form.salaryMax),
      salaryPeriod: form.salaryPeriod,
      shift: form.shift,
      openings: Number(form.openings) || 1,
      ...(sectorId === NEW_SECTOR ? { proposedSector: form.proposedSector.trim() } : { sectorId }),
      ...(premium
        ? {
            employmentType: form.employmentType,
            minExperience: form.minExperience ? Number(form.minExperience) : null,
            qualification: form.qualification.trim(),
            requiredSkills: form.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean),
          }
        : {}),
    };

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.post("/jobs/add-job", payload);
      if (!data.success) return setMessage(data.message);

      let resultMessage = data.message;
      if (photos.images.length) {
        const formData = new FormData();
        photos.images.forEach((image) => formData.append("photos", image));
        try {
          await api.post(`/jobs/upload-photos/${data.job.id}`, formData, multipartConfig);
        } catch (err) {
          resultMessage = `${data.message}, but the photos could not be uploaded: ${err.response?.data?.message || err.message}`;
          console.log("Upload Photos Error:", err.message);
        }
      }

      setAlertMessage(resultMessage);
      setAlertVisible(true);
      setForm(emptyForm(premium));
      setSectorId(null);
      photos.clearImages();
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
      console.log("Add Job Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectorOptions = [...sectors.map((sector) => ({ label: sector.name, value: sector.id })), { label: "+ New sector", value: NEW_SECTOR }];

  return (
    <Screen
      title={premium ? "Post an Opening" : "Post Work"}
      onBack={() => navigation.goBack()}
      footer={
        <>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button title={premium ? "Publish Opening" : "Post Job"} icon="publish" onPress={handleAddJob} loading={loading} />
        </>
      }
    >
      {/* Audience */}
      <View style={[styles.audience, { backgroundColor: theme.accentSoft }]}>
        <TierBadge tier={user.tier} />
        <Text style={styles.audienceText}>{premium ? "Only premium professionals will see this opening" : "Only daily workers will see this job"}</Text>
      </View>

      {/* Basics */}
      <Card title="Basics">
        <View style={styles.stack}>
          <Input
            label="Job title *"
            icon="work-outline"
            placeholder={premium ? "e.g. General Physician, Site Engineer" : "e.g. Mason helper, House help"}
            autoCapitalize="sentences"
            maxLength={80}
            value={form.title}
            onChangeText={update("title")}
          />
          <View>
            <Label>Sector *</Label>
            <ChipGroup wrap options={sectorOptions} selected={sectorId} onSelect={setSectorId} />
          </View>
          {sectorId === NEW_SECTOR ? (
            <Input
              label="New sector name"
              hint="New sectors are reviewed by Solara before the job goes live"
              icon="category"
              placeholder="e.g. Gardening"
              autoCapitalize="words"
              maxLength={50}
              value={form.proposedSector}
              onChangeText={update("proposedSector")}
            />
          ) : null}
          <Input
            label="Description *"
            icon="notes"
            placeholder={premium ? "Responsibilities, team, benefits, working hours" : "Daily tasks, working hours, what you provide"}
            autoCapitalize="sentences"
            multiline
            maxLength={2000}
            value={form.description}
            onChangeText={update("description")}
          />
          <View style={styles.row}>
            <Input label="City *" icon="location-city" placeholder="Chennai" autoCapitalize="words" value={form.city} onChangeText={update("city")} style={{ flex: 1 }} />
            <Input label="Area" icon="place" placeholder="Adyar" autoCapitalize="words" maxLength={200} value={form.address} onChangeText={update("address")} style={{ flex: 1 }} />
          </View>
        </View>
      </Card>

      {/* Pay & schedule */}
      <Card title="Pay & schedule">
        <View style={styles.stack}>
          <View style={styles.row}>
            <Input label="Min salary (₹) *" placeholder="Minimum" keyboardType="number-pad" maxLength={8} value={form.salaryMin} onChangeText={digits("salaryMin")} style={{ flex: 1 }} />
            <Input label="Max salary (₹) *" placeholder="Maximum" keyboardType="number-pad" maxLength={8} value={form.salaryMax} onChangeText={digits("salaryMax")} style={{ flex: 1 }} />
          </View>
          <ChipGroup options={PERIODS[user.tier] || PERIODS.normal} selected={form.salaryPeriod} onSelect={update("salaryPeriod")} />
          {premium ? (
            <View>
              <Label>Job type</Label>
              <ChipGroup wrap options={EMPLOYMENT_TYPES} selected={form.employmentType} onSelect={update("employmentType")} />
            </View>
          ) : (
            <View>
              <Label>Shift</Label>
              <ChipGroup options={SHIFTS} selected={form.shift} onSelect={update("shift")} />
            </View>
          )}
          <Input label="Openings" icon="groups" placeholder="1" keyboardType="number-pad" maxLength={3} value={form.openings} onChangeText={digits("openings")} />
        </View>
      </Card>

      {/* Requirements (premium) */}
      {premium ? (
        <Card title="Requirements">
          <View style={styles.stack}>
            <Input label="Qualification needed *" icon="school" placeholder="e.g. MBBS, MD / B.E. Civil" autoCapitalize="characters" maxLength={100} value={form.qualification} onChangeText={update("qualification")} />
            <Input label="Minimum experience (years)" icon="work-history" placeholder="0 for freshers" keyboardType="number-pad" maxLength={2} value={form.minExperience} onChangeText={digits("minExperience")} />
            <Input label="Required skills" hint="Separate with commas" icon="build" placeholder="e.g. ICU care, AutoCAD, React" autoCapitalize="words" value={form.requiredSkills} onChangeText={update("requiredSkills")} />
          </View>
        </Card>
      ) : null}

      {/* Photos */}
      <Card title="Workplace photos" right={<Text style={styles.count}>{photos.images.length}/{MAX_PHOTOS}</Text>}>
        <Text style={styles.photoHint}>Jobs with photos get more trust from applicants.</Text>
        <PhotoStrip uris={photos.images.map((image) => image.uri)} onRemove={photos.removeImage} />
        <Pressable style={[styles.pickButton, { borderColor: theme.accent }]} onPress={photos.pickImages}>
          <MaterialIcons name="add-photo-alternate" size={22} color={theme.accent} />
          <Text style={[styles.pickText, { color: theme.accent }]}>Add photos</Text>
        </Pressable>
        {photos.error ? <Text style={styles.message}>{photos.error}</Text> : null}
      </Card>

      <Alert visible={alertVisible} tone="success" title="Done" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  audience: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 14, flexWrap: "wrap" },
  audienceText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.body },
  stack: { gap: 16 },
  row: { flexDirection: "row", gap: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginBottom: 8 },
  count: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  photoHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 6 },
  pickButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", marginTop: 10 },
  pickText: { fontFamily: fonts.bold, fontSize: 14.5 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 10, fontSize: 14 },
});
