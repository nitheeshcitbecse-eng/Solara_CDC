import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import Screen from "../../Components/Screen";
import Card from "../../Components/Card";
import ListItem from "../../Components/ListItem";
import { AuthContext } from "../../context/AuthContext";

export default function ManageJobsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const premium = user.tier === "premium";
  const verified = user.verificationStatus === "verified";

  const items = [
    {
      title: premium ? "Post an opening" : "Post work",
      subtitle: verified ? "Create a new job" : "Verify your identity first",
      icon: "add-circle-outline",
      screen: verified ? "AddJobScreen" : "VerificationScreen",
    },
    { title: premium ? "Openings & candidates" : "My jobs & applicants", subtitle: "See applicants for each job", icon: "work-outline", screen: "ViewJobsScreen" },
    { title: premium ? "Close an opening" : "Close a job", subtitle: "Stop accepting applications", icon: "work-off", screen: "CloseJobScreen" },
  ];

  return (
    <Screen title={premium ? "Openings" : "Manage Jobs"} onBack={() => navigation.goBack()}>
      <Card padded={false} style={styles.list}>
        {items.map((item, index) => (
          <ListItem key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} last={index === items.length - 1} onPress={() => navigation.navigate(item.screen)} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
});
