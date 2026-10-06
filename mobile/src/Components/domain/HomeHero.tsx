import { Image } from 'expo-image';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import sunrise from '../../../assets/images/sunrise.jpg';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

type HomeHeroProps = { count: number | null; city: string | null };

/** Sunrise photo (16:9) with a dark gradient at the bottom and the local job count. */
export function HomeHero({ count, city }: HomeHeroProps) {
  const { t } = useTranslation();
  const countLabel =
    count === null ? null : city ? t('home.countInCity', { count, city }) : t('explore.jobCount', { count });

  return (
    <View style={styles.hero}>
      <Image source={sunrise} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor={colors.plumDeep} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.plumDeep} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroFade)" />
      </Svg>
      <View style={styles.content}>
        <Text variant="heading" color="textOnDark" style={styles.headline}>
          {t('home.heroTitle')}
        </Text>
        {countLabel ? (
          <View style={styles.chip}>
            <BadgeCheck size={sizes.iconSm} color={colors.success} strokeWidth={2} />
            <Text variant="label" color="plumDeep">
              {countLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    aspectRatio: sizes.heroAspect,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.plum,
    justifyContent: 'flex-end',
  },
  content: { padding: spacing.md, gap: spacing.xs, alignItems: 'flex-start' },
  headline: { maxWidth: '80%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
