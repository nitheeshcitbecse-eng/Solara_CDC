import React from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import StatusBadge from "./StatusBadge";
import TierBadge from "./TierBadge";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import formatSalary, { EMPLOYMENT_LABELS } from "../lib/formatSalary";
import { timeAgo } from "../lib/formatTimeStamp";
import fileUrl from "../lib/fileUrl";
import { sectorImage } from "../lib/sectorImages";

const SHIFT_LABELS = { day: "Day shift", night: "Night shift", flexible: "Flexible" };

function Meta({ icon, text }) {
  if (!text) return null;
  return (
    <View style={styles.meta}>
      <MaterialIcons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// The photo is the hirer's own workplace photo when they uploaded one, otherwise a category photo.
export function jobImage(job) {
  return job.photos?.length ? { uri: fileUrl(job.photos[0]) } : sectorImage(job.sector?.name || job.proposedSector, job.tier);
}

export default function JobCard({ job, onPress, showStatus = false, showTier = false, compact = false, children }) {
  const premium = job.tier === "premium";
  const sectorName = job.sector?.name || (job.proposedSector ? `${job.proposedSector} (new)` : "");

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Photo */}
      <ImageBackground source={jobImage(job)} style={[styles.photo, compact && styles.photoCompact]} imageStyle={styles.photoImage} resizeMode="cover">
        <LinearGradient colors={["rgba(28,20,14,0.05)", "rgba(28,20,14,0.75)"]} style={styles.photoShade}>
          <View style={styles.photoTop}>
            {sectorName ? (
              <View style={styles.sectorPill}>
                <Text style={styles.sectorText} numberOfLines={1}>{sectorName}</Text>
              </View>
            ) : (
              <View />
            )}
            {showStatus ? <StatusBadge status={job.status} /> : showTier ? <TierBadge tier={job.tier} /> : null}
          </View>
          <Text style={styles.salary} numberOfLines={1}>{formatSalary(job)}</Text>
        </LinearGradient>
      </ImageBackground>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
        <View style={styles.companyRow}>
          <Text style={styles.company} numberOfLines={1}>{job.hirer.businessName || job.hirer.name}</Text>
          {job.hirer.verified ? <MaterialIcons name="verified" size={15} color={premium ? colors.premiumGold : colors.primary} /> : null}
          {showStatus && showTier ? <TierBadge tier={job.tier} /> : null}
        </View>

        <View style={styles.metaRow}>
          <Meta icon="place" text={job.address ? `${job.address}, ${job.city}` : job.city} />
          {premium ? (
            <>
              <Meta icon="badge" text={EMPLOYMENT_LABELS[job.employmentType]} />
              <Meta icon="work-history" text={job.minExperience ? `${job.minExperience}+ yrs` : "Freshers ok"} />
            </>
          ) : (
            <>
              <Meta icon="schedule" text={SHIFT_LABELS[job.shift]} />
              {job.openings > 1 ? <Meta icon="groups" text={`${job.openings} openings`} /> : null}
            </>
          )}
        </View>
        {premium && job.qualification ? (
          <View style={{ marginTop: 8 }}>
            <Meta icon="school" text={job.qualification} />
          </View>
        ) : null}

        <Text style={styles.posted}>Posted {timeAgo(job.createdAt)}</Text>

        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 16, borderWidth: 1, borderColor: colors.divider, overflow: "hidden", ...shadow.sm },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  photo: { height: 132 },
  photoCompact: { height: 96 },
  photoImage: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  photoShade: { flex: 1, justifyContent: "space-between", padding: 12 },
  photoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  sectorPill: { backgroundColor: "rgba(255,255,255,0.92)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, maxWidth: "60%" },
  sectorText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.heading },
  salary: { fontFamily: fonts.extrabold, fontSize: 18, color: "#fff", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6 },
  body: { padding: 14, paddingTop: 12 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading, lineHeight: 22 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  company: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, flexShrink: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.neutralSoft, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, alignSelf: "flex-start" },
  metaText: { fontFamily: fonts.medium, fontSize: 12, color: colors.body, maxWidth: 190 },
  posted: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.subtle, marginTop: 10 },
});
