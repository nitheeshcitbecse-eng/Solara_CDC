import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import TierBadge from "../../../Components/TierBadge";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import ConfirmModal from "../../../Components/ConfirmModal";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import tierTheme from "../../../lib/tierTheme";

const TIER_FILTERS = [
  { label: "All", value: null },
  { label: "Normal", value: "normal" },
  { label: "Premium", value: "premium" },
];

export default function RemoveSectorScreen({ navigation }) {
  const [sectors, setSectors] = useState([]);
  const [filteredSectors, setFilteredSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const { data } = await api.get("/sectors/get-all-sectors");
        if (data.success) setSectors(data.sectors);
      } catch (err) {
        showAlert(err.response?.data?.message || "Could not load sectors");
        console.log("Fetch Sectors Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredSectors(sectors.filter((sector) => (!tier || sector.tier === tier) && sector.name.toLowerCase().includes(term)));
  }, [search, tier, sectors]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/sectors/delete-sector/${selectedSector.id}`);
      if (data.success) {
        setSectors((current) => current.filter((sector) => sector.id !== selectedSector.id));
        setSelectedSector(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelectedSector(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Delete Sector Error:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen title="Remove Sector" subtitle="Sectors with jobs can't be removed" onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search sectors" />
      <ChipGroup options={TIER_FILTERS} selected={tier} onSelect={setTier} />
      <View style={{ height: 16 }} />

      {loading ? (
        <LoadingState />
      ) : filteredSectors.length === 0 ? (
        <EmptyState icon="category" title="No sectors found" />
      ) : (
        <View style={styles.list}>
          {filteredSectors.map((sector, index) => {
            const theme = tierTheme(sector.tier);
            const removable = sector.jobCount === 0;
            return (
              <View key={sector.id} style={[styles.row, index < filteredSectors.length - 1 && styles.divider]}>
                <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
                  <MaterialIcons name={sector.icon} size={22} color={theme.accent} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name}>{sector.name}</Text>
                  <View style={styles.metaRow}>
                    <TierBadge tier={sector.tier} />
                    <Text style={styles.count}>{sector.jobCount} active</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.deleteButton, !removable && { opacity: 0.4 }]}
                  onPress={() => setSelectedSector(sector)}
                  hitSlop={6}
                >
                  <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <ConfirmModal
        visible={Boolean(selectedSector)}
        title="Remove sector?"
        message={selectedSector ? `"${selectedSector.name}" will no longer be available for new jobs.` : ""}
        confirmText="Remove"
        icon="delete-outline"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setSelectedSector(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.divider },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  deleteButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.errorSoft, justifyContent: "center", alignItems: "center" },
});
