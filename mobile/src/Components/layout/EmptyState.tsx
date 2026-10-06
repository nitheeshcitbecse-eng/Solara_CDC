import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

/** Icon in a soft-tinted 44pt square, a heading, one line, and an action. */
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconTile}>
        <Icon size={sizes.iconLg} color={colors.primary} strokeWidth={2} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {body}
      </Text>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
