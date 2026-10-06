# Solara — mobile app

Expo (SDK 57) + React Native, JavaScript. Talks to the FastAPI backend in `../backend`.

## Run it

1. Start the backend first (see `../backend/README.md`).
2. Point the app at it — create `frontend/.env` from `.env.example`:

   | Where the app runs | `EXPO_PUBLIC_BACKEND_URL` |
   | --- | --- |
   | Android emulator | `http://10.0.2.2:4000/api/v1` |
   | Physical phone (same Wi-Fi) | `http://<your-PC-LAN-IP>:4000/api/v1` |
   | iOS simulator / web | `http://localhost:4000/api/v1` |

3. Install and start:

   ```bash
   npm install
   npx expo start -c
   ```

   Scan the QR code with Expo Go, or press `a` for an Android emulator. The project also includes
   `expo-dev-client`; for a development build run `npx expo run:android` or
   `npx eas-cli@latest build --profile development --platform android`.

After changing `.env`, restart Metro with `npx expo start -c`.

The project lives in OneDrive, which turns synced files into cloud placeholders that Metro would mistake
for broken symlinks (`EINVAL: readlink …index.js`). `metro.config.js` works around it. If you ever see that
error, moving the project to a folder outside OneDrive (for example `C:\dev\Solara_CDC`) avoids it entirely.

## Checks

```bash
npm test                              # renders every screen for every kind of user (see __tests__/)
npx expo lint                         # 0 errors
npx expo export --platform android    # the app bundles
```

`__tests__/fixtures.json` holds real API responses. Regenerate it after changing the backend:
`cd ../backend && .venv\Scripts\python scripts\export_app_fixtures.py`.

## Demo accounts (after `python -m app.seed --reset --demo` in the backend)

Log in with the email **or** the mobile number. Password for all demo users: `Demo@1234`.

| Account | Email | Mobile |
| --- | --- | --- |
| Normal worker | `seeker@solara.app` | `9876543210` |
| Premium professional (doctor) | `doctor@solara.app` | `9876543211` |
| Normal hirer (verified) | `hirer@solara.app` | `9876500001` |
| Premium hirer — hospital (verified) | `hospital@solara.app` | `9876500002` |
| Admin (owner) | `owner@solara.app` | — password: `ADMIN_PASSWORD` (default `Solara@123`) |

Forgot password: in development the 6-digit code is printed in the backend terminal.

## Folder structure

```
frontend/
├── App.js                 Providers → safe area → navigator → global no-internet overlay
├── index.js               registerRootComponent(App)
├── app.json · eas.json · babel.config.js · metro.config.js · .env.example
├── assets/images/         landing, tier and sectors/* photos from Unsplash (see CREDITS.md)
├── __tests__/             screen tests + fixtures.json recorded from the backend
└── src/
    ├── api/api.js         axios instance + Bearer token + 401 → sign out
    ├── Components/        Input, Alert, ConfirmModal, LoadingScreen, NoInternetScreen, SidebarMenu,
    │                      FeatureCard, Header, SearchBox, ChipGroup, StatusBadge, InfoRow, JobCard,
    │                      PhotoStrip, ReportModal, Avatar, TierBadge, ImagePickerField, StepProgress,
    │                      PremiumSeekerFields, PremiumHirerFields
    ├── context/           InternetContext, LanguageContext (NLLB-200 translations), AuthContext
    ├── navigation/        AppNavigator (public → setup until onboarded → signed-in screens)
    ├── screens/
    │   ├── HomeScreen (wallpaper), ChooseTierScreen, LoginScreen, RegisterScreen,
    │   │   ForgotPasswordScreen, ResetPasswordScreen, QuickSetupScreen (normal onboarding)
    │   ├── UserScreen (role + tier dashboard), ProfileScreen, EditProfileScreen, ChangePasswordScreen,
    │   │   VerificationScreen, NotificationsScreen, MessagesScreen, ChatScreen, HelpScreen
    │   ├── Seeker/        PremiumSeekerSetupScreen, FindJobsScreen, SavedJobsScreen, MyApplicationsScreen,
    │   │                  FindJobs/{JobDetails,ApplyJob}Screen, MyApplications/ApplicationDetailsScreen
    │   ├── Hirer/         PremiumHirerSetupScreen, ManageJobsScreen (hub),
    │   │                  ManageJobs/{AddJob,ViewJobs,CloseJob,JobApplicants,ApplicantDetails}Screen
    │   └── Admin/         ManageUsersScreen, ManageSectorsScreen, ModerateJobsScreen (hubs),
    │                      ReportsScreen, AuditLogsScreen and their sub-folders
    ├── lib/               tierTheme, premiumForms, uploadDocuments, formatTimeStamp, formatSalary,
    │                      fileUrl, useImagePreview
    ├── utils/             storage (token), permission (camera / photos)
    ├── ocr/               reserved for document text extraction (empty)
    └── colors.js          design tokens (sunrise orange, premium ink + gold, admin jade, warm neutrals)
```

