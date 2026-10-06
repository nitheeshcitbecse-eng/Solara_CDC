import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import tierTheme from "../lib/tierTheme";
import { timeAgo } from "../lib/formatTimeStamp";

// One applicant (hirer and admin views). `application` comes from the API with `seeker`.
export default function ApplicantCard({ application, onPress, showJob = false, children }) {
  const seeker = application.seeker;
  const theme = tierTheme(seeker.tier);
  const headline = seeker.details?.profession
    ? [seeker.details.profession, seeker.details.specialization].filter(Boolean).join(" · ")
    : seeker.skills.join(", ");

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.row}>
        <Avatar userId={seeker.id} name={seeker.name} hasPhoto={seeker.hasPhoto} size={50} color={theme.accent} background={theme.accentSoft} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{seeker.name}</Text>
            {seeker.verified ? <MaterialIcons name="verified" size={16} color={theme.accent} /> : null}
            {application.seen === false ? <View style={styles.newDot} /> : null}
          </View>
          {headline ? <Text style={styles.headline} numberOfLines={1}>{headline}</Text> : null}
          <Text style={styles.meta} numberOfLines={1}>
            {[seeker.city, seeker.experienceYears !== null && seeker.experienceYears !== undefined ? `${seeker.experienceYears} yrs exp` : null, `Applied ${timeAgo(application.createdAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <StatusBadge status={application.status} />
      </View>
      {showJob ? (
        <View style={styles.jobRow}>
          <MaterialIcons name="work-outline" size={15} color={colors.muted} />
          <Text style={styles.jobText} numberOfLines={1}>
            {application.job.title} · {application.job.hirer.businessName || application.job.hirer.name}
          </Text>
        </View>
      ) : null}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.divider, ...shadow.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.heading, flexShrink: 1 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  headline: { fontFamily: fonts.medium, fontSize: 13, color: colors.body, marginTop: 1 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  jobText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.body },
});
