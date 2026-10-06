from typing import Annotated

from pydantic import Field, StringConstraints, field_validator

from app.schemas.base import CamelModel
from app.services.translation import LANGUAGE_CODES

Text = Annotated[str, StringConstraints(min_length=1, max_length=1000)]


class TranslateIn(CamelModel):
    language: str
    texts: list[Text] = Field(min_length=1, max_length=100)

    @field_validator("language")
    @classmethod
    def known_language(cls, value: str) -> str:
        if value not in LANGUAGE_CODES:
            raise ValueError("This language is not available")
        return value
