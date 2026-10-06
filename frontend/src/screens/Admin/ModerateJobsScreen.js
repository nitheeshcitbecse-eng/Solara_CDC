import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../Components/Screen";
import Card from "../../Components/Card";
import ListItem from "../../Components/ListItem";
import StatCard from "../../Components/StatCard";
import api from "../../api/api";
import colors from "../../colors";

export default function ModerateJobsScreen({ navigation }) {
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

  const items = [
    { title: "Review jobs", subtitle: "Jobs that suggest a new sector", icon: "fact-check", screen: "ReviewJobsScreen" },
    { title: "All jobs", subtitle: "Every job, filter by tier and status", icon: "list-alt", screen: "ViewAllJobsScreen" },
    { title: "Take down jobs", subtitle: "Remove jobs that break the rules", icon: "remove-circle-outline", screen: "TakeDownJobsScreen" },
  ];

  return (
    <Screen title="Moderate Jobs" onBack={() => navigation.goBack()}>
      <View style={styles.statsRow}>
        <StatCard icon="fact-check" value={stats?.pendingJobs} label="To review" tone={colors.warning} onPress={() => navigation.navigate("ReviewJobsScreen")} />
        <StatCard icon="work-outline" value={stats?.activeJobs} label="Active jobs" tone={colors.success} onPress={() => navigation.navigate("ViewAllJobsScreen")} />
      </View>
      <Card padded={false} style={styles.list}>
        {items.map((item, index) => (
          <ListItem key={item.screen} icon={item.icon} title={item.title} subtitle={item.subtitle} last={index === items.length - 1} onPress={() => navigation.navigate(item.screen)} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  list: { paddingHorizontal: 16 },
});
