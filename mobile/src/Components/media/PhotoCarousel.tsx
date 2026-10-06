import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { JobPhoto } from '../../lib/types/jobs';

type PhotoCarouselProps = { photos: readonly JobPhoto[]; horizontalPadding?: number };

/** Swipeable workplace photos (16:9) with page dots. */
export function PhotoCarousel({ photos, horizontalPadding = spacing.lg }: PhotoCarouselProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - horizontalPadding * 2;
  const height = width / sizes.heroAspect;
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  if (photos.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <ImageOff size={sizes.iconLg} color={colors.textSubtle} strokeWidth={2} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ width, borderRadius: radius.xl }}
        renderItem={({ item, index: position }) => (
          <Image
            source={{ uri: item.url }}
            style={{ width, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            placeholder={{ blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' }}
            accessibilityLabel={t('job.photoLabel', { index: position + 1, total: photos.length })}
          />
        )}
      />
      {photos.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {photos.map((photo, position) => (
            <View key={photo.id} style={[styles.dot, position === index ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  empty: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs + 2 },
  dot: { width: sizes.badgeDot - 2, height: sizes.badgeDot - 2, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  dotActive: { backgroundColor: colors.primary, width: sizes.badgeDot * 2 },
});
