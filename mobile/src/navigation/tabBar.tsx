import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '../Components/ui/Text';
import { colors, sizes, spacing } from '../lib/theme/tokens';

/** Shared bottom-tab styling for every role. Labels use our Text so Indic fonts render correctly. */
export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSubtle,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop: spacing.xxs,
  },
  tabBarItemStyle: { paddingVertical: spacing.xxs },
};

/** Builds the icon + label options for one tab. */
export function tabOptions(icon: LucideIcon, label: string): BottomTabNavigationOptions {
  const Icon = icon;
  return {
    title: label,
    tabBarAccessibilityLabel: label,
    tabBarIcon: ({ color }) => <Icon size={sizes.iconLg - 2} color={color} strokeWidth={2} />,
    tabBarLabel: ({ color }) => (
      <Text variant="caption" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    ),
  };
}
