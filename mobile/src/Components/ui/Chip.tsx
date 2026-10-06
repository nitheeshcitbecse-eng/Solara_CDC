import { X, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Shows a remove (×) button, e.g. for added skills. */
  onRemove?: () => void;
  icon?: LucideIcon;
  /** Render as a checkbox (multi-select) or radio (single-select) for screen readers. */
  role?: 'checkbox' | 'radio' | 'button';
};

// Chips are drawn at 38pt; the hit slop brings the touch target up to 44pt.
const HIT_SLOP = { top: 3, bottom: 3, left: 0, right: 0 };

function ChipBase({ label, selected = false, onPress, onRemove, icon: Icon, role = 'checkbox' }: ChipProps) {
  const { t } = useTranslation();
  const foreground = selected ? colors.primary : colors.text;

  const content = (
    <>
      {Icon ? <Icon size={sizes.iconSm} color={foreground} strokeWidth={2} /> : null}
      <Text variant="label" color={selected ? 'primary' : 'text'}>
        {label}
      </Text>
    </>
  );

  if (onRemove) {
    return (
      <View style={[styles.chip, styles.removable]}>
        {content}
        <Pressable
          onPress={onRemove}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.removeItem', { item: label })}
          style={styles.remove}
        >
          <X size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole={role}
      accessibilityState={role === 'button' ? undefined : { checked: selected, selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export const Chip = memo(ChipBase);

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.chip,
    borderRadius: radius.pill,
    borderWidth: sizes.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
  selected: { backgroundColor: colors.surfaceSelected, borderColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceMuted },
  removable: { paddingEnd: spacing.xxs },
  remove: { padding: spacing.xxs },
});
