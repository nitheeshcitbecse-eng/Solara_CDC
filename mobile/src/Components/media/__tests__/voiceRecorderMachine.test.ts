import {
  LEVEL_BARS,
  MAX_VOICE_MS,
  meteringToLevel,
  shouldAutoStop,
  voiceRecorderReducer,
  type VoiceRecorderEvent,
  type VoiceRecorderState,
} from '../voiceRecorderMachine';

function run(events: VoiceRecorderEvent[], start: VoiceRecorderState = { status: 'idle' }): VoiceRecorderState {
  return events.reduce(voiceRecorderReducer, start);
}

describe('voiceRecorderReducer', () => {
  it('goes idle → preparing → recording → recorded', () => {
    const state = run([
      { type: 'START' },
      { type: 'STARTED' },
      { type: 'TICK', durationMs: 4200, metering: -20 },
      { type: 'STOPPED', uri: 'file:///cache/voice.m4a', durationMs: 4300 },
    ]);
    expect(state).toEqual({ status: 'recorded', uri: 'file:///cache/voice.m4a', durationMs: 4300, levels: [meteringToLevel(-20)] });
  });

  it('returns to idle when the microphone permission is denied', () => {
    expect(run([{ type: 'START' }, { type: 'PERMISSION_DENIED' }])).toEqual({ status: 'idle' });
  });

  it('discards accidental sub-second recordings', () => {
    const state = run([{ type: 'START' }, { type: 'STARTED' }, { type: 'STOPPED', uri: 'file:///x.m4a', durationMs: 400 }]);
    expect(state).toEqual({ status: 'idle' });
  });

  it('caps duration at 60 seconds and signals auto-stop', () => {
    const state = run([{ type: 'START' }, { type: 'STARTED' }, { type: 'TICK', durationMs: 61_500 }]);
    expect(state.status === 'recording' && state.durationMs).toBe(MAX_VOICE_MS);
    expect(shouldAutoStop(state)).toBe(true);
    expect(shouldAutoStop(run([{ type: 'START' }, { type: 'STARTED' }, { type: 'TICK', durationMs: 30_000 }]))).toBe(false);
  });

  it('keeps only the most recent level samples for the meter', () => {
    const ticks: VoiceRecorderEvent[] = Array.from({ length: LEVEL_BARS + 10 }, (_, index) => ({
      type: 'TICK',
      durationMs: index * 100,
      metering: -30,
    }));
    const state = run([{ type: 'START' }, { type: 'STARTED' }, ...ticks]);
    expect(state.status === 'recording' && state.levels.length).toBe(LEVEL_BARS);
  });

  it('supports re-record and delete from the recorded state', () => {
    const recorded: VoiceRecorderState = { status: 'recorded', uri: 'file:///a.m4a', durationMs: 5000, levels: [] };
    expect(voiceRecorderReducer(recorded, { type: 'START' })).toEqual({ status: 'preparing' });
    expect(voiceRecorderReducer(recorded, { type: 'DELETE' })).toEqual({ status: 'idle' });
  });

  it('ignores events that do not apply to the current state', () => {
    expect(run([{ type: 'TICK', durationMs: 1000 }])).toEqual({ status: 'idle' });
    expect(run([{ type: 'STOPPED', uri: 'file:///a.m4a', durationMs: 5000 }])).toEqual({ status: 'idle' });
    expect(run([{ type: 'START' }, { type: 'START' }])).toEqual({ status: 'preparing' });
  });

  it('moves to error on failure and recovers with DELETE', () => {
    const failed = run([{ type: 'START' }, { type: 'FAILED' }]);
    expect(failed).toEqual({ status: 'error' });
    expect(voiceRecorderReducer(failed, { type: 'DELETE' })).toEqual({ status: 'idle' });
  });
});

describe('meteringToLevel', () => {
  it('maps dBFS to 0..1', () => {
    expect(meteringToLevel(0)).toBe(1);
    expect(meteringToLevel(-60)).toBe(0);
    expect(meteringToLevel(-160)).toBe(0);
    expect(meteringToLevel(-30)).toBeCloseTo(0.5);
    expect(meteringToLevel(undefined)).toBe(0);
  });
});
