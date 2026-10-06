import React, { useCallback, useContext, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeatureCard from "../Components/FeatureCard";
import SidebarMenu from "../Components/SidebarMenu";
import ConfirmModal from "../Components/ConfirmModal";
import Avatar from "../Components/Avatar";
import TierBadge from "../Components/TierBadge";
import StatCard from "../Components/StatCard";
import SectionHeader from "../Components/SectionHeader";
import JobCard from "../Components/JobCard";
import ListItem from "../Components/ListItem";
import Card from "../Components/Card";
import PhotoHero from "../Components/PhotoHero";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import colors from "../colors";
import { fonts, radius, shadow } from "../theme";
import tierTheme, { themeForUser } from "../lib/tierTheme";
import { heroImage } from "../lib/sectorImages";

// Quick actions per role, and per tier for seekers and hirers.
const roleBoxes = {
  seeker: {
    normal: [
      { title: "Find Work", icon: "search", screen: "FindJobsScreen" },
      { title: "My Applications", icon: "assignment", screen: "MyApplicationsScreen" },
      { title: "Messages", icon: "chat-bubble-outline", screen: "MessagesScreen" },
      { title: "Saved Jobs", icon: "bookmark-border", screen: "SavedJobsScreen" },
    ],
    premium: [
      { title: "Browse Openings", subtitle: "Matched to your profession", icon: "travel-explore", screen: "FindJobsScreen" },
      { title: "Applications", subtitle: "Track every stage", icon: "assignment-turned-in", screen: "MyApplicationsScreen" },
      { title: "Shortlist", subtitle: "Openings you saved", icon: "bookmark-border", screen: "SavedJobsScreen" },
      { title: "Messages", subtitle: "Talk to recruiters", icon: "forum", screen: "MessagesScreen" },
    ],
  },
  hirer: {
    normal: [
      { title: "Post Work", icon: "add-circle-outline", screen: "AddJobScreen", needsVerification: true },
      { title: "My Jobs", icon: "work-outline", screen: "ViewJobsScreen" },
      { title: "Messages", icon: "chat-bubble-outline", screen: "MessagesScreen" },
      { title: "Close a Job", icon: "work-off", screen: "CloseJobScreen" },
    ],
    premium: [
      { title: "Post an Opening", subtitle: "Reach verified professionals", icon: "add-business", screen: "AddJobScreen", needsVerification: true },
      { title: "Openings", subtitle: "Candidates for each role", icon: "work-outline", screen: "ViewJobsScreen" },
      { title: "Messages", subtitle: "Approved candidates", icon: "forum", screen: "MessagesScreen" },
      { title: "Close an Opening", subtitle: "Mark roles as filled", icon: "work-off", screen: "CloseJobScreen" },
    ],
  },
  admin: [
    { title: "Manage Users", subtitle: "Workers & hirers", icon: "people-outline", screen: "ManageUsersScreen", badgeKey: "pendingVerifications" },
    { title: "Shortlist Approvals", subtitle: "Premium contact sharing", icon: "how-to-reg", screen: "ShortlistApprovalsScreen", badgeKey: "pendingShortlists" },
    { title: "Moderate Jobs", subtitle: "Review & take down", icon: "fact-check", screen: "ModerateJobsScreen", badgeKey: "pendingJobs" },
    { title: "Reports", subtitle: "User complaints", icon: "flag", screen: "ReportsScreen", badgeKey: "openReports" },
    { title: "Sectors", subtitle: "Job categories", icon: "category", screen: "ManageSectorsScreen" },
    { title: "Audit Logs", subtitle: "Every admin action", icon: "history", screen: "AuditLogsScreen" },
  ],
};

const SUBTITLES = {
  seeker: { normal: "Find daily work near you", premium: "Opportunities for professionals" },
  hirer: { normal: "Hire trusted daily workers", premium: "Hire verified professionals" },
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function UserScreen({ navigation }) {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const theme = themeForUser(user);
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [unread, setUnread] = useState(0);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user.role === "admin";
  const isSeeker = user.role === "seeker";
  const premium = user.tier === "premium";

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/get-all-notifications");
      if (data.success) setUnread(data.unread);

      if (user.role === "admin") {
        const res = await api.get("/admin/get-dashboard-stats");
        if (res.data.success) setSummary({ stats: res.data.stats });
      } else if (user.role === "seeker") {
        const [apps, jobs] = await Promise.all([api.get("/applications/get-my-applications"), api.get("/jobs/get-all-jobs")]);
        const applications = apps.data.applications || [];
        setSummary({
          applied: applications.length,
          shortlisted: applications.filter((item) => item.status === "shortlisted").length,
          hired: applications.filter((item) => item.status === "hired").length,
          jobs: (jobs.data.jobs || []).filter((job) => !job.myApplicationId).slice(0, 3),
          totalJobs: (jobs.data.jobs || []).length,
        });
      } else {
        const res = await api.get("/jobs/get-my-jobs");
        const jobs = res.data.jobs || [];
        setSummary({
          active: jobs.filter((job) => job.status === "active").length,
          applicants: jobs.reduce((sum, job) => sum + job.applicantCount, 0),
          newApplicants: jobs.reduce((sum, job) => sum + job.newApplicants, 0),
          jobs: jobs.slice(0, 3),
        });
      }
    } catch (err) {
      console.log("Dashboard Error:", err.message);
    }
  }, [user.role]);

  // Refresh every time the dashboard comes back into view.
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), refreshUser()]);
    setRefreshing(false);
  };

  const openBox = (box) => {
    if (box.needsVerification && user.verificationStatus !== "verified") {
      navigation.navigate("VerificationScreen");
      return;
    }
    navigation.navigate(box.screen);
  };

  const boxes = isAdmin ? roleBoxes.admin : roleBoxes[user.role][user.tier] || [];
  const verification = user.verificationStatus;
  const showHirerBanner = user.role === "hirer" && verification !== "verified";
  const showRejectedBanner = isSeeker && verification === "rejected";
  const stats = summary?.stats;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.accent]} progressViewOffset={insets.top + 20} />}
      >
        {/* Hero */}
        <PhotoHero source={heroImage(theme.name)} tint={theme.gradient} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.topRow}>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.circleButton} hitSlop={6}>
              <MaterialIcons name="menu" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("NotificationsScreen")} style={styles.circleButton} hitSlop={6}>
              <MaterialIcons name="notifications-none" size={22} color="#fff" />
              {unread ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <Pressable style={styles.identityRow} onPress={() => navigation.navigate("ProfileScreen")}>
            <Avatar userId={user.id} name={user.name} hasPhoto={user.hasPhoto} size={56} background="#fff" color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: theme.onGradientSoft }]}>{greeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>{user.role === "hirer" && user.businessName ? user.businessName : user.name}</Text>
            </View>
          </Pressable>

          <View style={styles.pillRow}>
            {isAdmin ? (
              <View style={styles.adminPill}>
                <MaterialIcons name="admin-panel-settings" size={14} color="#fff" />
                <Text style={styles.adminPillText}>OWNER CONSOLE</Text>
              </View>
            ) : (
              <>
                <TierBadge tier={user.tier} onDark />
                <Text style={[styles.subtitle, { color: theme.onGradientSoft }]}>{SUBTITLES[user.role][user.tier]}</Text>
              </>
            )}
          </View>

          {/* Search shortcut for job seekers */}
          {isSeeker ? (
            <Pressable style={styles.searchBar} onPress={() => navigation.navigate("FindJobsScreen")}>
              <MaterialIcons name="search" size={22} color={colors.subtle} />
              <Text style={styles.searchText}>{premium ? "Search openings, e.g. Physician" : "Search work, e.g. Driver, Cook"}</Text>
            </Pressable>
          ) : null}
        </PhotoHero>

        <View style={styles.content}>
          {/* Stats */}
          {isSeeker ? (
            <View style={styles.statsRow}>
              <StatCard icon="send" value={summary?.applied} label="Applied" onPress={() => navigation.navigate("MyApplicationsScreen")} />
              <StatCard icon="star-outline" value={summary?.shortlisted} label="Shortlisted" tone={colors.warning} onPress={() => navigation.navigate("MyApplicationsScreen")} />
              <StatCard icon="verified" value={summary?.hired} label="Hired" tone={colors.success} onPress={() => navigation.navigate("MyApplicationsScreen")} />
            </View>
          ) : null}
          {user.role === "hirer" ? (
            <View style={styles.statsRow}>
              <StatCard icon="work-outline" value={summary?.active} label="Live jobs" onPress={() => navigation.navigate("ViewJobsScreen")} />
              <StatCard icon="people-outline" value={summary?.applicants} label="Applicants" tone={colors.success} onPress={() => navigation.navigate("ViewJobsScreen")} />
              <StatCard icon="fiber-new" value={summary?.newApplicants} label="New" tone={colors.error} onPress={() => navigation.navigate("ViewJobsScreen")} />
            </View>
          ) : null}
          {isAdmin ? (
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard icon="verified-user" value={stats?.pendingVerifications} label="Verifications" tone={colors.warning} onPress={() => navigation.navigate("VerifyUsersScreen")} />
                <StatCard icon="how-to-reg" value={stats?.pendingShortlists} label="Shortlists" tone={colors.premiumGold} onPress={() => navigation.navigate("ShortlistApprovalsScreen")} />
              </View>
              <View style={styles.statsRow}>
                <StatCard icon="fact-check" value={stats?.pendingJobs} label="Jobs to review" onPress={() => navigation.navigate("ReviewJobsScreen")} />
                <StatCard icon="flag" value={stats?.openReports} label="Open reports" tone={colors.error} onPress={() => navigation.navigate("ReportsScreen")} />
              </View>
            </View>
          ) : null}

          {/* Verification Banners */}
          {showHirerBanner || showRejectedBanner ? (
            <Pressable style={[styles.banner, verification === "rejected" ? styles.bannerError : styles.bannerWarn]} onPress={() => navigation.navigate("VerificationScreen")}>
              <View style={[styles.bannerIcon, { backgroundColor: verification === "rejected" ? colors.error : colors.warning }]}>
                <MaterialIcons name="verified-user" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>
                  {verification === "pending" ? "Verification in progress" : verification === "rejected" ? "Verification rejected" : "Verify your identity"}
                </Text>
                <Text style={styles.bannerText}>
                  {verification === "pending"
                    ? "You can post jobs once our team approves your Aadhaar."
                    : verification === "rejected"
                      ? "Tap to upload your Aadhaar again."
                      : "Upload your Aadhaar to start posting jobs."}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ) : null}

          {/* Quick Actions */}
          <SectionHeader title={isAdmin ? "Manage" : "Quick actions"} />
          <View style={styles.grid}>
            {boxes.map((box) => (
              <FeatureCard
                key={box.screen}
                title={box.title}
                subtitle={box.subtitle}
                icon={box.icon}
                large={!isAdmin && !premium}
                badge={stats?.[box.badgeKey]}
                onPress={() => openBox(box)}
              />
            ))}
          </View>

          {/* Seeker: jobs for you */}
          {isSeeker && summary?.jobs?.length ? (
            <>
              <SectionHeader
                title={premium ? "Recommended openings" : "Work near you"}
                subtitle={`${summary.totalJobs} open ${summary.totalJobs === 1 ? "job" : "jobs"}`}
                actionLabel="See all"
                onAction={() => navigation.navigate("FindJobsScreen")}
              />
              {summary.jobs.map((job) => (
                <JobCard key={job.id} job={job} onPress={() => navigation.navigate("JobDetailsScreen", { jobId: job.id })} />
              ))}
            </>
          ) : null}

          {/* Hirer: latest jobs */}
          {user.role === "hirer" && summary?.jobs?.length ? (
            <>
              <SectionHeader title={premium ? "Your openings" : "Your jobs"} actionLabel="See all" onAction={() => navigation.navigate("ViewJobsScreen")} />
              <Card padded={false} style={{ paddingHorizontal: 16 }}>
                {summary.jobs.map((job, index) => (
                  <ListItem
                    key={job.id}
                    icon={job.sector?.icon || "work"}
                    title={job.title}
                    subtitle={`${job.applicantCount} applicants${job.newApplicants ? ` · ${job.newApplicants} new` : ""} · ${job.status.replace("_", " ")}`}
                    last={index === summary.jobs.length - 1}
                    onPress={() => navigation.navigate("JobApplicantsScreen", { jobId: job.id, jobTitle: job.title })}
                  />
                ))}
              </Card>
            </>
          ) : null}

          {/* Admin: Normal vs Premium */}
          {isAdmin && stats ? (
            <>
              <SectionHeader title="Platform" subtitle="Normal and premium are kept separate" />
              {["normal", "premium"].map((tier) => {
                const tierStyle = tierTheme(tier);
                return (
                  <Card key={tier}>
                    <View style={styles.tierHead}>
                      <TierBadge tier={tier} />
                      <Text style={styles.tierCaption}>{tier === "premium" ? "Professionals" : "Daily work"}</Text>
                    </View>
                    <View style={styles.tierStats}>
                      {[
                        { label: "Workers", value: stats[tier].seekers },
                        { label: "Hirers", value: stats[tier].hirers },
                        { label: "Active jobs", value: stats[tier].activeJobs },
                      ].map((item) => (
                        <View key={item.label} style={styles.tierStat}>
                          <Text style={[styles.tierValue, { color: tierStyle.accentDark }]}>{item.value}</Text>
                          <Text style={styles.tierLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                );
              })}
            </>
          ) : null}
        </View>
      </ScrollView>

      <SidebarMenu
        visible={menuVisible}
        user={user}
        onClose={() => setMenuVisible(false)}
        onNavigate={(screen) => {
          setMenuVisible(false);
          navigation.navigate(screen);
        }}
        onLogout={() => {
          setMenuVisible(false);
          setLogoutVisible(true);
        }}
      />

      <ConfirmModal
        visible={logoutVisible}
        title="Log out?"
        message="You can log back in any time with your mobile number or email."
        confirmText="Logout"
        icon="logout"
        danger
        onConfirm={async () => {
          setLogoutVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 64, paddingHorizontal: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  circleButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", justifyContent: "center", alignItems: "center" },
  bellBadge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, justifyContent: "center", alignItems: "center", paddingHorizontal: 4, borderWidth: 1.5, borderColor: "#fff" },
  bellBadgeText: { color: "#fff", fontFamily: fonts.bold, fontSize: 10 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  greeting: { fontFamily: fonts.medium, fontSize: 14 },
  name: { fontFamily: fonts.extrabold, color: "#fff", fontSize: 24, letterSpacing: -0.3 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" },
  subtitle: { fontFamily: fonts.medium, fontSize: 13.5 },
  adminPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  adminPillText: { color: "#fff", fontFamily: fonts.extrabold, fontSize: 10.5, letterSpacing: 0.7 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, marginTop: 18, ...shadow.md },
  searchText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.subtle },
  content: { paddingHorizontal: 20, marginTop: -40 },
  statsGrid: { gap: 10, marginBottom: 6 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: 14, marginTop: 10, borderWidth: 1 },
  bannerWarn: { backgroundColor: colors.warningSoft, borderColor: "#fde68a" },
  bannerError: { backgroundColor: colors.errorSoft, borderColor: "#fecaca" },
  bannerIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.heading },
  bannerText: { fontFamily: fonts.regular, fontSize: 13, color: colors.body, marginTop: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tierHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierCaption: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  tierStats: { flexDirection: "row", marginTop: 14 },
  tierStat: { flex: 1 },
  tierValue: { fontFamily: fonts.extrabold, fontSize: 22 },
  tierLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
});
