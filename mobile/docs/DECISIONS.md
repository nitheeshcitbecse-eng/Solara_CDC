# Architecture & product decisions

Each entry: the decision, then why. Newest phases are appended at the bottom.

## P0 — Scaffold

1. **Expo SDK 57, React Native 0.86, TypeScript 6, React Navigation 7.** Created with
   `create-expo-app --template blank-typescript`. Native packages installed only via `npx expo install`.
2. **`src/index.ts` entry** (`package.json#main`). The template's root `index.ts`/`App.tsx` were moved under `src/`
   and template assets moved to `src/assets/icons`.
3. **No Expo Router.** The template's `AGENTS.md` recommends Expo Router; it was rewritten to state that this project
   uses React Navigation, because the two cannot coexist since SDK 56.
4. **`app.config.ts` wraps `app.json`.** The Google Sign-In config plugin throws without a real `iosUrlScheme`, so it
   is only added when `EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN=true` and `GOOGLE_IOS_URL_SCHEME` is set. Expo Go and CI
   never need Google credentials.
5. **Environment is validated once at module load** (`utils/env.ts`, zod). A bad `.env` crashes at startup with a
   readable list of problems instead of failing on the first request. Production requires `https` and forbids the mock.
6. **`.env` is git-ignored**; `.env.example` is the documented template. Jest sets the same variables in
   `jest.setup.ts` because Jest does not load `.env`.
7. **Placeholder brand assets were generated** (`src/assets/images/sunrise.jpg`, icons) so the bundle builds before the
   real photograph is added. Replace `sunrise.jpg` with the real photo (same name, ~1920×1080, JPEG).
8. **`expo-asset` is a direct dependency.** It is a required peer of `expo-audio` (expo-doctor), and the mock uses it
   to resolve bundled sample media (voice intro, sample documents) to `file://` URIs.
9. **Push notifications** are behind `EXPO_PUBLIC_ENABLE_PUSH` (stub service). Expo Go no longer supports remote push.

## P1 — Foundation

10. **One axios instance, built by `createApiClient()`** (a factory so the single-flight refresh is unit-tested with a
    fake adapter). The default instance is wired to SecureStore, i18n and TanStack's `onlineManager`.
11. **Mock mode = a custom axios adapter**, not a separate fetch layer. API modules, hooks and screens are identical in
    both modes; `EXPO_PUBLIC_USE_MOCK_API=false` simply leaves axios on its default HTTP adapter.
12. **Mock routes are split per domain** (`services/mock/routes/*`) with shared `http.ts` (router, errors, body readers)
    and `serializers.ts` (DB record → contract shape). `fixtures/*` builds the seed relative to "now".
13. **Mock media is bundled** (`assets/images/workplaces`, sample document, synthesised voice clip) and referenced as
    `mock-asset://key`, resolved at runtime via `expo-asset`. Wikimedia Commons rate-limits hot-linking, so remote URLs
    would break demos; credits are in `docs/CREDITS.md`.
14. **Mock uploads are copied into the document directory** (simulating server storage) because the client deletes its
    temp files after a successful upload, as a real client should.
