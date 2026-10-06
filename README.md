# Solara

Verified local jobs: job seekers find work, verified hirers post jobs, the owner moderates.

| Folder | What | Stack |
| --- | --- | --- |
| `frontend/` | Mobile app | Expo SDK 57 + React Native (JavaScript), React Navigation, Context, axios |
| `backend/` | REST API | FastAPI + SQLAlchemy + PostgreSQL |
| `translator/` | Optional offline translator (when no Azure key is set), used only by the backend | FastAPI + NLLB-200 (Hugging Face Transformers) |
| `mobile/` | Previous TypeScript app (mock API, phone OTP) — kept for reference, safe to delete | Expo + TypeScript |

Start with `backend/README.md` (database, seed, run), then `frontend/README.md` (point the app at the backend and run it).
Languages: set `AZURE_TRANSLATOR_KEY` in `backend/.env` (free, see `backend/README.md`), or run the local `translator/`.

```
app  ──HTTP──▶  backend (port 4000)  ──SQL──▶  PostgreSQL           (users, jobs… and the translation cache)
                       │
                       └──HTTPS──▶  Azure AI Translator (free F0)   (or the local NLLB-200 translator, port 5000)
```
The translator never touches the database and the app never talks to the translator.

Deploying for free (Neon + Render + Azure + EAS): see `DEPLOY.md`.
