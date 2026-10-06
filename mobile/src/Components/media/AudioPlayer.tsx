import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import { formatDuration } from '../../utils/format';
import { Text } from '../ui/Text';

type AudioPlayerProps = {
  uri: string;
  /** Known length from the API, shown before the file has loaded. */
  durationSec?: number;
  label?: string;
};

/**
 * Play/pause with a progress bar. `useAudioPlayer` creates the native player and
 * releases it automatically when this component unmounts.
 */
export function AudioPlayer({ uri, durationSec, label }: AudioPlayerProps) {
  const { t } = useTranslation();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : (durationSec ?? 0);
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // Play through the speaker even when the phone's silent switch is on.
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    if (status.didJustFinish || (duration > 0 && status.currentTime >= duration - 0.25)) await player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => void toggle()}
        disabled={!status.isLoaded}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? t('voice.pause') : t('voice.play')}
        accessibilityHint={label}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null, !status.isLoaded ? styles.loading : null]}
      >
        {status.playing ? (
          <Pause size={sizes.icon} color={colors.textOnDark} strokeWidth={2} />
        ) : (
          <Play size={sizes.icon} color={colors.textOnDark} strokeWidth={2} />
        )}
      </Pressable>
      <View style={styles.body}>
        {label ? (
          <Text variant="label" color="textMuted">
            {label}
          </Text>
        ) : null}
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(status.currentTime) }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.times}>
          <Text variant="caption" color="textMuted" latin>
            {formatDuration(status.currentTime)}
          </Text>
          <Text variant="caption" color="textMuted" latin>
            {formatDuration(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: MIN_TOUCH + spacing.xxs,
    height: MIN_TOUCH + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.plumDeep },
  loading: { opacity: 0.6 },
  body: { flex: 1, gap: spacing.xxs },
  track: { height: sizes.progressHeight, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
