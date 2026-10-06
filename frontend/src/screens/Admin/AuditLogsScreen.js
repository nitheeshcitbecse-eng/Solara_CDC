import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../Components/Screen";
import SearchBox from "../../Components/SearchBox";
import EmptyState from "../../Components/EmptyState";
import LoadingState from "../../Components/LoadingState";
import Alert from "../../Components/Alert";
import api from "../../api/api";
import colors from "../../colors";
import { fonts, radius } from "../../theme";
import formatTimeStamp from "../../lib/formatTimeStamp";

// "user_banned" → "User banned"
const readable = (action) => {
  const text = action.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const iconFor = (action) => {
  if (action.includes("banned") || action.includes("reject") || action.includes("take_down")) return { icon: "block", tone: colors.error };
  if (action.includes("verified") || action.includes("approve") || action.includes("active") || action.includes("resolved")) return { icon: "check-circle-outline", tone: colors.success };
  if (action.includes("suspended")) return { icon: "pause-circle-outline", tone: colors.warning };
  if (action.includes("document")) return { icon: "visibility", tone: colors.adminGreen };
  if (action.includes("sector")) return { icon: "category", tone: colors.adminGreen };
  return { icon: "history", tone: colors.muted };
};

export default function AuditLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get("/admin/get-audit-logs");
        if (data.success) setLogs(data.logs);
      } catch (err) {
        setAlertMessage(err.response?.data?.message || "Could not load audit logs");
        setAlertVisible(true);
        console.log("Fetch Audit Logs Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredLogs(
      logs.filter((log) => log.action.toLowerCase().includes(term) || log.target.toLowerCase().includes(term) || (log.details || "").toLowerCase().includes(term))
    );
  }, [search, logs]);

  return (
    <Screen title="Audit Logs" subtitle="Every admin action is recorded" onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Action, target or details" />

      {loading ? (
        <LoadingState />
      ) : filteredLogs.length === 0 ? (
        <EmptyState icon="history" title="No audit logs found" />
      ) : (
        <View style={styles.timeline}>
          {filteredLogs.map((log, index) => {
            const style = iconFor(log.action);
            return (
              <View key={log.id} style={styles.item}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: `${style.tone}1A` }]}>
                    <MaterialIcons name={style.icon} size={16} color={style.tone} />
                  </View>
                  {index < filteredLogs.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={styles.body}>
                  <Text style={styles.action}>{readable(log.action)}</Text>
                  <Text style={styles.target}>{log.target}{log.details ? ` · ${log.details}` : ""}</Text>
                  <Text style={styles.meta}>{log.admin} · {formatTimeStamp(log.createdAt)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Alert visible={alertVisible} tone="error" message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeline: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.divider },
  item: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center" },
  dot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  line: { flex: 1, width: 2, backgroundColor: colors.divider, marginVertical: 4 },
  body: { flex: 1, paddingBottom: 18 },
  action: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.heading },
  target: { fontFamily: fonts.medium, fontSize: 13, color: colors.body, marginTop: 2 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.subtle, marginTop: 4 },
});