15. **Deterministic extras in the mock AI**: names containing "helper"/"assistant" return `review` so all three sector
    decisions are demoable; "ai" is matched as a whole word (so "chair.jpg" doesn't trigger it). The superadmin AI
    thresholds are applied to the mock's confidence scores, so changing them visibly changes outcomes.
16. **Aadhaar demo shortcut**: last four digits `1111` auto-verify and `0000` auto-reject ~6 s after upload; any other
    value waits for the superadmin. This lets one person demo every verification state on one device.
17. **Typed i18n**: `types/i18next.d.ts` makes every `t('key')` compile-checked, and `ta`/`hi` are typed as
    `Translation` (same shape as `en`), so a missing translation is a compile error.
18. **`createInstance()` for i18next and named `create` from axios** — avoids default-member lint warnings and makes
    the instance explicit.
19. **Context split into state + actions** (two providers each) and memoised, so components that only call actions
    don't re-render on state changes. `AuthContext` holds only the minimal `SessionUser` routing flags; profiles live
    in TanStack Query.
20. **Mutations use `networkMode: 'always'`** and the client throws `OFFLINE` before sending a non-GET while offline —
    mutations fail fast with a clear message instead of silently pausing. Queries keep the default (pause + resume).
21. **`FormData` typing gap**: TypeScript's DOM lib doesn't know RN's `{ uri, name, type }` overload; it is added via
    interface merging in `types/formData.d.ts` (no casts, no `any`).
22. **Extra shared components** beyond the required list: `Logo`, `FieldError`, `ChipGroup`, `DateField` +
    `PickerColumn` (pure-JS date/month/time picker that works in Expo Go), `GoogleMark`, `InlineAlert`,
    `PermissionSheet`, `ScreenSkeleton`.
23. **`services/api/support.ts`** holds help + reports endpoints (FAQs, tickets, reports), which the folder list did
    not name explicitly. **`services/googleSignIn.ts`** wraps the optional native module.
24. **Navigation param lists live in `types/navigation.ts`** (the brief lists them under both `types/` and
    `navigation/types`; one copy avoids drift). `navigation/rootStack.ts` holds the shared stack instance so role files
    can contribute screen groups without an import cycle.

## P2 — Auth

25. **Google button modes**: `native` (dev build + flag + web client id), `mock` (Expo Go or flag off, mock API on) and
    `unavailable` (real API without native Google — the button is hidden rather than failing).
26. **Session restore is optimistic**: with a stored refresh token the app opens signed-in immediately (works offline)
    and refreshes the access token in the background; requests wait for that refresh automatically.
27. **Status bar**: `expo-status-bar` sets dark icons globally; screens over dark photography call
    `useLightStatusBar()` (focus-based), which works with edge-to-edge on Android.

## P3 — Job seeker onboarding

28. **Onboarding is saved server-side per step** (`PATCH /me/profile` with `onboardingStep`). Drafts contain personal
    data, so they are never kept in AsyncStorage.
29. **Resume** rebuilds the stack (`useResumeSteps`) so back navigation still walks through earlier steps.
30. **Aadhaar is optional for job seekers** (job seekers stay free and friction-free; verification raises trust),
    but **required for hirers**. Seekers can upload later from Profile.
31. **No photo-library permission prompt**: the system photo picker on Android 13+/iOS 14+ needs none. Camera,
    microphone and location are requested just-in-time with an explanation sheet first.

## P4 — Job seeker core

32. **"Jobs near you" = the unfiltered list sorted by the server** with the seeker's city first; the hero's count chip
    uses a separate `city` count query. New users in a city without jobs still see work instead of an empty screen.
33. **Search is debounced (350 ms) and starts at 2 characters or any active filter.** Minimum salary compares a
    monthly equivalent (daily × 26, hourly × 8 × 26) so pay types are comparable.
34. **Optimistic save/unsave patches every cached jobs list and detail** (`patchJobEverywhere`) and rolls back on
    error; only the saved list is invalidated afterwards.
35. **Tiny private helper components** (a table row, a fact line) may live in the same file as the screen that owns
    them; anything reused is its own file.

## P5 — Apply, voice intro, applications

36. **Voice recorder logic is a pure reducer** (`voiceRecorderMachine.ts`) — testable without native audio. The
    component polls `recorder.getStatus()` every 100 ms for duration and metering, auto-stops at 60 s and resets the
    audio mode afterwards. Clips under 1 s are discarded as accidental taps.
37. **Apply is one screen with an edit and a review phase**; one `usePreventRemove` handles both "back to edit" and
    "discard?". Navigation after success happens in an effect so the guard has already been switched off.
38. **The application detail is a snapshot**: what was sent can't be edited, matching the contract.

## P6 — Messages, notifications, profile, settings, help

39. **Chat polls every 10 s only while focused** (`useIsFocused` → `refetchInterval`), is an inverted list, sends
    optimistically, and offers long-press → report on the other person's messages.
40. **Notifications carry `type` + `params`, never prose**; the client renders them with i18n so they follow the
    user's language. Mark-read is optimistic.
41. **Profile editing reuses the onboarding field groups** (`Seeker*Fields`) and form mappers (`utils/profileForms.ts`).
42. **Shared screens** (Messages, Chat, Notifications, Settings, Help, AadhaarUpload) live in `screens/user` and are
    registered in both the job seeker and hirer navigators; their content adapts to the role.
43. **Account deletion is a request** (30-day grace, cancelled by signing in again), followed by a local sign-out.

## P7 — Hirer

44. **Only verified hirers can post** (server-enforced 403; the UI routes unverified hirers to the verification
    status screen). The verification status screen doubles as the last onboarding step; "Continue to dashboard"
    sends `complete: true`.
45. **Add work saves a server draft after step 2**; photos upload to that draft; leaving keeps it in My jobs →
    Pending, where "Continue setup" resumes at the photo step. The analysis is polled every 1.5 s until complete.
46. **Owner thresholds affect the mock AI**: a weak "unsafe"/"fake" signal below the threshold passes with
    "Take care"; sector matches below the match threshold fall back to review.

## P8 — Owner (superadmin)

47. **Every destructive owner action needs a written reason** (`ReasonSheet`), stored in the audit log.
48. **Documents are fetched through a short-lived URL per view**, never cached (`gcTime: 0`, `cachePolicy="none"`),
    hidden when the link expires, with screen capture blocked.
49. **Moderation and report details receive the item via route params** because the contract has list endpoints
    only; the screen keeps the server's response after a decision.

## P9 — Hardening

50. **End-to-end journey tests** (`src/__tests__/journeys`) render the real `<App/>` against the mock with zero
    latency and drive every role. They found and fixed four real bugs before release:
    - the first-launch Language screen and the signed-out group both contain a `Language` route, so React Navigation
      kept users on the language picker after Continue → groups now have distinct `navigationKey`s;
    - Platform settings crashed on its first render (`values` without `defaultValues`) → all such forms now pass
      explicit defaults;
    - the Add-work "leave" effect ran before `usePreventRemove` updated (effects run in declaration order) →
      the effect now follows the guard;
    - mock routes mutated records before validating the rest of the body → they now validate first and commit last.
51. **Contract tests** (`services/mock/__tests__/adapter.test.ts`) exercise auth, roles, refresh rotation and reuse
    detection, multipart apply → hire, messaging and owner decisions through a real API client.
52. **Select lists longer than 12 options get a search box** (e.g. the 36 states).
53. **Splash options are skipped in Expo Go**, where they are unsupported.
54. **Jest setup** uses React Native's `FormData`, the libraries' official NetInfo/safe-area mocks, and a minimal
    `expo-audio` stub (it ships no Jest mock). Journey tests set `gcTime: Infinity` so no cache timers keep Jest alive.
55. **Debug logging**: lint forbids `console.log`; the two remaining diagnostics are inside `if (__DEV__)`, which the
    production minifier removes, and never include personal data.
56. **Folder layout**: `src/` is `api/` (HTTP modules, `queries/` hooks, `mock/` backend), `Components/`, `context/`,
    `lib/` (hooks, i18n, theme, types, storage, query client, push, Google sign-in), `navigation/`, `ocr/`, `screens/`
    and `utils/`. Assets moved to the project-root `assets/`, Expo's default location. `Components` is capitalised on
    purpose: imports must match that case exactly, because EAS builds run on case-sensitive Linux.
