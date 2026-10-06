Solara mobile app: Expo + React Native, **JavaScript only** (no TypeScript). The backend is FastAPI in
`../backend`; every endpoint the app calls is listed in `../backend/README.md`.

## Expo has changed — do not trust your training data

Before touching an Expo or React Native API, check the `expo` major version in `package.json` and read
`https://docs.expo.dev/versions/v<major>.0.0/`.

## Commands

```bash
npx expo install <package>   # ALWAYS for new packages — picks SDK-compatible versions
npx expo start               # dev server
npx expo lint                # lint (must have 0 errors)
npx expo-doctor              # dependency + config checks
npx expo export --platform android   # bundle check
npm test                     # renders every screen per role with recorded API responses
```

After changing a backend response, re-record `__tests__/fixtures.json` with
`../backend/scripts/export_app_fixtures.py`, and add any new screen to `__tests__/screens.test.js`.

## Stack (do not substitute)

- Navigation: `@react-navigation/native` + `native-stack`, `headerShown: false`. **Never install `expo-router`.**
- State: React Context only (`AuthContext`, `InternetContext`, `LanguageContext`). No Redux / Zustand / TanStack Query.
- HTTP: the single axios instance in `src/api/api.js`. JWT in AsyncStorage under `"token"` (`src/utils/storage.js`).
- Icons: `@expo/vector-icons` — Ionicons on auth screens, MaterialIcons on app screens.
- Styling: `StyleSheet.create` at the bottom of each file; colours from `src/colors.js`, fonts from `src/theme.js`
  (`fontFamily: fonts.bold`, never `fontWeight`).
- Keyboard: `react-native-keyboard-controller`. `Screen`/`AuthLayout`/`SetupLayout` already use
  `KeyboardAwareScrollView`; never add a `KeyboardAvoidingView` (nested ones make the cursor jump).
- Imagery: real photos only (`lib/sectorImages.js`, `Components/PhotoHero`, `Components/Logo`); no emoji or clip-art.
  Warm palette only (sunrise orange / ink + gold / jade, stone neutrals); no blue.
- Text: import `Text` from `src/Components/Text` (never from react-native) so it gets translated; pass
  `translate={false}` for user-generated or brand text. Placeholders: `useTranslated("…")` from `context/LanguageContext`.
  Write UI text in plain English sentences (no string-building from fragments): each string is translated whole.

## Structure and naming

- `src/screens/` common screens; `src/screens/<Role>/` per role (`Seeker`, `Hirer`, `Admin`);
  hub screens `Manage<Entity>Screen.js` with sub-screens in `Manage<Entity>/`.
- Route name === component name (`"AddJobScreen"`); public routes use short names (`"Login"`).
- Reusable UI in `src/Components/` (PascalCase), pure helpers and hooks in `src/lib/`, device/storage helpers in `src/utils/`.
- One component per file, default export. Double quotes, semicolons, 2-space indent.

## Normal vs Premium

- Every seeker/hirer has `user.tier` (`"normal"` | `"premium"`). Use `lib/tierTheme.js` for colours
  (sunrise orange vs ink/gold); `Header` already follows the signed-in user's tier.
- Tiers never mix; the backend enforces it, so never add client-side cross-tier lists.
- Users stay on their tier's setup screen until `user.onboarded` (see `AppNavigator`).
- Wrap new screens' content normally — `App.js` already keeps everything above the phone's navigation bar;
  use `useSafeAreaInsets().top` for anything drawn at the very top (gradient headers, absolute back buttons).

## Patterns to copy

- Every async handler: validate → `setLoading(true)` → `try { const { data } = await api.x(); if (data.success) … }`
  → `catch (err) { setMessage(err.response?.data?.message || "<fallback>"); console.log("<Action> Error:", err.message); }`
  → `finally { setLoading(false) }`.
- The backend always returns `{ success, message?, ...payload }`; always branch on `data.success`.
- Popups use `Components/Alert` (never React Native's `Alert.alert`); confirmations use `Components/ConfirmModal`.
- Lists: spinner → empty-state text → ScrollView of cards; client-side search filters a copy of the array.
- New screen checklist: create the file from the closest existing screen → register it in `AppNavigator` under
  the right role comment → add it to `roleBoxes` in `UserScreen` (or a hub screen) → call the backend only through `api`.
