import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Text from "./Text";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../colors";
import { fonts, radius } from "../theme";
import useTheme from "../lib/useTheme";
import { useTranslated } from "../context/LanguageContext";

// Labelled text field with focus state, optional prefix (e.g. "+91"), password toggle and error.
// `icon` is a MaterialIcons name (or a ready element).
// On focus only the border colour changes: changing shadows/elevation of a focused field's
// container makes Android re-lay it out, which moved the cursor around while typing.
const Input = ({
  label,
  icon,
  prefix,
  placeholder,
  value,
  onChangeText,
  secure,
  keyboardType,
  placeholderTextColor = colors.subtle,
  autoCapitalize = "none",
  autoComplete,
  multiline = false,
  maxLength,
  editable = true,
  error,
  hint,
  style,
}) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const translatedPlaceholder = useTranslated(placeholder);

  const borderColor = error ? colors.error : focused ? theme.accent : colors.border;
  const iconColor = error ? colors.error : focused ? theme.accent : colors.subtle;
  // Typed identifiers must reach the server exactly as entered.
  const plainEntry = secure || keyboardType === "email-address" || keyboardType === "phone-pad" || keyboardType === "number-pad";

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, { borderColor }, multiline && styles.multilineField, !editable && styles.disabled]}>
        {icon ? (
          <View style={[styles.icon, multiline && styles.multilineIcon]}>
            {typeof icon === "string" ? <MaterialIcons name={icon} size={21} color={iconColor} /> : icon}
          </View>
        ) : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholder={translatedPlaceholder}
          placeholderTextColor={placeholderTextColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={plainEntry ? false : undefined}
          autoComplete={autoComplete || (plainEntry ? "off" : undefined)}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          textAlignVertical={multiline ? "top" : "center"}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((current) => !current)} hitSlop={10} style={styles.eye}>
            <MaterialIcons name={hidden ? "visibility" : "visibility-off"} size={21} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.body, marginBottom: 7 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 12, minHeight: 52 },
  multilineField: { alignItems: "flex-start", paddingVertical: 10 },
  disabled: { backgroundColor: colors.neutralSoft },
  icon: { marginRight: 10 },
  multilineIcon: { marginTop: 3 },
  prefix: { fontFamily: fonts.semibold, fontSize: 15, color: colors.body, marginRight: 8, paddingRight: 8, borderRightWidth: 1, borderRightColor: colors.border },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.heading, paddingVertical: 12 },
  multilineInput: { minHeight: 96, paddingVertical: 2 },
  eye: { marginLeft: 8 },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.error, marginTop: 6 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
});

export default Input;
