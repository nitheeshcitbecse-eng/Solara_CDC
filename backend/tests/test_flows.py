from tests.conftest import API, JPEG, login, onboard, register, upload_documents


def admin(client):
    return login(client, "owner@solara.app", "Solara@123")


def seeker(client):
    return login(client, "seeker@solara.app")


def doctor(client):
    return login(client, "doctor@solara.app")


def hirer(client):
    return login(client, "hirer@solara.app")


def hospital(client):
    return login(client, "hospital@solara.app")


def sector_id(client, headers, name):
    sectors = client.get(f"{API}/sectors/get-all-sectors", headers=headers).json()["sectors"]
    return next(sector["id"] for sector in sectors if sector["name"] == name)


def job_payload(**overrides):
    return {
        "title": "Kitchen helper",
        "description": "Help the head cook with chopping, cleaning and serving lunch.",
        "city": "Chennai",
        "salaryMin": 10000,
        "salaryMax": 12000,
        **overrides,
    }


# ── Onboarding ───────────────────────────────────────────────────────────────


def test_normal_onboarding_needs_only_photo_and_aadhaar(client):
    headers = register(client, "seeker")
    early = client.post(f"{API}/onboarding/complete", headers=headers)
    assert early.status_code == 400
    assert early.json()["message"] == "Please add your photo, a photo of your Aadhaar card"

    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=headers).json()["jobs"][0]["id"]
    blocked = client.post(
        f"{API}/applications/add-application",
        headers=headers,
        json={"jobId": job_id, "message": "I can start tomorrow and have five years of experience."},
    )
    assert blocked.status_code == 403  # not onboarded yet

    uploaded = upload_documents(client, headers)
    assert uploaded["user"]["hasPhoto"] is True
    assert uploaded["user"]["verificationStatus"] == "pending"
    done = client.post(f"{API}/onboarding/complete", headers=headers).json()
    assert done["user"]["onboarded"] is True


def test_premium_onboarding_asks_for_professional_details(client):
    headers = register(client, "seeker", tier="premium", email="newdoc@example.com")
    upload_documents(client, headers)
    missing = client.post(f"{API}/onboarding/complete", headers=headers).json()["message"]
    assert "profession" in missing and "qualification" in missing and "city" in missing

    client.put(
        f"{API}/auth/update-profile",
        headers=headers,
        json={
            "city": "Chennai",
            "skills": ["Surgery"],
            "experienceYears": 4,
            "details": {"profession": "Doctor", "qualification": "MBBS, MS", "languages": ["English"]},
        },
    )
    assert client.post(f"{API}/onboarding/complete", headers=headers).json()["user"]["onboarded"] is True


def test_premium_hirer_onboarding(client):
    headers = register(client, "hirer", tier="premium", email="hr@example.com")
    upload_documents(client, headers)
    assert client.post(f"{API}/onboarding/complete", headers=headers).status_code == 400
    client.put(
        f"{API}/auth/update-profile",
        headers=headers,
        json={
            "businessName": "Acme Engineering",
            "city": "Pune",
            "details": {
                "organizationType": "company",
                "designation": "Talent Lead",
                "companySize": "51-200",
                "officeAddress": "Hinjewadi Phase 1",
            },
        },
    )
    assert client.post(f"{API}/onboarding/complete", headers=headers).json()["user"]["onboarded"] is True


# ── Tier separation ──────────────────────────────────────────────────────────


