import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { colors, radius as radii } from '../../lib/theme/tokens';

type SkeletonProps = { width?: DimensionValue; height: number; radius?: number };

const PULSE_MS = 800;

/** A softly pulsing placeholder block shown while data loads. */
export function Skeleton({ width = '100%', height, radius = radii.sm }: SkeletonProps) {
  // useState's lazy initialiser creates the Animated.Value once per mount.
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { width, height, borderRadius: radius, opacity }]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceMuted },
});
