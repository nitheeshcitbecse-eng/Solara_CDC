import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import Card from "../../Components/Card";
import ListItem from "../../Components/ListItem";
import SectionHeader from "../../Components/SectionHeader";
import StatCard from "../../Components/StatCard";
import api from "../../api/api";
import colors from "../../colors";

export default function ManageUsersScreen({ navigation }) {
  const [stats, setStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchStats = async () => {
        try {
          const { data } = await api.get("/admin/get-dashboard-stats");
          if (data.success) setStats(data.stats);
        } catch (err) {
          console.log("Fetch Stats Error:", err.message);
        }
      };
      fetchStats();
    }, [])
  );

  // Normal and premium people are kept apart, so each has its own page.
  const sections = [
    {
      title: "Normal · daily work",
      items: [
        { title: "Normal workers", subtitle: `${stats?.normal.seekers ?? "–"} people`, icon: "handyman", params: { role: "seeker", tier: "normal" } },
        { title: "Normal hirers", subtitle: `${stats?.normal.hirers ?? "–"} people`, icon: "storefront", params: { role: "hirer", tier: "normal" } },
      ],
    },
    {
      title: "Premium · professionals",
      items: [
        { title: "Premium professionals", subtitle: `${stats?.premium.seekers ?? "–"} people`, icon: "workspace-premium", params: { role: "seeker", tier: "premium" } },
        { title: "Premium hirers", subtitle: `${stats?.premium.hirers ?? "–"} organisations`, icon: "business", params: { role: "hirer", tier: "premium" } },
      ],
    },
  ];

  return (
    <Screen title="Manage Users" onBack={() => navigation.goBack()}>
      <View style={styles.statsRow}>
        <StatCard icon="verified-user" value={stats?.pendingVerifications} label="To verify" tone={colors.warning} onPress={() => navigation.navigate("VerifyUsersScreen")} />
        <StatCard icon="how-to-reg" value={stats?.pendingShortlists} label="Shortlists" tone={colors.premiumGold} onPress={() => navigation.navigate("ShortlistApprovalsScreen")} />
      </View>

      {sections.map((section) => (
        <View key={section.title}>
          <SectionHeader title={section.title} style={{ marginTop: 18 }} />
          <Card padded={false} style={styles.list}>
            {section.items.map((item, index) => (
              <ListItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                last={index === section.items.length - 1}
                onPress={() => navigation.navigate("ViewUsersScreen", item.params)}
              />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10 },
  list: { paddingHorizontal: 16 },
});
