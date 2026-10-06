import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Jest does not run through the Expo CLI, so .env is not loaded. Provide the
// same values a developer would have locally so `utils/env` can validate.
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
process.env.EXPO_PUBLIC_USE_MOCK_API = 'true';
process.env.EXPO_PUBLIC_APP_ENV = 'development';
process.env.EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN = 'false';
process.env.EXPO_PUBLIC_ENABLE_PUSH = 'false';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// The app runs on React Native's FormData, which accepts { uri, name, type } files and
// exposes getParts() (the mock adapter reads uploads through it). Jest's Node runtime
// would otherwise provide the web FormData, which has neither.
globalThis.FormData = jest.requireActual<{ default: typeof FormData }>('react-native/Libraries/Network/FormData').default;

// expo-audio has no built-in Jest mock (its native module doesn't exist under Node).
// This stub covers the API surface the app uses; the recorder logic itself is tested
// through the pure state machine in components/media/voiceRecorderMachine.ts.
jest.mock('expo-audio', () => {
  const recorder = {
    isRecording: false,
    uri: null,
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    getStatus: jest.fn(() => ({ canRecord: true, isRecording: false, durationMillis: 0, mediaServicesDidReset: false, url: null })),
  };
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
  return {
    RecordingPresets: { HIGH_QUALITY: {} },
    getRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    setAudioModeAsync: jest.fn(async () => undefined),
    useAudioRecorder: () => recorder,
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, isLoaded: true, didJustFinish: false }),
  };
});

// Official mocks shipped by these libraries for Jest.
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
