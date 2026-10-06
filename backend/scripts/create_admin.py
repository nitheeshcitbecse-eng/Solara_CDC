"""Creates an admin account, or resets the password of an existing one.

    cd backend
    .venv\\Scripts\\python scripts\\create_admin.py admin@solara.app "admin@123" --name "Solara Admin"
    .venv\\Scripts\\python scripts\\create_admin.py owner@solara.app "owner@123" --super

--super makes the account the super admin (the owner, who can also add and remove admins).
Uses DATABASE_URL from backend/.env, so check which database that points at first.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app import models  # noqa: E402, F401
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.upgrades import apply_upgrades  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email")
    parser.add_argument("password")
    parser.add_argument("--name")
    parser.add_argument("--super", action="store_true", help="make this the super admin (owner)")
    args = parser.parse_args()
    if len(args.password) < 8:
        sys.exit("The password must be at least 8 characters")

    Base.metadata.create_all(engine)
    apply_upgrades(engine)
    email = args.email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, name=args.name or "Solara Admin", role="admin", onboarded=True, details={}, password_hash="")
            db.add(user)
            action = "Created"
        elif user.role != "admin":
            sys.exit(f"{email} is a {user.role} account, not an admin")
        else:
            action = "Updated"
        if args.name:
            user.name = args.name
        user.password_hash = hash_password(args.password)
        user.token_version = (user.token_version or 0) + 1  # old sessions must log in again
        user.status = "active"
        if args.super:
            user.is_super_admin = True
        db.commit()
        kind = "super admin" if user.is_super_admin else "admin"
        print(f"{action} {kind}: {email}")


if __name__ == "__main__":
    main()
