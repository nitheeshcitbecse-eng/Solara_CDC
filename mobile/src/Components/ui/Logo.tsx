import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { colors, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type LogoProps = {
  size?: 'md' | 'lg';
  tone?: 'dark' | 'light';
  /** Hide the wordmark to show only the sunrise mark. */
  markOnly?: boolean;
};

/** Sunrise mark (half sun, rays, horizon) drawn as vectors, plus the "Solara" wordmark. */
export function Logo({ size = 'md', tone = 'dark', markOnly = false }: LogoProps) {
  const { t } = useTranslation();
  const dimension = size === 'lg' ? sizes.logoLg : sizes.logo;
  const wordColor = tone === 'light' ? 'textOnDark' : 'plum';

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel={t('common.appName')}>
      <Svg width={dimension} height={dimension} viewBox="0 0 32 32">
        <Path d="M8 21a8 8 0 0 1 16 0z" fill={colors.gold} />
        <Path
          d="M16 5v3M7.5 8.5l2 2M24.5 8.5l-2 2M4 15h3M25 15h3"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Rect x={3} y={23} width={26} height={2.4} rx={1.2} fill={colors.gold} />
      </Svg>
      {markOnly ? null : (
        <Text variant={size === 'lg' ? 'title' : 'heading'} color={wordColor} latin>
          {t('common.appName')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
