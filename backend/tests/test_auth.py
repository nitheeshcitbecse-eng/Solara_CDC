import re

from tests.conftest import API, auth, login, register


def test_register_login_profile_logout(client):
    headers = register(client, "seeker", email="new@example.com")
    profile = client.get(f"{API}/auth/profile", headers=headers).json()
    assert profile["success"] is True
    assert profile["user"]["role"] == "seeker"
    assert profile["user"]["tier"] == "normal"
    assert profile["user"]["onboarded"] is False

    assert client.post(f"{API}/auth/logout", headers=headers).json()["success"] is True
    # The old token stops working after logout.
    assert client.get(f"{API}/auth/profile", headers=headers).status_code == 401


def test_normal_users_can_sign_up_and_login_with_mobile_only(client):
    response = client.post(
        f"{API}/auth/register",
        json={"name": "Raju", "phone": "9123456789", "password": "Secret@123", "role": "seeker", "tier": "normal"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] is None
    login(client, "9123456789", "Secret@123")
    login(client, "+91 91234 56789", "Secret@123")  # spaces and country code are ignored


def test_premium_users_need_an_email(client):
    response = client.post(
        f"{API}/auth/register",
        json={"name": "Dr Test", "phone": "9123456780", "password": "Secret@123", "role": "seeker", "tier": "premium"},
    )
    assert response.status_code == 422
    assert response.json()["message"] == "Email is required for premium accounts"


def test_errors_use_success_false_shape(client):
    wrong = client.post(f"{API}/auth/login", json={"identifier": "seeker@solara.app", "password": "nope"})
    assert wrong.status_code == 401
    assert wrong.json() == {"success": False, "message": "Invalid login details or password"}

    short = client.post(
        f"{API}/auth/register",
        json={"name": "A B", "phone": "9123456789", "password": "123", "role": "seeker", "tier": "normal"},
    )
    assert short.status_code == 422
    assert short.json()["message"] == "Password must be at least 8 characters"

    duplicate_email = client.post(
        f"{API}/auth/register",
        json={"name": "Dup", "email": "SEEKER@solara.app", "phone": "9123456789", "password": "Secret@123",
              "role": "seeker", "tier": "normal"},
    )
    assert duplicate_email.status_code == 409
    duplicate_phone = client.post(
        f"{API}/auth/register",
        json={"name": "Dup", "phone": "9876543210", "password": "Secret@123", "role": "seeker", "tier": "normal"},
    )
    assert duplicate_phone.status_code == 409

    assert client.get(f"{API}/nope").json()["success"] is False


def test_admin_role_cannot_self_register(client):
    response = client.post(
        f"{API}/auth/register",
        json={"name": "Evil", "phone": "9123456789", "password": "Secret@123", "role": "admin", "tier": "normal"},
    )
    assert response.status_code == 422


def test_forgot_and_reset_password(client, emails):
    sent = client.post(f"{API}/auth/send-reset-otp", json={"email": "seeker@solara.app"})
    assert sent.json()["success"] is True
    code = re.search(r"\b(\d{6})\b", emails[-1][2]).group(1)

    bad = client.post(
        f"{API}/auth/reset-password", json={"email": "seeker@solara.app", "otp": "000000", "newPassword": "Fresh@1234"}
    )
    assert bad.status_code == 400

    good = client.post(
        f"{API}/auth/reset-password", json={"email": "seeker@solara.app", "otp": code, "newPassword": "Fresh@1234"}
    )
    assert good.json()["success"] is True
    login(client, "seeker@solara.app", "Fresh@1234")

    # A code can't be used twice.
    again = client.post(
        f"{API}/auth/reset-password", json={"email": "seeker@solara.app", "otp": code, "newPassword": "Other@1234"}
    )
    assert again.status_code == 400


def test_unknown_email_gets_same_reset_answer(client, emails):
    response = client.post(f"{API}/auth/send-reset-otp", json={"email": "nobody@example.com"})
    assert response.json()["success"] is True
    assert emails == []


def test_change_password_returns_fresh_token(client):
    headers = login(client, "seeker@solara.app")
    wrong = client.put(
        f"{API}/auth/change-password", headers=headers, json={"oldPassword": "bad", "newPassword": "Fresh@1234"}
    )
    assert wrong.status_code == 400
    changed = client.put(
        f"{API}/auth/change-password", headers=headers, json={"oldPassword": "Demo@1234", "newPassword": "Fresh@1234"}
    ).json()
    assert changed["success"] is True
    assert client.get(f"{API}/auth/profile", headers=headers).status_code == 401
    assert client.get(f"{API}/auth/profile", headers=auth(changed["token"])).status_code == 200


def test_update_profile(client):
    headers = login(client, "seeker@solara.app")
    updated = client.put(
        f"{API}/auth/update-profile",
        headers=headers,
        json={"city": "Madurai", "skills": ["Driving", " Cooking ", "Driving"], "businessName": "ignored"},
    ).json()
    assert updated["user"]["city"] == "Madurai"
    assert updated["user"]["skills"] == ["Driving", "Cooking"]
    assert updated["user"]["businessName"] is None


def test_premium_details_are_validated_and_merged(client):
    headers = login(client, "doctor@solara.app")
    updated = client.put(
        f"{API}/auth/update-profile",
        headers=headers,
        json={"details": {"specialization": "Cardiology", "languages": ["English", "Tamil", "English"], "bogus": 1}},
    ).json()
    details = updated["user"]["details"]
    assert details["specialization"] == "Cardiology"
    assert details["languages"] == ["English", "Tamil"]
    assert details["profession"] == "Doctor"  # untouched answers are kept
    assert "bogus" not in details

    bad = client.put(f"{API}/auth/update-profile", headers=headers, json={"details": {"noticePeriod": "forever"}})
    assert bad.status_code == 422


def test_login_lasts_six_months_unless_ended(client):
    import time

    import jwt as pyjwt

    from app.config import get_settings

    token = client.post(f"{API}/auth/login", json={"identifier": "seeker@solara.app", "password": "Demo@1234"}).json()["token"]
    claims = pyjwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    days_left = (claims["exp"] - time.time()) / 86400
    assert 179.9 < days_left <= 180

    # Logging out still ends it at once.
    headers = {"Authorization": f"Bearer {token}"}
    client.post(f"{API}/auth/logout", headers=headers)
    assert client.get(f"{API}/auth/profile", headers=headers).status_code == 401