def test_each_tier_only_sees_its_own_jobs_and_sectors(client):
    normal_jobs = client.get(f"{API}/jobs/get-all-jobs", headers=seeker(client)).json()["jobs"]
    premium_jobs = client.get(f"{API}/jobs/get-all-jobs", headers=doctor(client)).json()["jobs"]
    assert {job["tier"] for job in normal_jobs} == {"normal"}
    assert {job["tier"] for job in premium_jobs} == {"premium"}
    assert len(normal_jobs) == 3 and len(premium_jobs) == 3

    normal_sectors = {s["tier"] for s in client.get(f"{API}/sectors/get-all-sectors", headers=hirer(client)).json()["sectors"]}
    assert normal_sectors == {"normal"}

    # A normal seeker can't open, save or apply to a premium job, even by id.
    s = seeker(client)
    premium_id = premium_jobs[0]["id"]
    assert client.get(f"{API}/jobs/get-job/{premium_id}", headers=s).status_code == 404
    assert client.post(f"{API}/jobs/save-job/{premium_id}", headers=s).status_code == 404
    applied = client.post(
        f"{API}/applications/add-application",
        headers=s,
        json={"jobId": premium_id, "message": "I would like to apply for this position please."},
    )
    assert applied.status_code == 404


def test_premium_hirer_jobs_reach_only_premium_seekers(client):
    posted = client.post(
        f"{API}/jobs/add-job",
        headers=hospital(client),
        json=job_payload(
            title="ICU Nurse",
            sectorId=sector_id(client, hospital(client), "Healthcare"),
            salaryMin=400000,
            salaryMax=550000,
            salaryPeriod="year",
            employmentType="full_time",
            minExperience=2,
            qualification="B.Sc Nursing",
            requiredSkills=["ICU", "Ventilator care"],
        ),
    ).json()["job"]
    assert posted["tier"] == "premium"
    assert posted["requiredSkills"] == ["ICU", "Ventilator care"]

    assert posted["id"] in [job["id"] for job in client.get(f"{API}/jobs/get-all-jobs", headers=doctor(client)).json()["jobs"]]
    assert posted["id"] not in [job["id"] for job in client.get(f"{API}/jobs/get-all-jobs", headers=seeker(client)).json()["jobs"]]

    # Hirers can't post into the other tier's sectors, and normal jobs drop premium-only fields.
    wrong = client.post(
        f"{API}/jobs/add-job", headers=hirer(client), json=job_payload(sectorId=sector_id(client, hospital(client), "Healthcare"))
    )
    assert wrong.status_code == 400
    normal = client.post(
        f"{API}/jobs/add-job",
        headers=hirer(client),
        json=job_payload(sectorId=sector_id(client, hirer(client), "Cooking"), qualification="PhD"),
    ).json()["job"]
    assert normal["tier"] == "normal" and normal["qualification"] is None


# ── Verification ─────────────────────────────────────────────────────────────


def test_new_hirer_must_be_verified_before_posting(client):
    headers = register(client, "hirer")
    onboard(client, headers)
    cooking = sector_id(client, headers, "Cooking")
    assert client.post(f"{API}/jobs/add-job", headers=headers, json=job_payload(sectorId=cooking)).status_code == 403

    owner = admin(client)
    pending = client.get(f"{API}/admin/get-pending-verifications", headers=owner).json()["users"]
    hirer_id = pending[0]["id"]
    document = client.get(f"{API}/admin/get-document/{hirer_id}/front", headers=owner)
    assert document.status_code == 200
    assert document.headers["content-type"] == "image/jpeg" and document.content.startswith(b"\xff\xd8\xff")
    # Aadhaar files are never public.
    assert client.get(f"{API}/admin/get-document/{hirer_id}/front", headers=headers).status_code == 403

    client.put(f"{API}/admin/verify-user/{hirer_id}", headers=owner, json={"decision": "verified"})
    posted = client.post(f"{API}/jobs/add-job", headers=headers, json=job_payload(sectorId=cooking))
    assert posted.status_code == 201
    assert posted.json()["job"]["status"] == "active"


def test_rejecting_a_user_needs_a_reason(client):
    headers = register(client, "seeker")
    onboard(client, headers)
    user_id = client.get(f"{API}/auth/profile", headers=headers).json()["user"]["id"]
    response = client.put(f"{API}/admin/verify-user/{user_id}", headers=admin(client), json={"decision": "rejected"})
    assert response.status_code == 422


