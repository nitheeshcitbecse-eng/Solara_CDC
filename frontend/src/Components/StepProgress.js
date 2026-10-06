import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts } from "../theme";

// Numbered steps joined by a line: done steps show a tick, the current one is highlighted.
export default function StepProgress({ steps, current, accent = colors.primary }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <React.Fragment key={step}>
              {index > 0 ? <View style={[styles.line, { backgroundColor: index <= current ? accent : colors.border }]} /> : null}
              <View style={[styles.circle, (done || active) && { backgroundColor: accent, borderColor: accent }]}>
                {done ? (
                  <MaterialIcons name="check" size={15} color="#fff" />
                ) : (
                  <Text style={[styles.number, active && { color: "#fff" }]}>{index + 1}</Text>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.caption}>
        Step {current + 1} of {steps.length} · <Text style={[styles.title, { color: accent }]}>{steps[current]}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "center" },
  circle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" },
  number: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  line: { flex: 1, height: 2, marginHorizontal: 4 },
  caption: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 10 },
  title: { fontFamily: fonts.bold },
});
