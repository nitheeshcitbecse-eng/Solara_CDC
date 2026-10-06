import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import Input from "./Input";
import ChipGroup from "./ChipGroup";
import colors from "../colors";
import { fonts } from "../theme";
import { NOTICE_PERIODS, PROFESSIONS } from "../lib/premiumForms";

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

// Professional profile questions. section: "profession" | "experience" | "preferences" | "all"
export default function PremiumSeekerFields({ form, onChange, section = "all" }) {
  const set = (field) => (value) => onChange({ ...form, [field]: value });
  const digits = (field) => (text) => set(field)(text.replace(/\D/g, ""));
  const show = (name) => section === "all" || section === name;

  return (
    <View style={styles.stack}>
      {show("profession") ? (
        <>
          <View>
            <Label>Profession *</Label>
            <ChipGroup wrap options={PROFESSIONS.map((item) => ({ label: item, value: item }))} selected={form.profession} onSelect={set("profession")} />
          </View>
          {form.profession === "Other" ? (
            <Input icon="work-outline" placeholder="Your profession" autoCapitalize="words" value={form.otherProfession} onChangeText={set("otherProfession")} />
          ) : null}
          <Input label="Specialisation" icon="psychology" placeholder="e.g. Cardiology, Civil, Data Science" autoCapitalize="words" value={form.specialization} onChangeText={set("specialization")} />
          <Input label="Highest qualification *" icon="school" placeholder="e.g. MBBS, MD / B.E. Civil" autoCapitalize="characters" value={form.qualification} onChangeText={set("qualification")} />
          <Input label="College / university" icon="account-balance" placeholder="e.g. Madras Medical College" autoCapitalize="words" value={form.institution} onChangeText={set("institution")} />
          <Input label="Year of graduation" icon="event" placeholder="e.g. 2016" keyboardType="number-pad" maxLength={4} value={form.graduationYear} onChangeText={digits("graduationYear")} />
        </>
      ) : null}

      {show("experience") ? (
        <>
          <Input label="Years of experience *" icon="timeline" placeholder="e.g. 5" keyboardType="number-pad" maxLength={2} value={form.experienceYears} onChangeText={digits("experienceYears")} />
          <Input label="Current employer" icon="business" placeholder="Hospital / company name" autoCapitalize="words" value={form.currentEmployer} onChangeText={set("currentEmployer")} />
          <Input label="Current designation" icon="badge" placeholder="e.g. Resident Doctor, Site Engineer" autoCapitalize="words" value={form.currentDesignation} onChangeText={set("currentDesignation")} />
          <Input label="Registration / licence no." icon="verified" placeholder="e.g. Medical Council reg. no." autoCapitalize="characters" value={form.licenseNumber} onChangeText={set("licenseNumber")} />
          <Input label="Key skills *" hint="Separate with commas" icon="build" placeholder="e.g. Emergency care, AutoCAD, React" autoCapitalize="words" value={form.skills} onChangeText={set("skills")} />
        </>
      ) : null}

      {show("preferences") ? (
        <>
          <Input label="City you live in *" icon="place" placeholder="e.g. Chennai" autoCapitalize="words" value={form.city} onChangeText={set("city")} />
          <Input label="Preferred work cities" icon="map" placeholder="e.g. Chennai, Bengaluru" autoCapitalize="words" value={form.preferredCities} onChangeText={set("preferredCities")} />
          <Input label="Languages you speak *" icon="translate" placeholder="e.g. English, Tamil, Hindi" autoCapitalize="words" value={form.languages} onChangeText={set("languages")} />
          <Input label="Expected salary (₹ per year)" icon="payments" placeholder="e.g. 1200000" keyboardType="number-pad" maxLength={9} value={form.expectedSalary} onChangeText={digits("expectedSalary")} />
          <View>
            <Label>Notice period</Label>
            <ChipGroup wrap options={NOTICE_PERIODS} selected={form.noticePeriod} onSelect={set("noticePeriod")} />
          </View>
          <Input label="LinkedIn / portfolio" icon="link" placeholder="https://" value={form.linkedinUrl} onChangeText={set("linkedinUrl")} />
          <Input label="Professional summary" icon="notes" placeholder="A few lines about your experience and strengths" autoCapitalize="sentences" multiline maxLength={1000} value={form.about} onChangeText={set("about")} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginBottom: 8 },
});
