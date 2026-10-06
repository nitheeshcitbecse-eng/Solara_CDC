import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import Screen from "../Components/Screen";
import Card from "../Components/Card";
import Input from "../Components/Input";
import Button from "../Components/Button";
import PremiumSeekerFields from "../Components/PremiumSeekerFields";
import PremiumHirerFields from "../Components/PremiumHirerFields";
import Alert from "../Components/Alert";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import colors from "../colors";
import { fonts } from "../theme";
import {
  hirerPayload,
  initHirerForm,
  initSeekerForm,
  seekerPayload,
  validateHirerSection,
  validateSeekerSection,
} from "../lib/premiumForms";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useContext(AuthContext);
  const premiumSeeker = user.role === "seeker" && user.tier === "premium";
  const premiumHirer = user.role === "hirer" && user.tier === "premium";

  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    city: user.city || "",
    about: user.about || "",
    skills: (user.skills || []).join(", "),
    experienceYears: user.experienceYears !== null && user.experienceYears !== undefined ? String(user.experienceYears) : "",
    businessName: user.businessName || "",
  });
  const [premiumForm, setPremiumForm] = useState(() =>
    premiumSeeker ? initSeekerForm(user) : premiumHirer ? initHirerForm(user) : null
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSave = async () => {
    if (form.name.trim().length < 2) return setMessage("Please enter your name");
    if ((form.phone || user.role !== "admin") && !/^[6-9]\d{9}$/.test(form.phone)) {
      return setMessage("Enter a valid 10-digit mobile number");
    }
    if (form.email && !EMAIL_PATTERN.test(form.email.trim())) return setMessage("Enter a valid email address");
    if (user.tier === "premium" && !form.email.trim()) return setMessage("Premium accounts need an email address");

    let payload = { name: form.name.trim(), email: form.email.trim() || null };
    if (form.phone) payload.phone = form.phone;
    if (premiumSeeker || premiumHirer) {
      const error = premiumSeeker ? validateSeekerSection(premiumForm, "all") : validateHirerSection(premiumForm, "all");
      if (error) return setMessage(error);
      payload = { ...payload, ...(premiumSeeker ? seekerPayload(premiumForm) : hirerPayload(premiumForm)) };
    } else {
      payload.city = form.city.trim();
      payload.about = form.about.trim();
      if (user.role === "seeker") {
        payload.skills = form.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
        payload.experienceYears = form.experienceYears ? Number(form.experienceYears) : null;
      }
      if (user.role === "hirer") payload.businessName = form.businessName.trim();
    }

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.put("/auth/update-profile", payload);
      if (data.success) {
        setUser(data.user);
        setAlertMessage(data.message);
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save your profile");
      console.log("Update Profile Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Edit Profile"
      onBack={() => navigation.goBack()}
      footer={
        <>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button title="Save Changes" icon="check" onPress={handleSave} loading={loading} />
        </>
      }
    >
      {/* Account */}
      <Card title="Account">
        <View style={styles.stack}>
          <Input label="Full name" icon="person-outline" placeholder="Full name" autoCapitalize="words" value={form.name} onChangeText={update("name")} />
          <Input
            label="Mobile number"
            icon="phone-iphone"
            prefix="+91"
            placeholder="10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
            value={form.phone}
            onChangeText={(text) => update("phone")(text.replace(/\D/g, ""))}
          />
          <Input
            label={user.tier === "premium" ? "Email" : "Email (optional)"}
            hint={user.tier !== "premium" ? "Needed to reset a forgotten password" : undefined}
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            value={form.email}
            onChangeText={update("email")}
          />
        </View>
      </Card>

      {/* Normal users: a few simple fields */}
      {!premiumSeeker && !premiumHirer ? (
        <Card title={user.role === "hirer" ? "Business" : user.role === "seeker" ? "Your work" : "Details"}>
          <View style={styles.stack}>
            <Input label="City" icon="place" placeholder="e.g. Chennai" autoCapitalize="words" value={form.city} onChangeText={update("city")} />
            {user.role === "hirer" ? (
              <Input label="Business name (optional)" icon="storefront" placeholder="e.g. Arun Home Services" autoCapitalize="words" value={form.businessName} onChangeText={update("businessName")} />
            ) : null}
            {user.role === "seeker" ? (
              <>
                <Input label="Work you do" hint="Separate with commas" icon="build" placeholder="e.g. Construction, House Help" autoCapitalize="words" value={form.skills} onChangeText={update("skills")} />
                <Input
                  label="Years of experience"
                  icon="timeline"
                  placeholder="e.g. 3"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={form.experienceYears}
                  onChangeText={(text) => update("experienceYears")(text.replace(/\D/g, ""))}
                />
              </>
            ) : null}
            <Input label="About" icon="notes" placeholder="Languages you speak, past work" autoCapitalize="sentences" multiline maxLength={1000} value={form.about} onChangeText={update("about")} />
          </View>
        </Card>
      ) : null}

      {/* Premium users: the full professional / organisation profile */}
      {premiumSeeker ? (
        <Card title="Professional profile">
          <PremiumSeekerFields form={premiumForm} onChange={setPremiumForm} />
        </Card>
      ) : null}
      {premiumHirer ? (
        <Card title="Organisation">
          <PremiumHirerFields form={premiumForm} onChange={setPremiumForm} />
        </Card>
      ) : null}

      <Alert
        visible={alertVisible}
        tone="success"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  message: { fontFamily: fonts.medium, textAlign: "center", color: colors.error, marginBottom: 10, fontSize: 14 },
});
