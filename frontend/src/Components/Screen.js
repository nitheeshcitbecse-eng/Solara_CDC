import React from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Header from "./Header";
import colors from "../colors";
import useTheme from "../lib/useTheme";

// Page frame used by every in-app screen: themed background, header, scrollable content that keeps
// the focused input above the keyboard, and an optional footer pinned to the bottom.
export default function Screen({
  title,
  subtitle,
  onBack,
  right,
  children,
  footer,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      {title !== undefined ? <Header title={title} subtitle={subtitle} onBack={onBack} right={right} /> : null}

      {/* Content */}
      {scroll ? (
        <KeyboardAwareScrollView
          bottomOffset={24}
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} tintColor={theme.accent} /> : undefined
          }
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}

      {/* Footer */}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider },
});