def test_uploads_reject_non_images(client):
    headers = register(client, "hirer")
    response = client.post(
        f"{API}/onboarding/upload-documents",
        headers=headers,
        files={"aadhaarFront": ("front.jpg", b"<script>alert(1)</script>", "image/jpeg")},
    )
    assert response.status_code == 400


def test_profile_photos_are_private(client):
    applicant = register(client, "seeker")
    onboard(client, applicant)
    applicant_id = client.get(f"{API}/auth/profile", headers=applicant).json()["user"]["id"]
    h = hirer(client)
    assert client.get(f"{API}/users/get-photo/{applicant_id}", headers=h).status_code == 404

    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=applicant).json()["jobs"][0]["id"]
    client.post(
        f"{API}/applications/add-application",
        headers=applicant,
        json={"jobId": job_id, "message": "I have five years of experience in this work."},
    )
    # Once the seeker applies to this hirer's job, the hirer can see their photo.
    assert client.get(f"{API}/users/get-photo/{applicant_id}", headers=h).status_code == 200
    assert client.get(f"{API}/users/get-photo/{applicant_id}", headers=hospital(client)).status_code == 404


# ── Applications, messages, notifications ────────────────────────────────────


def test_full_application_flow(client):
    s, h = seeker(client), hirer(client)
    jobs = client.get(f"{API}/jobs/get-all-jobs", headers=s).json()["jobs"]
    job_id = jobs[0]["id"]

    assert client.post(f"{API}/jobs/save-job/{job_id}", headers=s).json()["success"]
    assert [job["id"] for job in client.get(f"{API}/jobs/get-saved-jobs", headers=s).json()["jobs"]] == [job_id]

    short = client.post(f"{API}/applications/add-application", headers=s, json={"jobId": job_id, "message": "hi"})
    assert short.status_code == 422

    applied = client.post(
        f"{API}/applications/add-application",
        headers=s,
        json={"jobId": job_id, "message": "I have cooked for families for three years.", "sharePhone": False},
    )
    assert applied.status_code == 201
    application_id = applied.json()["application"]["id"]
    duplicate = client.post(
        f"{API}/applications/add-application",
        headers=s,
        json={"jobId": job_id, "message": "I have cooked for families for three years."},
    )
    assert duplicate.status_code == 409
    assert client.get(f"{API}/jobs/get-job/{job_id}", headers=s).json()["job"]["myApplicationId"] == application_id

    my_jobs = client.get(f"{API}/jobs/get-my-jobs", headers=h).json()["jobs"]
    assert next(job for job in my_jobs if job["id"] == job_id)["newApplicants"] == 1

    applicants = client.get(f"{API}/applications/get-job-applicants/{job_id}", headers=h).json()["applications"]
    assert applicants[0]["seeker"]["phone"] is None  # not shared
    assert applicants[0]["seeker"]["verified"] is True

    shortlisted = client.put(
        f"{API}/applications/update-status/{application_id}", headers=h, json={"status": "shortlisted"}
    ).json()
    assert shortlisted["application"]["status"] == "shortlisted"
    backwards = client.put(f"{API}/applications/update-status/{application_id}", headers=h, json={"status": "shortlisted"})
    assert backwards.status_code == 409

    notes = client.get(f"{API}/notifications/get-all-notifications", headers=s).json()
    assert notes["unread"] >= 1
    client.put(f"{API}/notifications/mark-all-read", headers=s)
    assert client.get(f"{API}/notifications/get-all-notifications", headers=s).json()["unread"] == 0

    conversation = client.post(f"{API}/messages/open-conversation/{application_id}", headers=h).json()["conversation"]
    client.post(f"{API}/messages/send-message/{conversation['id']}", headers=h, json={"text": "Can you start Monday?"})
    inbox = client.get(f"{API}/messages/get-all-conversations", headers=s).json()["conversations"]
    assert inbox[0]["unread"] == 1
    assert inbox[0]["otherUser"]["name"] == "Arun Home Services"
    thread = client.get(f"{API}/messages/get-messages/{conversation['id']}", headers=s).json()
    assert thread["messages"][0]["mine"] is False
    assert client.get(f"{API}/messages/get-all-conversations", headers=s).json()["conversations"][0]["unread"] == 0


