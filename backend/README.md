# Solara — backend

FastAPI + SQLAlchemy 2 + PostgreSQL. Every response has the shape `{ "success": bool, "message"?: str, ...payload }`,
including errors (`{ "success": false, "message": "..." }` with the right HTTP status).

## Setup (Windows, PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
```

Create the database once (pgAdmin, or the `psql` that ships with PostgreSQL):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE solara;"
```

Seed and run:

```powershell
python -m app.seed --demo                                  # tables, sectors, admin + demo users/jobs
python -m app.seed --reset --demo                          # WIPES ALL DATA first — run this after pulling schema changes
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload   # 0.0.0.0 so phones on your Wi-Fi can reach it
```

API docs: http://localhost:4000/docs. Tests (use a temporary SQLite database, no PostgreSQL needed): `pytest`.

### Languages (free)

The app's own text, job posts, notifications and chat are shown in the user's language. Every translation is
cached in the `translations` table, so each text is translated once per language.

**MyMemory (default, nothing to set up):** free, no account and no key. 5,000 characters a day, or 50,000 with
`MYMEMORY_EMAIL=<your email>` (no sign-up). Good quality for all 11 Indian languages in the app.

**Azure AI Translator (optional upgrade):** free F0 tier, 2 million characters a month, and it is never billed (it
just stops until the next month). Used automatically once `AZURE_TRANSLATOR_KEY` is set.

1. Sign in at https://portal.azure.com (a free account; students can use *Azure for Students*, no card).
2. *Create a resource* → **Translator** → Pricing tier **Free F0**, region **Central India** → Create.
3. Open it → *Keys and Endpoint* → copy **KEY 1** and the **Location/Region**.
4. In `backend/.env`: `AZURE_TRANSLATOR_KEY=<key 1>` and `AZURE_TRANSLATOR_REGION=centralindia`. Restart the backend.

**Offline alternative:** `TRANSLATOR_PROVIDER=nllb` and run the NLLB-200 service in `../translator` (needs about
3 GB RAM, non-commercial licence). If the translator can't be reached, the app shows English.

After switching translators, `python scripts\clear_translations.py` empties the cache so texts are translated again.

In development, password-reset codes are printed in the server log; set `SMTP_*` in `.env` to send real email.

## Structure

```
backend/
├── app/
│   ├── main.py            app, routers, error → { success: false, message } handlers, job-photo static files
│   ├── config.py          settings from .env
│   ├── database.py        engine, session, Base
│   ├── security.py        bcrypt passwords, JWT, reset-code hashing
│   ├── deps.py            current user, role checks
│   ├── models/            user.py · job.py (Sector, Job, JobPhoto, SavedJob, Application) · activity.py · translation.py (cache)
│   ├── schemas/           request bodies (camelCase in, validated)
│   ├── routers/           auth · onboarding · sectors · jobs · applications · messages · support · admin · i18n
│   ├── services/          storage (image uploads), email, activity (notifications + audit log), onboarding rules,
│   │                      translation (database cache + clients for Azure AI Translator / local NLLB-200)
│   ├── serializers.py     rows → camelCase JSON
│   └── seed.py            sectors, admin account, demo data
├── tests/                 end-to-end API tests
└── uploads/               only read once: images saved here by older versions are moved into the database
```

## Roles and tiers

`seeker` (finds work), `hirer` (posts jobs after Aadhaar verification), `admin` (platform owner, created by the
seed script only — the register endpoint never creates admins).

Every seeker and hirer has a **tier**, chosen at sign-up:

| | Normal (daily-wage work) | Premium (professionals) |
| --- | --- | --- |
| Who | construction, house help, cooking, driving… | doctors, engineers, IT, teachers… |
| Sign-up | name, mobile, password (email optional) | name, email, mobile, password |
| Before using the app | own photo + Aadhaar photo | + profession, qualification, experience, skills, languages, city (seekers) / organisation type, size, designation, office address (hirers) |

Tiers never mix: sectors and jobs carry a tier, a hirer's jobs inherit the hirer's tier, and seekers can only
list, open, save and apply to jobs of their own tier (enforced on the server). `POST /onboarding/complete` checks
the requirements in `app/services/onboarding.py` and unlocks the app.

**Premium shortlist approval.** When a premium hirer shortlists (or hires) a professional, the owner is
notified and the application's `contact_status` becomes `pending`. Until the owner approves
(`PUT /admin/review-shortlist/{id}`), the hirer sees no phone or email and nobody can open a chat for that
application. Normal (daily-wage) applications skip this: chat is open and the phone is shown when the worker
shares it. Rules live in `app/services/contact.py`.

