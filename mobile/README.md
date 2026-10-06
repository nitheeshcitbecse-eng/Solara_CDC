# Solara — mobile app

*A sunrise in your life.* Solara connects blue- and grey-collar workers (cooking, cleaning,
caretaking, driving, teaching…) with verified hirers, in their own language.

This repository is the **frontend only** (Expo + React Native + TypeScript). Every network
call goes through one API layer that follows [`docs/API.md`](docs/API.md). Until the
Node/Express backend exists, an in-app mock answers every endpoint; switching to the real
backend is a `.env` change.

| Role (in code) | Who | How they sign in |
| --- | --- | --- |
| `user` | Job seeker (always free) | Phone + SMS OTP, or Google |
| `admin` | Hirer (Aadhaar-verified before posting) | Phone + SMS OTP, or Google |
| `superadmin` | App owner | Email + password + 6-digit TOTP ("Owner login" on Welcome) |

---

## 1. Run it

Requirements: Node 20+ and the **Expo Go** app on a phone (or an Android emulator / iOS simulator).

```bash
cd mobile
npm install
cp .env.example .env        # mock API on by default
npx expo start              # scan the QR code with Expo Go
```

Everything works in Expo Go with the mock API except native Google Sign-In and remote push
(see §5).

### Quality gates

```bash
npx tsc --noEmit                      # types
npx expo lint                         # lint
npx jest                              # unit, contract and end-to-end journey tests
npx expo-doctor                       # dependency/config checks
npx expo export --platform android    # bundles the app
```

---