def test_other_users_cannot_see_private_data(client):
    s, h = seeker(client), hirer(client)
    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=s).json()["jobs"][0]["id"]
    application_id = client.post(
        f"{API}/applications/add-application",
        headers=s,
        json={"jobId": job_id, "message": "I have cooked for families for three years."},
    ).json()["application"]["id"]

    stranger = register(client, "seeker")
    assert client.get(f"{API}/applications/get-application/{application_id}", headers=stranger).status_code == 404
    other_hirer = register(client, "hirer")
    assert client.get(f"{API}/applications/get-job-applicants/{job_id}", headers=other_hirer).status_code == 404
    assert client.put(f"{API}/jobs/close-job/{job_id}", headers=other_hirer).status_code == 404
    assert client.get(f"{API}/admin/get-all-users", headers=h).status_code == 403


# ── Admin ────────────────────────────────────────────────────────────────────


def test_new_sector_goes_through_review(client):
    h, owner = hirer(client), admin(client)
    posted = client.post(f"{API}/jobs/add-job", headers=h, json=job_payload(proposedSector="Gardening")).json()
    assert posted["job"]["status"] == "pending_review"
    job_id = posted["job"]["id"]

    assert job_id not in [job["id"] for job in client.get(f"{API}/jobs/get-all-jobs", headers=seeker(client)).json()["jobs"]]

    pending = client.get(f"{API}/admin/get-all-jobs?status=pending_review", headers=owner).json()["jobs"]
    assert [job["id"] for job in pending] == [job_id]
    approved = client.put(f"{API}/admin/review-job/{job_id}", headers=owner, json={"decision": "approve"}).json()
    assert approved["job"]["status"] == "active"
    assert approved["job"]["sector"] == {**approved["job"]["sector"], "name": "Gardening", "tier": "normal"}
    # An existing sector suggested in another letter case is reused, not duplicated.
    again = client.post(f"{API}/jobs/add-job", headers=h, json=job_payload(proposedSector="gardening")).json()
    assert again["job"]["status"] == "active"


def test_job_photos_are_public_but_validated(client):
    h = hirer(client)
    job_id = client.get(f"{API}/jobs/get-my-jobs", headers=h).json()["jobs"][0]["id"]
    uploaded = client.post(
        f"{API}/jobs/upload-photos/{job_id}",
        headers=h,
        files=[("photos", ("a.jpg", JPEG, "image/jpeg")), ("photos", ("b.jpg", JPEG, "image/jpeg"))],
    ).json()
    assert len(uploaded["job"]["photos"]) == 2
    assert client.get(uploaded["job"]["photos"][0]).status_code == 200


def test_admin_sector_management_and_audit(client):
    owner = admin(client)
    added = client.post(f"{API}/sectors/add-sector", headers=owner, json={"name": "Pharmacy", "icon": "medication", "tier": "premium"})
    assert added.status_code == 201
    assert added.json()["sector"]["tier"] == "premium"
    dup = client.post(f"{API}/sectors/add-sector", headers=owner, json={"name": "pharmacy", "tier": "premium"})
    assert dup.status_code == 409
    # The same name may exist once per tier.
    assert client.post(f"{API}/sectors/add-sector", headers=owner, json={"name": "Pharmacy", "tier": "normal"}).status_code == 201
    in_use = sector_id(client, owner, "Construction")
    assert client.delete(f"{API}/sectors/delete-sector/{in_use}", headers=owner).status_code == 409
    assert client.delete(f"{API}/sectors/delete-sector/{added.json()['sector']['id']}", headers=owner).json()["success"]

    actions = [log["action"] for log in client.get(f"{API}/admin/get-audit-logs", headers=owner).json()["logs"]]
    assert actions[:3] == ["delete_sector", "add_sector", "add_sector"]

    premium_users = client.get(f"{API}/admin/get-all-users?tier=premium", headers=owner).json()["users"]
    assert {user["email"] for user in premium_users} == {"doctor@solara.app", "hospital@solara.app"}


