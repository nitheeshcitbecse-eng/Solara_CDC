import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentToast, useToast, type ToastTone } from '../../context/ToastContext';
import { colors, durations, radius, shadows, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const ICON_COLORS: Record<ToastTone, string> = { success: colors.successSoft, error: colors.dangerSoft, info: colors.gold };

/** Renders the current toast above the tab bar. Mounted once in App.tsx. */
export function ToastHost() {
  const toast = useCurrentToast();
  const { dismissToast } = useToast();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: durations.fast, useNativeDriver: true }).start();
    AccessibilityInfo.announceForAccessibility(toast.message);
  }, [toast, opacity]);

  if (!toast) return null;
  const Icon = ICONS[toast.tone];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + sizes.toastOffset, opacity }]}
    >
      <Pressable onPress={dismissToast} accessibilityRole="alert" accessibilityLabel={toast.message} style={styles.toast}>
        <Icon size={sizes.icon} color={ICON_COLORS[toast.tone]} strokeWidth={2} />
        <Text variant="bodyStrong" color="textOnDark" style={styles.text}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.plumDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sheet,
  },
  text: { flex: 1 },
});
