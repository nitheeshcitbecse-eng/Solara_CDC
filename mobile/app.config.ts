import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered on top of app.json.
 *
 * Why this file exists: the Google Sign-In config plugin throws at prebuild time
 * unless it receives a real `iosUrlScheme`. We only add it when the feature flag
 * is on AND the scheme is provided, so Expo Go / mock development never needs
 * Google credentials. GOOGLE_IOS_URL_SCHEME is deliberately NOT EXPO_PUBLIC_:
 * it is only needed at build time, not inside the JS bundle.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleEnabled = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN === 'true';
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? [])];

  if (googleEnabled && iosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  return {
    ...config,
    name: config.name ?? 'Solara',
    slug: config.slug ?? 'solara',
    plugins,
  };
};
