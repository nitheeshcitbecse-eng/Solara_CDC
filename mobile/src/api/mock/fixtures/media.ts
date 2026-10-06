import { Asset } from 'expo-asset';

import sampleVoice from '../../../../assets/audio/sample-voice-intro.wav';
import sampleDocument from '../../../../assets/images/sample-document.jpg';
import car from '../../../../assets/images/workplaces/car.jpg';
import classroom from '../../../../assets/images/workplaces/classroom.jpg';
import diningRoom from '../../../../assets/images/workplaces/dining-room.jpg';
import kitchen from '../../../../assets/images/workplaces/kitchen.jpg';
import livingRoom from '../../../../assets/images/workplaces/living-room.jpg';
import lobby from '../../../../assets/images/workplaces/lobby.jpg';
import ward from '../../../../assets/images/workplaces/ward.jpg';
import warehouse from '../../../../assets/images/workplaces/warehouse.jpg';

/**
 * Seed data refers to bundled media symbolically ("mock-asset://kitchen") because the
 * real URI differs between Expo Go (dev-server URL) and release builds (file path).
 * The adapter resolves these once at startup and rewrites URLs in every response.
 */
const MODULES = {
  kitchen,
  diningRoom,
  livingRoom,
  lobby,
  ward,
  car,
  classroom,
  warehouse,
  sampleDocument,
  sampleVoice,
} as const;

export type MockMediaKey = keyof typeof MODULES;

const SCHEME = 'mock-asset://';
const resolved: Partial<Record<MockMediaKey, string>> = {};
let loading: Promise<void> | null = null;

export function mediaRef(key: MockMediaKey): string {
  return `${SCHEME}${key}`;
}

export function loadMockMedia(): Promise<void> {
  loading ??= Promise.all(
    (Object.keys(MODULES) as MockMediaKey[]).map(async (key) => {
      const asset = Asset.fromModule(MODULES[key]);
      try {
        await asset.downloadAsync();
      } catch {
        // Fall back to the remote dev-server URI below.
      }
      resolved[key] = asset.localUri ?? asset.uri;
    }),
  ).then(() => undefined);
  return loading;
}

function isMediaKey(value: string): value is MockMediaKey {
  return value in MODULES;
}

/** Rewrites every "mock-asset://x" string inside a JSON-like value to its runtime URI. */
export function resolveMediaRefs<T>(value: T): T {
  if (typeof value === 'string') {
    if (!value.startsWith(SCHEME)) return value;
    const key = value.slice(SCHEME.length);
    return (isMediaKey(key) ? (resolved[key] ?? value) : value) as T;
  }
  if (Array.isArray(value)) return value.map((item: unknown) => resolveMediaRefs(item)) as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) output[key] = resolveMediaRefs(child);
    return output as T;
  }
  return value;
}
