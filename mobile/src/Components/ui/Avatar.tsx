import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes } from '../../lib/theme/tokens';
import { initialsOf } from '../../utils/format';
import { Text } from './Text';

type AvatarProps = { name: string | null; size?: 'sm' | 'md' | 'lg' };

const DIMENSIONS = { sm: sizes.avatarSm, md: sizes.avatarMd, lg: sizes.avatarLg } as const;

/** Initials on plum — the app deliberately shows no profile photos. */
export function Avatar({ name, size = 'md' }: AvatarProps) {
  const dimension = DIMENSIONS[size];
  return (
    <View
      style={[styles.circle, { width: dimension, height: dimension }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant={size === 'lg' ? 'title' : size === 'md' ? 'heading' : 'label'} color="textOnDark" latin>
        {initialsOf(name) || '·'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.pill, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' },
});
