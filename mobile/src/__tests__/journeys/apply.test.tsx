import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../App';
import { pressText, setupJourney, signInWithOtp, waitText } from './helpers';

/**
 * Apply end to end: message + recorded voice intro → review → multipart upload →
 * application details. The native recorder is replaced with one that "recorded" 12 s.
 */
type FakeRecorder = {
  isRecording: boolean;
  uri: string | null;
  prepareToRecordAsync: () => Promise<void>;
  record: () => void;
  stop: () => Promise<void>;
  getStatus: () => Record<string, unknown>;
};

jest.mock('expo-audio', () => {
  const recorder: FakeRecorder = {
    isRecording: false,
    uri: null as string | null,
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(() => {
      recorder.isRecording = true;
    }),
    stop: jest.fn(async () => {
      recorder.isRecording = false;
      recorder.uri = 'file:///cache/recording-1.m4a';
    }),
    getStatus: jest.fn(() => ({ canRecord: true, isRecording: recorder.isRecording, durationMillis: 12_000, metering: -20, mediaServicesDidReset: false, url: null })),
  };
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
  return {
    RecordingPresets: { HIGH_QUALITY: {} },
    getRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    setAudioModeAsync: jest.fn(async () => undefined),
    useAudioRecorder: () => recorder,
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 12, isLoaded: true, didJustFinish: false }),
  };
});

setupJourney();

it('job seeker records a voice intro, reviews and sends an application', async () => {
  await render(<App />);
  await signInWithOtp('9876543210', 'user');
  await waitText('Hello, Prasina');

  await pressText('Housekeeping staff – apartment complex');
  await pressText('Apply');
  await waitText('Message to the hirer');

  // Validation: message and voice intro are both required.
  await pressText('Review application');
  await waitText('This is too short.');

  await fireEvent.changeText(
    screen.getByLabelText('Message to the hirer'),
    'I have eight years of housekeeping experience in apartment complexes.',
  );
  await pressText('Start recording');
  await waitText('Stop recording');
  await pressText('Stop recording');
  await waitText('Your recording');
  await waitText('Record again');

  await pressText('Review application');
  await waitText('Check everything before sending. You can’t edit an application after it is sent.');
  await pressText('Send application');

  await waitText('Your application has been sent. The hirer will review it soon.');
  await waitText('What you sent');
}, 120_000);
