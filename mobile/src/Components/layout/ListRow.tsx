import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned meta text, e.g. a date or count. */
  meta?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  accessibilityHint?: string;
};

function ListRowBase({ title, subtitle, icon: Icon, meta, right, onPress, tone = 'default', accessibilityHint }: ListRowProps) {
  const color = tone === 'danger' ? colors.danger : colors.text;
  const body = (
    <>
      {Icon ? (
        <View style={[styles.iconTile, tone === 'danger' ? styles.iconTileDanger : null]}>
          <Icon size={sizes.icon} color={tone === 'danger' ? colors.danger : colors.primary} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={tone === 'danger' ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="caption" color="textSubtle" align="right" style={styles.meta}>
          {meta}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <ChevronRight size={sizes.icon} color={color} strokeWidth={2} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

export const ListRow = memo(ListRowBase);

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconTile: {
    width: sizes.iconTile - spacing.xxs,
    height: sizes.iconTile - spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileDanger: { backgroundColor: colors.dangerSoft },
  text: { flex: 1, gap: 2 },
  meta: { maxWidth: '40%' },
});