def test_banned_user_is_signed_out_and_blocked(client):
    s, owner = seeker(client), admin(client)
    seeker_id = client.get(f"{API}/auth/profile", headers=s).json()["user"]["id"]
    banned = client.put(
        f"{API}/admin/update-user-status/{seeker_id}", headers=owner, json={"status": "banned", "reason": "Fake profile"}
    )
    assert banned.json()["user"]["status"] == "banned"
    assert client.get(f"{API}/auth/profile", headers=s).status_code == 401
    blocked = client.post(f"{API}/auth/login", json={"identifier": "seeker@solara.app", "password": "Demo@1234"})
    assert blocked.status_code == 403


def test_reports_and_dashboard(client):
    s, owner = seeker(client), admin(client)
    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=s).json()["jobs"][0]["id"]
    sent = client.post(
        f"{API}/support/add-report", headers=s, json={"targetType": "job", "targetId": job_id, "reason": "fraud"}
    )
    assert sent.status_code == 201
    stats = client.get(f"{API}/admin/get-dashboard-stats", headers=owner).json()["stats"]
    assert stats["openReports"] == 1
    assert stats["activeJobs"] == 6
    assert stats["normal"] == {"seekers": 1, "hirers": 1, "activeJobs": 3}
    assert stats["premium"] == {"seekers": 1, "hirers": 1, "activeJobs": 3}

    report_id = client.get(f"{API}/admin/get-all-reports?status=open", headers=owner).json()["reports"][0]["id"]
    resolved = client.put(
        f"{API}/admin/resolve-report/{report_id}", headers=owner, json={"status": "resolved", "note": "Hirer warned"}
    ).json()
    assert resolved["report"]["status"] == "resolved"
    taken_down = client.put(f"{API}/admin/take-down-job/{job_id}", headers=owner, json={"reason": "Fraud confirmed"})
    assert taken_down.json()["job"]["status"] == "taken_down"
    assert client.get(f"{API}/jobs/get-job/{job_id}", headers=s).status_code == 404

    assert len(client.get(f"{API}/support/get-all-faqs", headers=s).json()["faqs"]) == 6
    ticket = client.post(
        f"{API}/support/add-ticket", headers=s, json={"topic": "jobs", "message": "I cannot find jobs in Madurai yet."}
    )
    assert ticket.status_code == 201


# ── Premium shortlist approval ───────────────────────────────────────────────


def _premium_application(client):
    """The demo doctor applies to the demo hospital's first job; returns (application_id, doctor, hospital)."""
    d, h = doctor(client), hospital(client)
    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=d).json()["jobs"][0]["id"]
    app_id = client.post(
        f"{API}/applications/add-application",
        headers=d,
        json={"jobId": job_id, "message": "Six years in emergency medicine, available in a month."},
    ).json()["application"]["id"]
    return app_id, d, h


