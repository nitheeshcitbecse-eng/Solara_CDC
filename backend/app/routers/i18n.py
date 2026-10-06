from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.responses import ok
from app.schemas.i18n import TranslateIn
from app.services.translation import SOURCE_LANGUAGE, public_languages, translate_texts

# Open to everyone: the landing and sign-in screens are translated before anyone logs in.
router = APIRouter(prefix="/i18n", tags=["i18n"])


@router.get("/get-languages")
def get_languages():
    return ok(languages=public_languages(), source=SOURCE_LANGUAGE)


@router.post("/translate")
def translate(body: TranslateIn, db: Session = Depends(get_db)):
    return ok(language=body.language, translations=translate_texts(db, body.texts, body.language))
