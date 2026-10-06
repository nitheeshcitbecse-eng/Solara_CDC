"""Empties the translation cache, e.g. after switching from NLLB-200 to Azure AI Translator.

    cd backend
    .venv\\Scripts\\python scripts\\clear_translations.py            # every language
    .venv\\Scripts\\python scripts\\clear_translations.py tam_Taml   # one language

Texts are translated again the next time someone views them.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Translation  # noqa: E402


def main() -> None:
    statement = delete(Translation)
    if len(sys.argv) > 1:
        statement = statement.where(Translation.language == sys.argv[1])
    with SessionLocal() as db:
        removed = db.execute(statement).rowcount
        db.commit()
    print(f"Removed {removed} cached translations")


if __name__ == "__main__":
    main()
