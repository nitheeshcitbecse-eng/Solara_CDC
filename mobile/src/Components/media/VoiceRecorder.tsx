import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { usePermission } from '../../lib/hooks/usePermission';
import { colors, overlays, radius, sizes, spacing } from '../../lib/theme/tokens';
import { deleteTempFiles, getFileSize, validateUpload } from '../../utils/files';
import { formatDuration } from '../../utils/format';
import { InlineAlert } from '../feedback/InlineAlert';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import { Text } from '../ui/Text';
import { AudioPlayer } from './AudioPlayer';
import {
  LEVEL_BARS,
  MAX_VOICE_MS,
  shouldAutoStop,
  voiceRecorderReducer,
  type VoiceRecorderState,
} from './voiceRecorderMachine';

export type VoiceIntroValue = { uri: string; durationSec: number; mimeType: string; name: string; size: number };

type VoiceRecorderProps = {
  value: VoiceIntroValue | null;
  onChange: (value: VoiceIntroValue | null) => void;
  error?: string;
};

const POLL_MS = 100;
// HIGH_QUALITY produces AAC audio in an MPEG-4 container (.m4a) on both platforms.
const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

function initialState(value: VoiceIntroValue | null): VoiceRecorderState {
  return value ? { status: 'recorded', uri: value.uri, durationMs: value.durationSec * 1000, levels: [] } : { status: 'idle' };
}

/**
 * Voice introduction: record up to 60 s with a live countdown and level meter,
 * preview, re-record or delete. Produces an .m4a file in the cache directory.
 */
export function VoiceRecorder({ value, onChange, error }: VoiceRecorderProps) {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const microphone = usePermission('microphone');
  const [state, dispatch] = useReducer(voiceRecorderReducer, value, initialState);
  const stopping = useRef(false);

  // Poll the recorder for elapsed time and input level while recording.
  useEffect(() => {
    if (state.status !== 'recording') return;
    const interval = setInterval(() => {
      const status = recorder.getStatus();
      dispatch({ type: 'TICK', durationMs: status.durationMillis, metering: status.metering });
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [state.status, recorder]);

  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      const durationMs = recorder.getStatus().durationMillis;
      await recorder.stop();
      const uri = recorder.uri;
      dispatch({ type: 'STOPPED', uri, durationMs });
      if (uri && durationMs >= 1000) {
        const file = {
          uri,
          durationSec: Math.min(60, Math.round(durationMs / 1000)),
          mimeType: 'audio/m4a',
          name: 'voice-intro.m4a',
          size: getFileSize(uri),
        };
        if (validateUpload(file, 'audio')) {
          deleteTempFiles([uri]);
          dispatch({ type: 'FAILED' });
        } else {
          onChange(file);
        }
      }
    } catch {
      dispatch({ type: 'FAILED' });
    } finally {
      // Hand the audio session back so other apps (and playback) behave normally.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      stopping.current = false;
    }
  }, [recorder, onChange]);

  // Hard limit: stop automatically at 60 seconds.
  useEffect(() => {
    if (shouldAutoStop(state)) void stop();
  }, [state, stop]);

  // Leaving the screen mid-recording: stop the native recorder and restore the audio
  // session. `useAudioRecorder` then releases the native object itself; if it already
  // has, touching it throws, which is safe to ignore here.
  useEffect(
    () => () => {
      try {
        if (recorder.isRecording) recorder.stop().catch(() => undefined);
      } catch {
        // Already released.
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    },
    [recorder],
  );

  const start = async () => {
    if (value) {
      deleteTempFiles([value.uri]);
      onChange(null);
    }
    dispatch({ type: 'START' });
    if (!(await microphone.ensure())) {
      dispatch({ type: 'PERMISSION_DENIED' });
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      dispatch({ type: 'STARTED' });
    } catch {
      dispatch({ type: 'FAILED' });
    }
  };

  const remove = () => {
    if (value) deleteTempFiles([value.uri]);
    onChange(null);
    dispatch({ type: 'DELETE' });
  };

  return (
    <View style={[styles.card, error ? styles.cardError : null]}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Mic size={sizes.icon} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text variant="bodyStrong">{t('voice.title')}</Text>
          <Text variant="caption" color="textMuted">
            {t('voice.hint')}
          </Text>
        </View>
      </View>

      {state.status === 'recording' ? (
        <View style={styles.recording} accessibilityLiveRegion="polite">
          <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: LEVEL_BARS }, (_, index) => {
              const level = state.levels[index - (LEVEL_BARS - state.levels.length)] ?? 0;
              return (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    { height: Math.max(sizes.meterBarWidth, level * sizes.meterHeight) },
                    level > 0 ? styles.barActive : null,
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.timer}>
            <View style={styles.recDot} />
            <Text variant="bodyStrong" latin>
              {formatDuration(state.durationMs / 1000)}
            </Text>
            <Text variant="caption" color="textMuted" accessibilityLabel={t('voice.remaining', { time: formatDuration((MAX_VOICE_MS - state.durationMs) / 1000) })}>
              {t('voice.remaining', { time: formatDuration((MAX_VOICE_MS - state.durationMs) / 1000) })}
            </Text>
          </View>
          <Button label={t('voice.stop')} icon={Square} variant="danger" onPress={() => void stop()} />
        </View>
      ) : null}

      {state.status === 'recorded' ? (
        <View style={styles.recorded}>
          <AudioPlayer uri={state.uri} durationSec={Math.round(state.durationMs / 1000)} label={t('voice.preview')} />
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button label={t('voice.rerecord')} icon={RotateCcw} variant="secondary" onPress={() => void start()} />
            </View>
            <View style={styles.action}>
              <Button label={t('common.delete')} icon={Trash2} variant="secondary" onPress={remove} />
            </View>
          </View>
        </View>
      ) : null}

      {state.status === 'idle' || state.status === 'preparing' ? (
        <Button
          label={t('voice.start')}
          icon={Mic}
          variant="secondary"
          onPress={() => void start()}
          loading={state.status === 'preparing'}
        />
      ) : null}

      {state.status === 'error' ? (
        <>
          <InlineAlert tone="danger" message={t('voice.failed')} />
          <Button label={t('common.retry')} icon={RotateCcw} variant="secondary" onPress={remove} />
        </>
      ) : null}

      <FieldError message={error} />
      {microphone.sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardError: { borderColor: colors.danger },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  recording: { gap: spacing.sm },
  meter: { height: sizes.meterHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: sizes.meterBarWidth, borderRadius: radius.pill, backgroundColor: overlays.meterIdle },
  barActive: { backgroundColor: colors.primary },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recDot: { width: sizes.badgeDot, height: sizes.badgeDot, borderRadius: radius.pill, backgroundColor: colors.danger },
  recorded: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
