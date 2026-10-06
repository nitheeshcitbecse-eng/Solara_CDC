import React from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../colors";
import { fonts, radius } from "../theme";
import { sectorImage } from "../lib/sectorImages";
import useTheme from "../lib/useTheme";

// Horizontal photo cards for picking a job category; null = all categories.
export default function CategoryCarousel({ sectors, selected, onSelect, tier = "normal" }) {
  const theme = useTheme();
  const items = [
    { id: null, name: "All jobs", image: sectorImage("", tier), count: sectors.reduce((sum, sector) => sum + (sector.jobCount || 0), 0) },
    ...sectors.map((sector) => ({ id: sector.id, name: sector.name, image: sectorImage(sector.name, tier), count: sector.jobCount })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <Pressable key={String(item.id)} onPress={() => onSelect(item.id)} style={[styles.card, active && { borderColor: theme.button }]}>
            <ImageBackground source={item.image} style={styles.image} imageStyle={styles.imageInner} resizeMode="cover">
              <LinearGradient colors={["rgba(28,20,14,0)", "rgba(28,20,14,0.88)"]} style={styles.shade}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.count !== undefined ? <Text style={styles.count}>{item.count} open</Text> : null}
              </LinearGradient>
              {active ? (
                <View style={[styles.check, { backgroundColor: theme.button }]}>
                  <MaterialIcons name="check" size={14} color="#fff" />
                </View>
              ) : null}
            </ImageBackground>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  card: { width: 124, borderRadius: radius.md + 2, borderWidth: 2.5, borderColor: "transparent" },
  image: { height: 92, justifyContent: "flex-end" },
  imageInner: { borderRadius: radius.md },
  shade: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, paddingHorizontal: 10, paddingTop: 22, paddingBottom: 8 },
  name: { fontFamily: fonts.bold, fontSize: 13, color: "#fff" },
  count: { fontFamily: fonts.medium, fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  check: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: colors.card },
});