Login accepts the email address **or** the mobile number. Password reset works by email, so users who signed up
without one must add an email in their profile first.

## Endpoints (`/api/v1`)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` (`role`, `tier`) · `POST /auth/login` (`identifier` = email or mobile) · `GET /auth/profile` · `POST /auth/logout` · `PUT /auth/update-profile` (incl. premium `details`) · `POST /auth/send-reset-otp` · `POST /auth/reset-password` · `PUT /auth/change-password` |
| Onboarding | `POST /onboarding/upload-documents` (multipart, any of: `photo`, `aadhaarFront`, `aadhaarBack`, `last4`) · `POST /onboarding/complete` · `GET /users/get-photo/{id}` (self, admin, or the other side of an application) |
| Sectors | `GET /sectors/get-all-sectors` (own tier; admin: all or `?tier`) · `POST /sectors/add-sector` (admin, with `tier`) · `DELETE /sectors/delete-sector/{id}` (admin) |
| Jobs (seeker) | `GET /jobs/get-all-jobs?sectorId&q&city` · `GET /jobs/get-job/{id}` · `POST /jobs/save-job/{id}` · `DELETE /jobs/unsave-job/{id}` · `GET /jobs/get-saved-jobs` |
| Jobs (hirer) | `POST /jobs/add-job` (premium: `employmentType`, `minExperience`, `qualification`, `requiredSkills`) · `POST /jobs/upload-photos/{id}` (multipart `photos`, 1–6) · `GET /jobs/get-my-jobs` · `PUT /jobs/close-job/{id}` |
| Applications | `POST /applications/add-application` · `GET /applications/get-my-applications` · `GET /applications/get-application/{id}` · `GET /applications/get-job-applicants/{jobId}` · `PUT /applications/update-status/{id}` |
| Messages | `GET /messages/get-all-conversations` · `POST /messages/open-conversation/{applicationId}` · `GET /messages/get-messages/{id}` · `POST /messages/send-message/{id}` |
| Notifications | `GET /notifications/get-all-notifications` · `PUT /notifications/mark-all-read` |
| Support | `GET /support/get-all-faqs` · `POST /support/add-ticket` · `POST /support/add-report` |
| Languages | `GET /i18n/get-languages` · `POST /i18n/translate` (`language`, `texts` ≤ 100 × 1000 chars → `translations: { original: translated }`; English UI text and text typed in Indian scripts; cached in the `translations` table, new texts go to the translator; 503 when it is unavailable or the free monthly quota is used up). Both are public. |
| Admin | `GET /admin/get-dashboard-stats` (totals + per tier) · `GET /admin/get-all-users?role&tier&q` · `GET /admin/get-user/{id}` · `PUT /admin/update-user-status/{id}` · `GET /admin/get-pending-verifications` · `PUT /admin/verify-user/{id}` · `GET /admin/get-document/{userId}/{front\|back}` · `GET /admin/get-all-jobs?status&tier` · `PUT /admin/review-job/{id}` · `PUT /admin/take-down-job/{id}` · `GET /admin/get-shortlist-requests?status` · `PUT /admin/review-shortlist/{id}` · `GET /admin/get-all-reports?status` · `PUT /admin/resolve-report/{id}` · `GET /admin/get-audit-logs` |

## Security notes

- Passwords: bcrypt. Tokens: JWT (180 days, `JWT_EXPIRE_DAYS`) carrying a `token_version`; logout, password change/reset and bans
  bump the version, which invalidates every older token.
- Reset codes: 6 digits, stored as an HMAC, 10-minute expiry, 5 attempts, 3 sends per 15 minutes; the endpoint
  answers the same way whether or not the email exists.
- Uploads are identified by their bytes (JPG/PNG/WEBP only, 8 MB max), re-encoded as JPEG (max 1600 px, EXIF and
  GPS data removed) and stored in the database (`stored_files`), so they survive hosts with a temporary disk.
  Job photos are public at `/uploads/jobs/<name>`; Aadhaar images only through the admin endpoint (each view is
  audited); profile photos only to the people allowed to see them.
- Tables are created on startup with `create_all`; new columns on existing tables are added by `app/upgrades.py`. Add a migration tool (Alembic) before changing columns on a
  database that already holds real data.
