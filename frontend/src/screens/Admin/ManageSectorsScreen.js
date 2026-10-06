import React from "react";
import { StyleSheet } from "react-native";
import Screen from "../../Components/Screen";
import Card from "../../Components/Card";
import ListItem from "../../Components/ListItem";

const items = [
  { title: "Add sector", subtitle: "Create a category for normal or premium jobs", icon: "add-circle-outline", screen: "AddSectorScreen" },
  { title: "View sectors", subtitle: "All categories with active job counts", icon: "category", screen: "ViewSectorsScreen" },
  { title: "Remove sector", subtitle: "Only sectors without jobs", icon: "delete-outline", screen: "RemoveSectorScreen" },
];

export default function ManageSectorsScreen({ navigation }) {
  return (
    <Screen title="Sectors" subtitle="Job categories" onBack={() => navigation.goBack()}>
      <Card padded={false} style={styles.list}>
        {items.map((item, index) => (
          <ListItem key={item.screen} icon={item.icon} title={item.title} subtitle={item.subtitle} last={index === items.length - 1} onPress={() => navigation.navigate(item.screen)} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
});
