import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import Input from "./Input";
import ChipGroup from "./ChipGroup";
import colors from "../colors";
import { fonts } from "../theme";
import { COMPANY_SIZES, ORGANIZATION_TYPES } from "../lib/premiumForms";

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

// Organisation questions for premium hirers. section: "organization" | "contact" | "all"
export default function PremiumHirerFields({ form, onChange, section = "all" }) {
  const set = (field) => (value) => onChange({ ...form, [field]: value });
  const show = (name) => section === "all" || section === name;

  return (
    <View style={styles.stack}>
      {show("organization") ? (
        <>
          <Input label="Organisation name *" icon="business" placeholder="e.g. Sunrise Multispeciality Hospital" autoCapitalize="words" value={form.businessName} onChangeText={set("businessName")} />
          <View>
            <Label>Organisation type *</Label>
            <ChipGroup wrap options={ORGANIZATION_TYPES} selected={form.organizationType} onSelect={set("organizationType")} />
          </View>
          <View>
            <Label>Organisation size *</Label>
            <ChipGroup wrap options={COMPANY_SIZES} selected={form.companySize} onSelect={set("companySize")} />
          </View>
          <Input label="Registration / GST number" icon="receipt-long" placeholder="GSTIN, CIN or hospital registration" autoCapitalize="characters" value={form.registrationNumber} onChangeText={set("registrationNumber")} />
          <Input label="City *" icon="location-city" placeholder="e.g. Chennai" autoCapitalize="words" value={form.city} onChangeText={set("city")} />
        </>
      ) : null}

      {show("contact") ? (
        <>
          <Input label="Your designation *" icon="badge" placeholder="e.g. HR Manager, Medical Director" autoCapitalize="words" value={form.designation} onChangeText={set("designation")} />
          <Input label="Office address *" icon="place" placeholder="Building, street, area" autoCapitalize="words" value={form.officeAddress} onChangeText={set("officeAddress")} />
          <Input label="Website" icon="language" placeholder="https://" value={form.website} onChangeText={set("website")} />
          <Input label="About the organisation" icon="notes" placeholder="What you do, departments, benefits" autoCapitalize="sentences" multiline maxLength={1000} value={form.about} onChangeText={set("about")} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginBottom: 8 },
});
