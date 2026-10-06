from typing import Literal

from pydantic import Field, model_validator

from app.schemas.base import CamelModel


def reason_field():
    return Field(min_length=5, max_length=300)


class UserStatusIn(CamelModel):
    status: Literal["active", "suspended", "banned"]
    reason: str = reason_field()


class VerifyUserIn(CamelModel):
    decision: Literal["verified", "rejected"]
    reason: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def check(self) -> "VerifyUserIn":
        if self.decision == "rejected" and not (self.reason and len(self.reason) >= 5):
            raise ValueError("Give a reason (at least 5 characters) when rejecting")
        return self


class ReviewJobIn(CamelModel):
    decision: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def check(self) -> "ReviewJobIn":
        if self.decision == "reject" and not (self.reason and len(self.reason) >= 5):
            raise ValueError("Give a reason (at least 5 characters) when rejecting")
        return self


class ReviewShortlistIn(CamelModel):
    decision: Literal["approve", "reject"]
    note: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def check(self) -> "ReviewShortlistIn":
        if self.decision == "reject" and not (self.note and len(self.note) >= 5):
            raise ValueError("Give a reason (at least 5 characters) when rejecting")
        return self


class TakeDownJobIn(CamelModel):
    reason: str = reason_field()


class ResolveReportIn(CamelModel):
    status: Literal["resolved", "dismissed"]
    note: str = reason_field()
