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

## 2. Translator: Azure (optional, without it the app stays in English)

Follow "Languages (free)" in `backend/README.md` → you get a key and the region `centralindia`.

## 3. Backend: Render

1. Push this repository to GitHub (`.env` files and `.venv` are git-ignored, keep it that way).
2. https://render.com → **New → Blueprint** → pick the repository. Render reads `render.yaml`.
3. Fill in the values it asks for:
   - `DATABASE_URL`: the Neon string from step 1 (as is; `postgresql://` is fine)
   - `ADMIN_PASSWORD`: a strong password (the default is refused in production)
   - `AZURE_TRANSLATOR_KEY`: the key from step 2, or leave empty
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

## Keeping it awake (optional)

A free monitor such as https://cron-job.org calling `/api/v1/health` every 10 minutes keeps the server from
sleeping. One always-on service uses ~744 of Render's 750 free hours a month, so do this for one service only.
