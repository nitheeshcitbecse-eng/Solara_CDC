# Solara — translator (NLLB-200), optional

**Optional.** The recommended translator is Azure AI Translator's free tier (see `backend/README.md`); the backend
uses this service only when `AZURE_TRANSLATOR_KEY` is empty — for working offline or without an Azure account.
It needs about 3 GB RAM, so it does not fit free hosting tiers.

A small FastAPI service that runs Meta's [NLLB-200](https://huggingface.co/facebook/nllb-200-distilled-600M)
translation model. **Only the Solara backend calls it.** It has no database: the backend caches every
translation in PostgreSQL, so each text is translated only once per language.

```
app ──▶ backend :4000 ──▶ PostgreSQL
              └────────▶ translator :5000 (this service)
```

## Setup (Windows, PowerShell)

```powershell
cd translator
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt          # CPU build of PyTorch (~1 GB installed)
uvicorn app:app --host 127.0.0.1 --port 5000
```

On the first start the model (about 2.5 GB) downloads into `%USERPROFILE%\.cache\huggingface`, then loads in
around 20 seconds. Until then `/translate` answers 503 and the app shows English. Check it with
http://127.0.0.1:5000/health (`"status": "ready"`).

Use `127.0.0.1`, not `0.0.0.0`: phones never talk to this service, only the backend on the same PC does.
If it runs elsewhere, set `TRANSLATOR_URL` in `backend/.env`.

## Settings (environment variables)

| Variable | Default | |
| --- | --- | --- |
| `NLLB_MODEL` | `facebook/nllb-200-distilled-600M` | `facebook/nllb-200-distilled-1.3B` translates better but needs about 3× the memory and time |
| `NLLB_BATCH_SIZE` | `16` | texts per model call |
| `NLLB_NUM_BEAMS` | `2` | higher = slightly better, slower |

## API

- `GET /health` → `{ success, status: "loading" | "ready" | "failed", model, device }` (503 until ready)
- `POST /translate` `{ texts: [...] (1–128), source: "eng_Latn", target: "tam_Taml" }` → `{ success, translations: [...] }` in the same order

Language codes are FLORES-200 codes (`hin_Deva`, `tam_Taml`, `tel_Telu`…). The languages offered in the app are
listed in `backend/app/services/translation.py`.

Tests (no model download needed): `.venv\Scripts\python -m pytest -q`.

## Licence

NLLB-200 weights are released by Meta under **CC-BY-NC 4.0 (non-commercial)**. Fine for development and
non-commercial use; check the licence before using it in a commercial product.
