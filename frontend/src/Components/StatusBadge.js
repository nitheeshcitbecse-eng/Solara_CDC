import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import colors from "../colors";
import { fonts } from "../theme";

const STYLES = {
  // Applications
  applied: { label: "Applied", color: colors.primaryDark, background: colors.primarySoft },
  shortlisted: { label: "Shortlisted", color: colors.premiumGold, background: colors.premiumGoldSoft },
  hired: { label: "Hired", color: colors.success, background: colors.successSoft },
  rejected: { label: "Rejected", color: colors.error, background: colors.errorSoft },
  // Jobs
  active: { label: "Active", color: colors.success, background: colors.successSoft },
  pending_review: { label: "In Review", color: colors.warning, background: colors.warningSoft },
  closed: { label: "Closed", color: colors.muted, background: colors.neutralSoft },
  taken_down: { label: "Taken Down", color: colors.error, background: colors.errorSoft },
  // Verification & contact approval
  none: { label: "Not Verified", color: colors.muted, background: colors.neutralSoft },
  pending: { label: "Pending", color: colors.warning, background: colors.warningSoft },
  verified: { label: "Verified", color: colors.success, background: colors.successSoft },
  approved: { label: "Approved", color: colors.success, background: colors.successSoft },
  // Accounts & reports
  suspended: { label: "Suspended", color: colors.warning, background: colors.warningSoft },
  banned: { label: "Banned", color: colors.error, background: colors.errorSoft },
  open: { label: "Open", color: colors.warning, background: colors.warningSoft },
  resolved: { label: "Resolved", color: colors.success, background: colors.successSoft },
  dismissed: { label: "Dismissed", color: colors.muted, background: colors.neutralSoft },
};

export default function StatusBadge({ status, label }) {
  const style = STYLES[status] || { label: status, color: colors.muted, background: colors.neutralSoft };
  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <View style={[styles.dot, { backgroundColor: style.color }]} />
      <Text style={[styles.text, { color: style.color }]}>{label || style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.bold, fontSize: 11.5 },
});
