import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Text from "../../../Components/Text";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import ChipGroup from "../../../Components/ChipGroup";
import TierBadge from "../../../Components/TierBadge";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";
import colors from "../../../colors";
import { fonts, radius } from "../../../theme";
import { sectorImage } from "../../../lib/sectorImages";

const TIER_FILTERS = [
  { label: "All", value: null },
  { label: "Normal", value: "normal" },
  { label: "Premium", value: "premium" },
];

export default function ViewSectorsScreen({ navigation }) {
  const [sectors, setSectors] = useState([]);
  const [filteredSectors, setFilteredSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const { data } = await api.get("/sectors/get-all-sectors");
        if (data.success) setSectors(data.sectors);
      } catch (err) {
        setAlertMessage(err.response?.data?.message || "Could not load sectors");
        setAlertVisible(true);
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

  return (
    <Screen title="Sectors" subtitle={loading ? undefined : `${filteredSectors.length} shown`} onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search sectors" />
      <ChipGroup options={TIER_FILTERS} selected={tier} onSelect={setTier} />
      <View style={{ height: 16 }} />

      {loading ? (
        <LoadingState />
      ) : filteredSectors.length === 0 ? (
        <EmptyState icon="category" title="No sectors found" />
      ) : (
        <View style={styles.grid}>
          {filteredSectors.map((sector) => {
            return (
              <View key={sector.id} style={styles.tile}>
                <Image source={sectorImage(sector.name, sector.tier)} style={styles.photo} />
                <Text style={styles.name} numberOfLines={1}>{sector.name}</Text>
                <Text style={styles.count}>{sector.jobCount} active {sector.jobCount === 1 ? "job" : "jobs"}</Text>
                <View style={{ marginTop: 8 }}>
                  <TierBadge tier={sector.tier} />
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
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, paddingBottom: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.divider },
  photo: { width: "100%", height: 86, borderRadius: radius.md, marginBottom: 10, backgroundColor: colors.neutralSoft },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.heading },
  count: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