## Normal vs Premium

Two separate experiences that never mix — a premium hirer's jobs are only shown to premium professionals, and a
normal hirer's jobs only to normal workers (the backend enforces it).

| | Normal — daily work | Premium — professionals |
| --- | --- | --- |
| Look | sunrise orange | ink and gold |
| Sign-up | name, mobile, password (email optional) | + email |
| Before entering | `QuickSetupScreen`: own photo + Aadhaar photo (workers can tick the work they do) | `PremiumSeekerSetupScreen` (4 steps) / `PremiumHirerSetupScreen` (3 steps), saved step by step |
| Jobs | per-day / per-month pay, shift | yearly pay (LPA), qualification, experience, job type, skills |

## Design system

- Font: Plus Jakarta Sans (`src/theme.js` → `fonts`, `type`, `radius`, `shadow`). Use `fontFamily: fonts.bold` etc., never `fontWeight`.
- Themes (`lib/tierTheme.js`, `lib/useTheme.js`): Normal = sunrise orange, Premium = ink + gold on ivory, Admin = deep jade. No blue.
  `Button`, `Input`, `ChipGroup`, `Card`, `ListItem`, `StatCard`, `EmptyState` and `Screen` pick the right theme automatically.
- Every in-app screen uses `Components/Screen` (header + scroll + optional sticky footer); sign-in screens use `AuthLayout`.
- Real photos, no illustrations: `Logo` (a real sunrise photo, also the app icon), `PhotoHero` (sunrise photo headers), `lib/sectorImages.js`
  (`sectorImage(name, tier)` picks a photo for a job category, `heroImage(name)` for headers), used by
  `JobCard`, `CategoryCarousel` and the sector tiles.
- Keyboard: `App.js` wraps everything in `KeyboardProvider` (react-native-keyboard-controller); `Screen`,
  `AuthLayout` and `SetupLayout` scroll the focused field into view. Don't add `KeyboardAvoidingView`s.

## Languages

The app is written in English and translated on the fly (Azure AI Translator free tier, or NLLB-200 locally):

- `Components/Text` replaces React Native's `Text` everywhere and shows its words in the chosen language
  (`<Text translate={false}>` for the brand name and language names). Job posts, notifications and chat are
  translated too; text typed in an Indian script is translated even for English users. `Input`, `SearchBox` and the modals
  translate their placeholders with `useTranslated()`.
- `context/LanguageContext` collects the English texts on screen, sends them in batches to the backend
  (`POST /i18n/translate`) and keeps the results per language in AsyncStorage. Until a translation arrives —
  or if the translator is not running — the English text is shown.
- `Components/LanguagePicker`: on the landing page, the sign-in screens and in the side menu.

The backend caches translations in PostgreSQL and asks its translator (Azure, or the local `../translator`) only
for new texts. The first visit to a screen in a new language takes a few seconds; after that it is instant.

## Login flow

`HomeScreen` (wallpaper: Find Work / I Want to Hire) → `ChooseTierScreen` (Normal or Premium) →
`RegisterScreen` → `AuthContext.register()` → token saved under `"token"` → `AppNavigator` shows the setup
screen for the user's tier until `user.onboarded` → `UserScreen` with the cards for the role and tier.
`LoginScreen` accepts email or mobile number. On app start, `AuthContext` reads the token and calls
`GET /auth/profile`. Any `401` signs the user out.

Every screen sits inside a bottom safe area (`App.js`), so nothing is drawn under the phone's navigation
buttons or gesture bar; headers use the real status-bar height.

## Application flow (job seeker → hirer)

`FindJobsScreen` → `JobDetailsScreen` → `ApplyJobScreen` (`POST /applications/add-application`) →
`ApplicationDetailsScreen`. The hirer sees it in `ViewJobsScreen` → `JobApplicantsScreen` →
`ApplicantDetailsScreen` and shortlists, hires or rejects it (`PUT /applications/update-status/:id`);
the seeker is notified. Both sides can open a chat from the application.
