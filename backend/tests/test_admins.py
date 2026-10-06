from tests.conftest import API, login, onboard, register


def owner(client):
    return login(client, "owner@solara.app", "Solara@123")


def add_admin(client, headers, email="mod@solara.app"):
    return client.post(f"{API}/admin/add-admin", headers=headers, json={"name": "Moderator", "email": email, "password": "Moder@123"})


def test_owner_is_the_super_admin(client):
    profile = client.get(f"{API}/auth/profile", headers=owner(client)).json()["user"]
    assert profile["role"] == "admin" and profile["isSuperAdmin"] is True


def test_super_admin_adds_and_removes_admins(client):
    headers = owner(client)
    added = add_admin(client, headers)
    assert added.status_code == 201
    admin_id = added.json()["admin"]["id"]
    assert add_admin(client, headers).status_code == 409  # same email twice

    emails = [a["email"] for a in client.get(f"{API}/admin/get-admins", headers=headers).json()["admins"]]
    assert emails[0] == "owner@solara.app" and "mod@solara.app" in emails

    # The new admin moderates, but is not a super admin.
    mod = login(client, "mod@solara.app", "Moder@123")
    assert client.get(f"{API}/auth/profile", headers=mod).json()["user"]["isSuperAdmin"] is False
    assert client.get(f"{API}/admin/get-pending-verifications", headers=mod).status_code == 200

    removed = client.put(f"{API}/admin/update-admin-status/{admin_id}", headers=headers, json={"status": "banned"})
    assert removed.json()["message"] == "Admin removed"
    assert client.get(f"{API}/auth/profile", headers=mod).status_code == 401  # signed out everywhere


def test_admins_cannot_manage_admins_or_read_audit_logs(client):
    add_admin(client, owner(client))
    mod = login(client, "mod@solara.app", "Moder@123")
    assert add_admin(client, mod, "other@solara.app").status_code == 403
    assert client.get(f"{API}/admin/get-admins", headers=mod).status_code == 403
    assert client.get(f"{API}/admin/get-audit-logs", headers=mod).status_code == 403
    assert client.get(f"{API}/admin/get-audit-logs", headers=owner(client)).status_code == 200


def test_super_admin_cannot_be_removed_and_others_cannot_use_admin_tools(client):
    headers = owner(client)
    owner_id = client.get(f"{API}/auth/profile", headers=headers).json()["user"]["id"]
    response = client.put(f"{API}/admin/update-admin-status/{owner_id}", headers=headers, json={"status": "banned"})
    assert response.status_code == 403

    seeker = register(client, "seeker")
    onboard(client, seeker)
    assert client.get(f"{API}/admin/get-admins", headers=seeker).status_code == 403
