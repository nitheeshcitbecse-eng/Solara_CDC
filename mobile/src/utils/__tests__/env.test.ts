import { parseEnv } from '../env';

const base = {
  EXPO_PUBLIC_API_URL: 'http://localhost:4000/api/v1/',
  EXPO_PUBLIC_USE_MOCK_API: 'true',
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN: 'false',
};

describe('parseEnv', () => {
  it('parses booleans and strips the trailing slash', () => {
    const env = parseEnv(base);
    expect(env.useMockApi).toBe(true);
    expect(env.enableGoogleSignIn).toBe(false);
    expect(env.apiUrl).toBe('http://localhost:4000/api/v1');
    expect(env.enablePush).toBe(false);
  });

  it('rejects a missing API URL', () => {
    expect(() => parseEnv({ ...base, EXPO_PUBLIC_API_URL: undefined })).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('requires https in production', () => {
    expect(() =>
      parseEnv({ ...base, EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_USE_MOCK_API: 'false' }),
    ).toThrow(/https/);
  });

  it('forbids the mock in production', () => {
    expect(() =>
      parseEnv({ ...base, EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_URL: 'https://api.solara.app/api/v1' }),
    ).toThrow(/mock/);
  });

  it('accepts a valid production configuration', () => {
    const env = parseEnv({
      ...base,
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_USE_MOCK_API: 'false',
      EXPO_PUBLIC_API_URL: 'https://api.solara.app/api/v1',
    });
    expect(env.appEnv).toBe('production');
  });
});
