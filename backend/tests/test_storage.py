from io import BytesIO

from PIL import Image

from app.config import get_settings
from app.database import engine
from app.upgrades import import_disk_uploads
from tests.conftest import API, JPEG, login


def image_bytes(size, mode="RGB", fmt="PNG") -> bytes:
    out = BytesIO()
    Image.new(mode, size, (200, 80, 20, 0) if mode == "RGBA" else "orange").save(out, fmt)
    return out.getvalue()


def upload_job_photo(client, data, name="photo.png"):
    headers = login(client, "hirer@solara.app")
    job_id = client.get(f"{API}/jobs/get-my-jobs", headers=headers).json()["jobs"][0]["id"]
    return client.post(f"{API}/jobs/upload-photos/{job_id}", headers=headers, files=[("photos", (name, data, "image/png"))])


def test_photos_are_shrunk_to_jpeg_and_kept_in_the_database(client):
    upload_dir = get_settings().upload_dir
    before = set(upload_dir.rglob("*")) if upload_dir.exists() else set()

    response = upload_job_photo(client, image_bytes((3000, 2000), "RGBA"))
    assert response.status_code == 200, response.json()
    url = response.json()["job"]["photos"][0]
    assert url.startswith("/uploads/jobs/") and url.endswith(".jpg")

    photo = client.get(url)
    assert photo.status_code == 200 and photo.headers["content-type"] == "image/jpeg"
    with Image.open(BytesIO(photo.content)) as image:
        assert image.size == (1600, 1067) and image.mode == "RGB"
    # Nothing is written to disk (Render's free disk is wiped on every restart).
    assert (set(upload_dir.rglob("*")) if upload_dir.exists() else set()) == before


def test_broken_images_are_rejected(client):
    response = upload_job_photo(client, b"\xff\xd8\xff\xe0" + b"\x00" * 64, "broken.jpg")
    assert response.status_code == 400
    assert response.json()["message"] == "This image could not be read. Try another photo."


def test_unknown_job_photo_is_404(client):
    assert client.get("/uploads/jobs/does-not-exist.jpg").status_code == 404


def test_files_saved_on_disk_by_older_versions_are_imported(client):
    folder = get_settings().upload_dir / "jobs"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "legacy0123456789.jpg").write_bytes(JPEG)

    assert import_disk_uploads(engine) == 1
    assert import_disk_uploads(engine) == 0  # only once
    photo = client.get("/uploads/jobs/legacy0123456789.jpg")
    assert photo.status_code == 200 and photo.content == JPEG
    (folder / "legacy0123456789.jpg").unlink()
