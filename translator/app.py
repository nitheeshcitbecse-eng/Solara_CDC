"""Solara translator: NLLB-200 behind a small HTTP API.

Only the Solara backend calls this service. It has no database and knows nothing about users;
the backend caches every translation in PostgreSQL, so each text is translated once.

    cd translator
    .venv\\Scripts\\activate
    uvicorn app:app --host 127.0.0.1 --port 5000

The model (NLLB_MODEL, default facebook/nllb-200-distilled-600M, about 2.5 GB) downloads on first
start into the Hugging Face cache. Requests return 503 until it has loaded.
"""

import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException

MODEL_NAME = os.getenv("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
BATCH_SIZE = int(os.getenv("NLLB_BATCH_SIZE", "16"))
NUM_BEAMS = int(os.getenv("NLLB_NUM_BEAMS", "2"))
MAX_TOKENS = 256

log = logging.getLogger("translator")
logging.basicConfig(level=logging.INFO)


class Engine:
    """Loads NLLB-200 once (in the background) and translates batches of text."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = "cpu"
        self.error: str | None = None
        self._lock = threading.Lock()  # the tokenizer's src_lang is shared state

    @property
    def ready(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            log.info("Loading %s on %s…", self.model_name, self.device)
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name).to(self.device).eval()
            self.tokenizer, self.model = tokenizer, model
            log.info("Model ready")
        except Exception as exc:  # keep the service up so /health can report the problem
            self.error = f"{type(exc).__name__}: {exc}"
            log.exception("Could not load the model")

    def supports(self, code: str) -> bool:
        return code in self.tokenizer.get_vocab()

    def translate(self, texts: list[str], source: str, target: str) -> list[str]:
        import torch

        results: list[str] = []
        with self._lock:
            self.tokenizer.src_lang = source
            target_id = self.tokenizer.convert_tokens_to_ids(target)
            for start in range(0, len(texts), BATCH_SIZE):
                batch = texts[start : start + BATCH_SIZE]
                inputs = self.tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=MAX_TOKENS)
                inputs = inputs.to(self.device)
                with torch.inference_mode():
                    output = self.model.generate(
                        **inputs, forced_bos_token_id=target_id, num_beams=NUM_BEAMS, max_length=MAX_TOKENS
                    )
                results += self.tokenizer.batch_decode(output, skip_special_tokens=True)
        return results


engine = Engine(MODEL_NAME)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.getenv("NLLB_SKIP_LOAD") != "1":
        threading.Thread(target=engine.load, daemon=True).start()
    yield


app = FastAPI(title="Solara Translator (NLLB-200)", version="1.0.0", lifespan=lifespan)


class TranslateIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)
    source: str = Field(default="eng_Latn", pattern=r"^[a-z]{3}_[A-Za-z]{4}$")
    target: str = Field(pattern=r"^[a-z]{3}_[A-Za-z]{4}$")


@app.get("/health")
def health():
    status = "ready" if engine.ready else ("failed" if engine.error else "loading")
    body = {"success": engine.ready, "status": status, "model": engine.model_name, "device": engine.device}
    if engine.error:
        body["message"] = engine.error
    return JSONResponse(body, status_code=200 if engine.ready else 503)


@app.post("/translate")
def translate(body: TranslateIn):
    if not engine.ready:
        message = "The translation model failed to load" if engine.error else "The translation model is still loading"
        raise HTTPException(status_code=503, detail=message)
    for code in (body.source, body.target):
        if not engine.supports(code):
            raise HTTPException(status_code=400, detail=f"Unsupported language code: {code}")
    if body.source == body.target:
        return {"success": True, "translations": body.texts}
    return {"success": True, "translations": engine.translate(body.texts, body.source, body.target)}


# Errors use the same shape as the Solara backend: { success: false, message }.


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"success": False, "message": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", ())[1:]) or "request"
    return JSONResponse({"success": False, "message": f"Invalid {field}: {first.get('msg', '')}"}, status_code=422)