## 2. Environment (`.env`)

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend base URL including `/api/v1` (must be `https` in production) |
| `EXPO_PUBLIC_USE_MOCK_API` | `true` = in-app mock, `false` = real backend (forbidden in production) |
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production` |
| `EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN` | Native Google Sign-In (development/production builds only) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth web client id used to obtain an ID token |
| `GOOGLE_IOS_URL_SCHEME` | Build-time only: reversed iOS client id for the config plugin |
| `EXPO_PUBLIC_ENABLE_PUSH` | Remote push registration (stubbed — see §5) |

`.env` is validated with zod at startup (`src/utils/env.ts`); a bad value stops the app with a
readable message. **Every `EXPO_PUBLIC_*` value is bundled into the app and is public — never
put secrets there.**

---

## 3. Demo accounts (mock API)

OTP for every phone number is **`123456`**.

| Account | How |
| --- | --- |
| Job seeker *Prasina Selvam* (profile complete, greeted "Hello, Prasina") | Find work → `9876543210` |
| Hirer *Arun Kumar* — Arun Home Services (verified) | I want to hire → `9876500001` |
| Owner | Owner login → `owner@solara.app` / `Solara@123` → TOTP `123456` |
| New job seeker / hirer (goes through onboarding) | Any other valid number, e.g. `9123400000` |
| Rate-limited number (`RATE_LIMITED`, retry after 60 s) | `9000000000` |

Other seeded data: 5 sectors, ~27 jobs across 8 cities, applications in every status,
conversations, notifications, reports, a moderation queue and audit logs. The mock keeps
its data in AsyncStorage (`solara.mock.db`) so it survives restarts; reinstall Expo Go's
data (or clear app storage) to reset it. OTP requests are limited to 5 per number per hour,
like production — the owner can change this in Platform settings.

### Demo inputs for every AI branch

**Add work → Step 1, "Other — add new"** (sector check):

| Type | Result |
| --- | --- |
| `sweeper`, `housekeeping`, `maid`, `cleaner` | **match** → "Added under Cleaning" |
| `cook`, `chef` | **match** → Cooking |
| `driver`, `chauffeur` | **match** → Driving |
| `Shop helper`, `Office assistant` | **review** → "We'll confirm the sector" |
| anything else (`Gardener`) | **new** → "New sector will be created after review" |

**Add work → Step 3, workplace photos** (the file names *or* the "Note for the reviewer"):

| Contains | Result |
| --- | --- |
| `unsafe` | **Unsafe** → full-width danger alert; job blocked pending review |
| the word `ai` (e.g. `ai photos`) | **Rejected: AI-generated** → "Upload new photos" |
| `random` | **Rejected: unrelated** → "Upload new photos" |
| nothing special | **Pass** → 3 photos Easy · 4–5 Moderate · 6 Hard (Hard = "Take care") |

The analysis switches from "Checking your photos…" to the result after ~3 seconds.
New sectors and flagged workplaces appear in the owner's **Moderation** tab.

**Aadhaar verification** (any upload screen): last 4 digits `1111` → auto-verified after
~6 s; `0000` → auto-rejected with a reason; anything else waits for the owner
(Users → user → Approve / Reject).

---

## 4. Folder guide

```
mobile/
├── app.json · app.config.ts   Expo config (app.config.ts adds Google's plugin only when enabled)
├── eas.json                   EAS build profiles (development / preview / production)
├── docs/                      API.md (contract) · DECISIONS.md · CREDITS.md
├── assets/                    sunrise photo, icons, bundled demo media
└── src/
    ├── App.tsx · index.ts     providers, fonts, splash, NavigationContainer · entry
    ├── api/                   axios client (single-flight refresh), one module per domain, queryKeys
    │   ├── queries/           TanStack Query hooks (useJob, useApplyToJob, useVerifyOtp…)
    │   └── mock/              axios adapter, in-memory DB, deterministic AI, routes, fixtures
    ├── Components/
    │   ├── ui/                primitives: Text, Button, TextField, Select, BottomSheet, OtpInput…
    │   ├── layout/            Screen, Header, Section, ListRow, Empty/ErrorState, PagedList…
    │   ├── feedback/          ErrorBoundary, OfflineBanner, ToastHost, InlineAlert, PermissionSheet
    │   ├── media/             VoiceRecorder (+ state machine), AudioPlayer, PhotoPicker, DocumentUpload
    │   └── domain/            JobCard, SectorTile, StatusPill, AddWorkWizard, SectorPicker…
    ├── context/               Auth, Language, Toast (state and actions split)
    ├── lib/
    │   ├── hooks/             useCountdown, useDebounce, usePermission, useOnline…
    │   ├── i18n/              i18next setup, 12 languages, full en / ta / hi
    │   ├── storage/           SecureStore (refresh token) · AsyncStorage (language only)
    │   ├── theme/             tokens + per-script typography
    │   ├── types/             contract models, navigation params, i18next typing
    │   └── queryClient.ts · googleSignIn.ts · push.ts
    ├── navigation/            RootNavigator (state-driven groups) + one file per role
    ├── ocr/                   reserved for document text extraction (empty)
    ├── screens/{auth,user,admin,superadmin}
    └── utils/                 env, errors, zod schemas, formatting, file handling
```

How data flows: **screen → hook in `api/queries` → function in `api` → axios
client → (mock adapter | real HTTP)**. Screens never call axios directly, and server data
lives only in TanStack Query — never in React Context.

---

## 5. Development build (Google Sign-In, push)

Expo Go can't load native Google Sign-In or receive remote push. To test Google for real:

1. Create OAuth clients in Google Cloud (Web, Android with your signing SHA-1, iOS for
   bundle id `app.solara.jobs`).
2. In `.env` set `EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN=true`,
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>` and
   `GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<ios client id>`.
3. Add the dev client and build:
   ```bash
   npx expo install expo-dev-client
   npx eas-cli@latest build --profile development --platform android   # or: npx expo run:android
   ```
4. Install the build, run `npx expo start --dev-client`, and use "Continue with Google".

The backend must verify the Google ID token at `POST /auth/google`. Without these settings
(or inside Expo Go) the Google button signs in through the mock with a demo account.

**Push**: `src/lib/push.ts` is a stub behind `EXPO_PUBLIC_ENABLE_PUSH`. Real push needs
`expo-notifications`, an EAS project id, a development build, and a device-token endpoint on
the backend (not yet in the contract). All notifications are already delivered in-app via
`GET /notifications`.

---

## 6. Switch to the real backend

1. Implement the endpoints in [`docs/API.md`](docs/API.md) (same paths, bodies and error codes).
2. In `.env`:
   ```
   EXPO_PUBLIC_USE_MOCK_API=false
   EXPO_PUBLIC_API_URL=https://api.your-domain.com/api/v1
   ```
   (For a local server: Android emulator `http://10.0.2.2:4000/api/v1`, physical device
   `http://<your LAN IP>:4000/api/v1`; production must be `https`.)
3. Restart Metro with a clean cache: `npx expo start -c`.

No code changes are needed: the API modules, hooks and screens are identical in both modes.
The mock code is still bundled but never executed when the flag is off.

---

## 7. Learning notes

Good places to start reading:

- `src/api/client.ts` — interceptors, single-flight token refresh, error mapping.
- `src/navigation/RootNavigator.tsx` — why we never navigate "home" after sign-in.
- `src/Components/media/voiceRecorderMachine.ts` — a UI flow as a pure, tested reducer.
- `src/Components/domain/AddWorkWizard.tsx` — a multi-step wizard with server drafts,
  polling and a back guard.
- `src/api/queries/jobs.ts` — optimistic updates with rollback.
- `src/__tests__/journeys/` — end-to-end tests that drive the real screens against the mock.
