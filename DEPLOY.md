# Deploying Solara for free (Neon + Render + Azure Translator + EAS)

```
phone app (APK) ──▶ Render: solara-backend ──▶ Neon PostgreSQL (data, photos, translation cache)
                                    └────────▶ Azure AI Translator (free F0)
```

Free-tier limits that matter: Neon 0.5 GB storage per project; Render free sleeps after 15 idle minutes and
takes ~1 minute to wake (the app shows "Connecting to the server…"); Azure 2M characters a month.

## 1. Database: Neon

1. https://neon.tech → New project → region **AWS Asia Pacific (Singapore)**, Postgres 17 or newer.
2. *Connect* → copy the connection string (`postgresql://…neon.tech/neondb?sslmode=require…`).
   Tables, default sectors and the admin account are created automatically when the backend starts.

## 2. Translator: nothing to do

The free MyMemory translator works without an account. Optional: set `MYMEMORY_EMAIL` (your email) in Render for
50,000 instead of 5,000 characters a day, or add an Azure key (see "Languages (free)" in `backend/README.md`).

## 3. Backend: Render

1. Push this repository to GitHub (`.env` files and `.venv` are git-ignored, keep it that way).
2. https://render.com → **New → Blueprint** → pick the repository. Render reads `render.yaml`.
3. Fill in the values it asks for:
   - `DATABASE_URL`: the Neon string from step 1 (as is; `postgresql://` is fine)
   - `ADMIN_PASSWORD`: a strong password (the default is refused in production)
   - `MYMEMORY_EMAIL` (optional) and `AZURE_TRANSLATOR_KEY` (optional): see step 2
4. Wait for the deploy, then open `https://<your-service>.onrender.com/api/v1/health` → `{"success":true,…}`.
   The admin logs in with `owner@solara.app` and that password.

Demo accounts are **not** created in production. To add them to Neon from your PC (optional):
`$env:DATABASE_URL="<neon string>"; .venv\Scripts\python -m app.seed --demo` in `backend/`.

## 4. App

1. Put the Render URL in `frontend/eas.json` (both `preview` and `production`):
   `"EXPO_PUBLIC_BACKEND_URL": "https://<your-service>.onrender.com/api/v1"`
   and, to test with Expo Go first, in `frontend/.env`. Then `npx expo start --go -c`.
2. Installable Android APK (free EAS account):
   ```bash
   cd frontend
   npx eas-cli@latest login
   npx eas-cli@latest build --profile preview --platform android
   ```
   The build page gives a link / QR code to download the APK.

## Keeping it awake

Render's free plan puts the backend to sleep after 15 idle minutes (the next visitor waits ~1 minute).
Two things prevent that, nothing to set up:

- `backend/app/keep_awake.py`: on Render the backend calls its own `/api/v1/health` every 10 minutes.
- `.github/workflows/keep-awake.yml`: GitHub Actions pings it every 10 minutes too (free for public repos;
  GitHub pauses scheduled workflows after 60 days without commits; re-enable them under Actions).

One always-on service uses ~744 of Render's 750 free hours a month, so keep only this one service awake.
Set `KEEP_AWAKE_MINUTES=0` in Render to turn the self-ping off.
