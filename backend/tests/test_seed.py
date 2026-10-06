from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import User
from app.seed import seed
from tests.conftest import API, login


def test_seeding_again_keeps_admin_changes(client):
    """SEED_ON_START runs the seed on every start: it must only add what is missing."""
    owner = login(client, "owner@solara.app", "Solara@123")
    sectors = client.get(f"{API}/sectors/get-all-sectors", headers=owner).json()["sectors"]
    unused = next(sector for sector in sectors if sector["jobCount"] == 0)
    assert client.delete(f"{API}/sectors/delete-sector/{unused['id']}", headers=owner).json()["success"]

    seed()

    after = client.get(f"{API}/sectors/get-all-sectors", headers=owner).json()["sectors"]
    assert len(after) == len(sectors) - 1  # the deleted sector was not put back
    assert unused["name"] not in [s["name"] for s in after if s["tier"] == unused["tier"]]
    with SessionLocal() as db:
        assert db.scalar(select(func.count(User.id)).where(User.role == "admin")) == 1
