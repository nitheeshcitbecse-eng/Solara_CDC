/**
 * Pure state machine behind <VoiceRecorder>. Kept free of React and expo-audio so
 * every transition can be unit-tested.
 *
 *   idle ──START──▶ preparing ──STARTED──▶ recording ──STOPPED──▶ recorded
 *     ▲                │                      │  ▲ TICK (duration, level)   │
 *     │      PERMISSION_DENIED / FAILED       │  └──────┘                   │
 *     └──────────────── DELETE ◀──────────────┴──────── START (re-record) ─┘
 */

export const MAX_VOICE_MS = 60_000;
/** Shorter clips are discarded: they're almost always accidental taps. */
const MIN_VOICE_MS = 1_000;
export const LEVEL_BARS = 32;

export type VoiceRecorderState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'recording'; durationMs: number; levels: number[] }
  | { status: 'recorded'; uri: string; durationMs: number; levels: number[] }
  | { status: 'error' };

export type VoiceRecorderEvent =
  | { type: 'START' }
  | { type: 'STARTED' }
  | { type: 'TICK'; durationMs: number; metering?: number }
  | { type: 'STOPPED'; uri: string | null; durationMs: number }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'FAILED' }
  | { type: 'DELETE' };

/** Recorder metering is in dBFS (−160 … 0). Map the useful speech range (−60 … 0) to 0 … 1. */
export function meteringToLevel(metering: number | undefined): number {
  if (metering === undefined || !Number.isFinite(metering)) return 0;
  return Math.min(1, Math.max(0, (metering + 60) / 60));
}

export function voiceRecorderReducer(state: VoiceRecorderState, event: VoiceRecorderEvent): VoiceRecorderState {
  switch (event.type) {
    case 'START':
      return state.status === 'idle' || state.status === 'recorded' || state.status === 'error'
        ? { status: 'preparing' }
        : state;
    case 'STARTED':
      return state.status === 'preparing' ? { status: 'recording', durationMs: 0, levels: [] } : state;
    case 'TICK':
      if (state.status !== 'recording') return state;
      return {
        status: 'recording',
        durationMs: Math.min(event.durationMs, MAX_VOICE_MS),
        levels: [...state.levels, meteringToLevel(event.metering)].slice(-LEVEL_BARS),
      };
    case 'STOPPED': {
      if (state.status !== 'recording') return state;
      const durationMs = Math.min(event.durationMs, MAX_VOICE_MS);
      if (!event.uri || durationMs < MIN_VOICE_MS) return { status: 'idle' };
      return { status: 'recorded', uri: event.uri, durationMs, levels: state.levels };
    }
    case 'PERMISSION_DENIED':
      return state.status === 'preparing' ? { status: 'idle' } : state;
    case 'FAILED':
      return { status: 'error' };
    case 'DELETE':
      return state.status === 'recorded' || state.status === 'error' ? { status: 'idle' } : state;
  }
}

/** The hard 60-second limit: the component stops the recorder when this turns true. */
export function shouldAutoStop(state: VoiceRecorderState): boolean {
  return state.status === 'recording' && state.durationMs >= MAX_VOICE_MS;
}
