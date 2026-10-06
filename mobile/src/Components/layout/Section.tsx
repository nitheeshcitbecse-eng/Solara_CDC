import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, spacing } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

type SectionProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};

export function Section({ title, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="heading" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="button" style={styles.action} hitSlop={spacing.xs}>
            <Text variant="label" color="primary">
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1 },
  action: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
