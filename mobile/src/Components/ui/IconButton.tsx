import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, overlays, pressedColors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type IconButtonProps = {
  icon: LucideIcon;
  onPress: () => void;
  /** Required: icon-only buttons are invisible to screen readers without a label. */
  accessibilityLabel: string;
  variant?: 'plain' | 'surface' | 'onDark';
  /** true → a dot; a number → a count (hidden when 0). */
  badge?: boolean | number;
  color?: string;
  disabled?: boolean;
  testID?: string;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  badge,
  color,
  disabled = false,
  testID,
}: IconButtonProps) {
  const iconColor = color ?? (variant === 'onDark' ? colors.textOnDark : colors.text);
  const showCount = typeof badge === 'number' && badge > 0;
  const showDot = badge === true;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variant === 'surface' ? styles.surface : null,
        variant === 'onDark' ? styles.onDark : null,
        pressed ? { backgroundColor: variant === 'onDark' ? overlays.pressedOnDark : pressedColors.plain } : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Icon size={sizes.iconLg - 2} color={iconColor} strokeWidth={2} />
      {showDot ? <View style={styles.dot} /> : null}
      {showCount ? (
        <View style={styles.count}>
          <Text variant="caption" color="textOnDark" latin style={styles.countText}>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
  },
  onDark: { backgroundColor: overlays.glass },
  disabled: { opacity: 0.5 },
  dot: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  count: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  countText: { fontSize: 10.5, lineHeight: 16 },
});
