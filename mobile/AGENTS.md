This is the Solara Expo/React Native app (frontend only). Read `docs/API.md` (contract) and
`docs/DECISIONS.md` (architecture decisions) before changing behaviour.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before touching an Expo or React Native API, check the
`expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`.
Notable for this project: `expo-av` is removed (use `expo-audio`), `expo-file-system` exports the
`File`/`Directory`/`Paths` classes, `expo-image-manipulator` uses `ImageManipulator.manipulate()`.

## Commands

```bash
npx expo install <package>  # ALWAYS for native packages — resolves SDK-compatible versions
npx expo start              # dev server (works in Expo Go with the mock API)
npx tsc --noEmit            # typecheck
npx expo lint               # lint
npx jest                    # tests
npx expo-doctor             # dependency + config checks
npx expo export --platform android   # bundle check
```

## Navigation — React Navigation, NOT Expo Router

- This project uses **React Navigation v7** (`src/navigation`). **Never install `expo-router`**: since SDK 56
  Metro refuses to bundle when expo-router is resolvable alongside React Navigation.
- `RootNavigator` switches screen groups from session state; never `navigate('Home')` after sign-in/out.

## Rules

- `ios/` and `android/` are generated (CNG). Configure native behaviour in `app.json` / `app.config.ts`.
- Server data lives in TanStack Query only; React Context holds session, language and toasts.
- Every visible string goes through i18n (`src/lib/i18n/locales`). No hard-coded UI text.
- Tokens: access token in memory, refresh token in SecureStore. Nothing personal in AsyncStorage or logs.
