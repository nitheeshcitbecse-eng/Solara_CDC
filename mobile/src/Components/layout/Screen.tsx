import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../../lib/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Tab screens: ['top'] (the tab bar owns the bottom). Stack screens: the default. */
  edges?: Edge[];
  /** List screens pass false and render their own FlatList as the scroller. */
  scroll?: boolean;
  /** Fixed above the scrolling content (e.g. Header, search bar). */
  header?: ReactNode;
  /** Pinned below the content, e.g. the primary action of a form. */
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
};

const DEFAULT_EDGES: Edge[] = ['top', 'bottom'];

/** The layout primitive every screen uses: safe area + keyboard avoidance + padded scroll. */
export function Screen({
  children,
  edges = DEFAULT_EDGES,
  scroll = true,
  header,
  footer,
  refreshControl,
  contentStyle,
  background = colors.background,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.xs, gap: spacing.sm },
});