def test_premium_contact_details_need_owner_approval(client):
    app_id, d, h = _premium_application(client)
    owner = admin(client)

    # Before shortlisting: no phone, no chat.
    before = client.get(f"{API}/applications/get-application/{app_id}", headers=h).json()["application"]
    assert before["seeker"]["phone"] is None and before["canChat"] is False
    assert client.post(f"{API}/messages/open-conversation/{app_id}", headers=h).status_code == 403

    shortlisted = client.put(f"{API}/applications/update-status/{app_id}", headers=h, json={"status": "shortlisted"}).json()
    assert shortlisted["application"]["contactStatus"] == "pending"
    assert "verify" in shortlisted["message"]

    # The owner is told automatically.
    titles = [n["title"] for n in client.get(f"{API}/notifications/get-all-notifications", headers=owner).json()["notifications"]]
    assert "Shortlist waiting for approval" in titles
    assert client.get(f"{API}/admin/get-dashboard-stats", headers=owner).json()["stats"]["pendingShortlists"] == 1

    # Still locked while pending — for both sides.
    pending = client.get(f"{API}/applications/get-application/{app_id}", headers=h).json()["application"]
    assert pending["seeker"]["phone"] is None and pending["seeker"]["email"] is None
    assert client.post(f"{API}/messages/open-conversation/{app_id}", headers=d).status_code == 403

    queue = client.get(f"{API}/admin/get-shortlist-requests", headers=owner).json()["requests"]
    assert [item["id"] for item in queue] == [app_id]
    approved = client.put(f"{API}/admin/review-shortlist/{app_id}", headers=owner, json={"decision": "approve"})
    assert approved.json()["request"]["contactStatus"] == "approved"

    unlocked = client.get(f"{API}/applications/get-application/{app_id}", headers=h).json()["application"]
    assert unlocked["seeker"]["phone"] == "9876543211"
    assert unlocked["seeker"]["email"] == "doctor@solara.app"
    conv = client.post(f"{API}/messages/open-conversation/{app_id}", headers=h).json()["conversation"]
    assert client.post(f"{API}/messages/send-message/{conv['id']}", headers=h, json={"text": "Hello doctor"}).status_code == 201
    seeker_view = client.get(f"{API}/applications/get-application/{app_id}", headers=d).json()["application"]
    assert seeker_view["canChat"] is True

    # Approving twice isn't possible.
    assert client.put(f"{API}/admin/review-shortlist/{app_id}", headers=owner, json={"decision": "approve"}).status_code == 409


def test_rejected_premium_shortlist_stays_locked(client):
    app_id, d, h = _premium_application(client)
    owner = admin(client)
    client.put(f"{API}/applications/update-status/{app_id}", headers=h, json={"status": "shortlisted"})
    no_reason = client.put(f"{API}/admin/review-shortlist/{app_id}", headers=owner, json={"decision": "reject"})
    assert no_reason.status_code == 422
    rejected = client.put(
        f"{API}/admin/review-shortlist/{app_id}", headers=owner, json={"decision": "reject", "note": "Licence could not be verified"}
    ).json()
    assert rejected["request"]["contactStatus"] == "rejected"
    view = client.get(f"{API}/applications/get-application/{app_id}", headers=h).json()["application"]
    assert view["seeker"]["phone"] is None and view["contactNote"] == "Licence could not be verified"
    assert client.post(f"{API}/messages/open-conversation/{app_id}", headers=h).status_code == 403


def test_normal_applications_need_no_approval(client):
    s, h = seeker(client), hirer(client)
    job_id = client.get(f"{API}/jobs/get-all-jobs", headers=s).json()["jobs"][0]["id"]
    app_id = client.post(
        f"{API}/applications/add-application",
        headers=s,
        json={"jobId": job_id, "message": "I can start tomorrow, I have done this work before.", "sharePhone": True},
    ).json()["application"]["id"]
    view = client.get(f"{API}/applications/get-application/{app_id}", headers=h).json()["application"]
    assert view["seeker"]["phone"] == "9876543210" and view["canChat"] is True and view["contactStatus"] is None
    shortlisted = client.put(f"{API}/applications/update-status/{app_id}", headers=h, json={"status": "shortlisted"}).json()
    assert shortlisted["application"]["contactStatus"] is None
    assert client.get(f"{API}/admin/get-dashboard-stats", headers=admin(client)).json()["stats"]["pendingShortlists"] == 0
    assert client.post(f"{API}/messages/open-conversation/{app_id}", headers=h).status_code == 200
