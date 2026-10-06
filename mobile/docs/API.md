# Solara API contract (v1)

This document is the single source of truth shared by the mobile app and the
Node/Express backend. The in-app mock (`src/api/mock`) implements exactly
this contract; TypeScript models for every payload live in `src/lib/types/`.

---

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `{EXPO_PUBLIC_API_URL}` — always ends with `/api/v1` |
| Format | JSON (`application/json; charset=utf-8`) except the multipart uploads marked below |
| Auth | `Authorization: Bearer <accessToken>` on every endpoint except `/auth/*` and `/superadmin/auth/*` |
| Language | `Accept-Language: en \| ta \| hi \| te \| kn \| ml \| bn \| mr \| gu \| pa \| or \| ur`. Server-generated text (FAQ answers, AI summaries) should be localised when possible, else English |
| Client headers | `X-Client: solara-mobile`, `X-Client-Version: <semver>` |
| IDs | opaque strings |
| Dates | ISO-8601 UTC strings (`2026-10-03T09:30:00.000Z`); date-only fields use `YYYY-MM-DD`; month fields use `YYYY-MM` |
| Money | integer rupees (no paise) |
| Phone | E.164, Indian numbers only: `+91` followed by `^[6-9]\d{9}$` |
| Pagination | `?page=1&limit=20` (limit ≤ 50) → `{ "items": [], "page": 1, "limit": 20, "total": 134 }` |
| Cursor lists | messages only: `?cursor=<opaque>` → `{ "items": [], "nextCursor": "…" \| null }` |
| Empty success | `204 No Content` |

### 1.1 Errors

Every non-2xx response has this body:

```json
{ "error": { "code": "VALIDATION", "message": "Human readable (English, for logs only)", "details": { "field": "phone" } } }
```

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION` | 400 / 422 | Body or query failed validation. `details.fields` = `{ [field]: reasonCode }` |
| `UNAUTHORIZED` | 401 | Missing/expired access token, or invalid refresh token |
| `FORBIDDEN` | 403 | Authenticated, but the role or account status does not allow this |
| `NOT_FOUND` | 404 | Resource does not exist or is not visible to the caller |
| `CONFLICT` | 409 | Duplicate (already applied, phone registered with another role, …). `details.reason` explains |
| `RATE_LIMITED` | 429 | Too many requests. `Retry-After` header (seconds) **and** `details.retryAfter` |
| `OTP_INVALID` | 400 | Wrong code |
| `OTP_EXPIRED` | 400 | Code or request expired; ask for a new one |
| `PAYLOAD_TOO_LARGE` | 413 | Upload exceeds the size limits in §1.3 |
| `UNSUPPORTED_MEDIA` | 415 | Upload MIME type not allowed |
| `SERVER` | 5xx | Unexpected failure |

The app never shows `message` to users; it maps `code` to translated copy.

### 1.2 Token lifecycle

* `accessToken` — short-lived JWT (15 min). Kept in memory only by the app.
* `refreshToken` — long-lived, **rotated on every refresh**. Re-using an old refresh
  token must revoke the whole session family and return `401 UNAUTHORIZED`.
* On `401` the client performs one shared refresh and replays queued requests.

### 1.3 Upload limits (multipart/form-data)

| Kind | MIME types | Max size |
| --- | --- | --- |
| Images (workplace photos, Aadhaar photos) | `image/jpeg`, `image/png`, `image/webp` | 8 MB each |
| Documents (Aadhaar PDF) | `application/pdf`, `image/jpeg`, `image/png` | 10 MB |
| Audio (voice intro) | `audio/m4a`, `audio/mp4`, `audio/aac`, `audio/mpeg`, `audio/wav` | 5 MB, ≤ 60 s |

Clients resize images to max 1600 px and re-encode at quality 0.75 before upload
(this also strips EXIF/GPS metadata). Servers must still validate type and size.

---

## 2. Shared models

```ts
type Role = 'user' | 'admin' | 'superadmin';
type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';
type AccountStatus = 'active' | 'suspended' | 'banned';
type LanguageCode = 'en'|'ta'|'hi'|'te'|'kn'|'ml'|'bn'|'mr'|'gu'|'pa'|'or'|'ur';

type SessionUser = {
  id: string; role: Role; phone: string | null; email: string | null;
  name: string | null; firstName: string | null;
  profileComplete: boolean; verificationStatus: VerificationStatus;
};

type Sector = { id: string; slug: string; name: string; jobCount: number };

type Salary = { type: 'monthly' | 'daily' | 'hourly'; amount: number };
type Shift = 'morning' | 'day' | 'evening' | 'night' | 'flexible';
type JobLocation = { area: string | null; city: string; district: string; state: string; pincode: string };
type Difficulty = 'easy' | 'moderate' | 'hard';
type Safety = 'safe' | 'caution' | 'unsafe';
type JobStatus = 'draft' | 'analysing' | 'pending_review' | 'active' | 'closed' | 'rejected' | 'taken_down';

type JobSummary = {
  id: string; title: string;
  sector: { id: string; slug: string; name: string } | null;   // null while a new sector is under review
  proposedSectorName: string | null;
  hirer: { id: string; displayName: string; verified: boolean };
  salary: Salary; shift: Shift; location: JobLocation; openings: number;
  difficulty: Difficulty | null; status: JobStatus; createdAt: string;
  saved: boolean;            // for the calling job seeker
  applied: boolean;          // for the calling job seeker
  applicantCount: number;    // meaningful for the owning admin
};

type JobDetail = JobSummary & {
  description: string;
  timings: { start: string; end: string } | null;   // "HH:mm"
  requirements: string[]; languages: LanguageCode[]; benefits: string[];
  photos: { id: string; url: string }[];
  safety: Safety | null;
  myApplicationId: string | null;
};

type AadhaarInfo = { status: VerificationStatus; last4: string | null; rejectionReason: string | null; uploadedAt: string | null };
```

---

## 3. Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | `{ phone, role: 'user'\|'admin' }` | `202 { requestId, expiresInSec, resendAfterSec }` |
| POST | `/auth/otp/verify` | `{ requestId, phone, code }` | `200 { accessToken, refreshToken, user: SessionUser }` |
| POST | `/auth/google` | `{ idToken, role }` | same as verify |
| POST | `/auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` (rotated) |
| POST | `/auth/logout` | `{ refreshToken }` | `204` |
| POST | `/superadmin/auth/login` | `{ email, password }` | `200 { mfaToken }` (valid 5 min) |
| POST | `/superadmin/auth/totp` | `{ mfaToken, code }` | `200 { accessToken, refreshToken, user }` |

Rules
* An unknown phone creates a new account for the requested role with `profileComplete: false`.
* A phone registered under the other role → `409 CONFLICT` with `details.reason = "ROLE_MISMATCH"`.
* OTP requests are rate limited per phone (default 5/hour) → `429 RATE_LIMITED`.
* `superadmin` accounts can never sign in through `/auth/otp/*` or `/auth/google` (→ `403 FORBIDDEN`).

---

## 4. Profile (`/me`)

`GET /me` → `Me`

```ts
type Gender = 'female' | 'male' | 'other' | 'prefer_not';
type Qualification = 'none'|'primary'|'secondary'|'higher_secondary'|'diploma'|'graduate'|'postgraduate';
type Availability = 'immediate' | 'within_week' | 'within_month' | 'part_time';
type WorkExperience = { id: string; title: string; employer: string; from: string; to: string | null }; // YYYY-MM

type SeekerProfile = {
  fullName: string | null; gender: Gender | null; dateOfBirth: string | null; email: string | null;
  languagesKnown: LanguageCode[];
  qualification: Qualification | null;
  state: string | null; district: string | null; city: string | null; pincode: string | null;
  workHistory: WorkExperience[]; currentWork: string | null; skills: string[];
  preferredSectorIds: string[]; expectedSalary: number | null; availability: Availability | null;
  onboardingStep: 1 | 2 | 3;      // step to resume from
  aadhaar: AadhaarInfo;
};

type HirerType = 'individual' | 'business' | 'agency';
type HirerProfile = {
  hirerType: HirerType | null; name: string | null; businessName: string | null;
  address: { line1: string; city: string; state: string; pincode: string } | null;
  gstin: string | null; onboardingStep: 1 | 2 | 3 | 4; aadhaar: AadhaarInfo;
};

type Settings = {
  language: LanguageCode;
  notifications: { applications: boolean; messages: boolean; jobAlerts: boolean };
  privacy: { profileVisibleToVerifiedHirers: boolean; sharePhoneByDefault: boolean };
};

type Me = { user: SessionUser; seeker: SeekerProfile | null; hirer: HirerProfile | null; settings: Settings; deletionRequestedAt: string | null };
```

| Method | Path | Role | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/me` | any | – | `Me` |
| PATCH | `/me/profile` | user | `Partial<SeekerProfile minus aadhaar> & { complete?: boolean }` | `Me` |
| PATCH | `/admin/profile` | admin | `Partial<HirerProfile minus aadhaar> & { complete?: boolean }` | `Me` |
| POST | `/me/aadhaar` | user, admin | multipart: `front` (file), `back` (file, optional), `last4` | `AadhaarInfo` (status `pending`) |
| PATCH | `/me/settings` | any | `Partial<Settings>` (deep-merged) | `Settings` |
| DELETE | `/me` | user, admin | – | `202 { scheduledFor }` — account deleted after 30 days unless the user signs in again |

* `complete: true` validates that every required field is present (`VALIDATION` otherwise) and sets `user.profileComplete = true`.
  Seeker required: fullName, gender, dateOfBirth (18+), languagesKnown (≥1), qualification, state, district, city, pincode, skills (≥1), preferredSectorIds (≥1), availability.
  Hirer required: hirerType, name, address, and an uploaded Aadhaar (`status` ≠ `none`). Business/agency also require businessName.
* The Aadhaar number is never sent; only the last 4 digits. The server never returns document URLs to the owner.

---

## 5. Sectors

| Method | Path | Role | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/sectors` | any | – | `Sector[]` (approved sectors, sorted by name) |
| POST | `/sectors/check` | admin | `{ name }` | `{ decision: 'match'\|'new'\|'review', sector: Sector \| null, confidence: number }` |

`match` → use `sector`. `new` → a sector will be proposed and reviewed with the job.
`review` → the AI was unsure; a moderator will pick or create the sector.

---

## 6. Jobs (job seeker)

| Method | Path | Query / Body | Response |
| --- | --- | --- | --- |
| GET | `/jobs` | `sectorId, q, city, minSalary, shift, page, limit` | `Page<JobSummary>` (active jobs only) |
| GET | `/jobs/:id` | – | `JobDetail` |
| POST | `/me/saved-jobs/:id` | – | `204` |
| DELETE | `/me/saved-jobs/:id` | – | `204` |
| GET | `/me/saved-jobs` | `page, limit` | `Page<JobSummary>` |
| GET | `/me/jobs` | `state=current\|past, page, limit` | `Page<Engagement>` |

```ts
type Engagement = { id: string; job: JobSummary; startedOn: string; endedOn: string | null; applicationId: string };
```

---

## 7. Jobs (admin)

```ts
type JobInput = {
  sectorId: string | null; proposedSectorName: string | null;   // exactly one must be set
  title: string; description: string; salary: Salary; shift: Shift;
  timings: { start: string; end: string } | null; openings: number; location: JobLocation;
  requirements: string[]; languages: LanguageCode[]; benefits: string[];
};

type JobAnalysis =
  | { status: 'analysing'; startedAt: string }
  | { status: 'complete'; verdict: 'pass' | 'unsafe' | 'rejected';
      rejectionReason: 'ai_generated' | 'unrelated' | null;
      difficulty: Difficulty; safety: Safety; authenticity: 'authentic' | 'ai_generated' | 'unrelated';
      hazards: Hazard[]; confidence: number; summary: string };
type Hazard = 'wet_floor'|'sharp_tools'|'heat'|'heavy_lifting'|'chemicals'|'traffic'|'heights'|'electrical'|'poor_ventilation';

type AdminDashboard = {
  stats: { activeJobs: number; newApplicants: number; hires: number; pendingReview: number };
  verificationStatus: VerificationStatus; rejectionReason: string | null;
  recentApplicants: ApplicantSummary[];
};
```

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/admin/jobs` | `JobInput` | `201 JobDetail` (status `draft`) — requires a verified hirer (`403` otherwise) |
| PATCH | `/admin/jobs/:id` | `Partial<JobInput>` | `JobDetail` — editing an active job's sector re-triggers review |
| POST | `/admin/jobs/:id/photos` | multipart: `photos` (3–6 files), `note?` | `202 { status: 'analysing' }` — replaces previous photos |
| GET | `/admin/jobs/:id/analysis` | – | `JobAnalysis` (poll every 1.5 s while `analysing`) |
| POST | `/admin/jobs/:id/submit` | – | `JobDetail` → `active`, or `pending_review` when the sector is new/under review. `409` unless verdict is `pass` |
| POST | `/admin/jobs/:id/close` | – | `JobDetail` (`closed`) |
| GET | `/admin/jobs` | `state=active\|pending\|closed, page, limit` | `Page<JobSummary>` (`pending` = draft, analysing, pending_review, rejected) |
| GET | `/admin/dashboard` | – | `AdminDashboard` |

A verdict of `unsafe` moves the job to `pending_review` and creates a moderation item; it cannot be submitted.
A verdict of `rejected` keeps the job in `draft`; the hirer must upload new photos.

---

## 8. Applications

```ts
type ApplicationStatus = 'applied' | 'shortlisted' | 'hired' | 'rejected';
type StatusEvent = { status: ApplicationStatus; at: string };
type VoiceIntro = { url: string; durationSec: number };

type Application = {
  id: string; job: JobSummary; status: ApplicationStatus; createdAt: string;
  message: string; voiceIntro: VoiceIntro; expectedSalary: number | null;
  availableFrom: string | null; sharePhone: boolean;
  timeline: StatusEvent[]; conversationId: string | null;
};

type ApplicantSummary = {
  id: string;                        // application id
  jobId: string; jobTitle: string; status: ApplicationStatus; createdAt: string;
  applicant: { id: string; name: string; city: string | null; verified: boolean; skills: string[] };
};

type ApplicantDetail = ApplicantSummary & {
  message: string; voiceIntro: VoiceIntro; expectedSalary: number | null; availableFrom: string | null;
  phone: string | null;              // only when the seeker consented (sharePhone)
  profile: { qualification: Qualification | null; languagesKnown: LanguageCode[];
             workHistory: WorkExperience[]; currentWork: string | null; age: number | null };
  timeline: StatusEvent[]; conversationId: string | null;
};
```

| Method | Path | Role | Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/jobs/:id/applications` | user | multipart: `message` (20–500), `voiceIntro` (file, ≤ 60 s), `voiceDurationSec`, `expectedSalary?`, `availableFrom?` (YYYY-MM-DD), `sharePhone` (`true`/`false`) | `201 Application` — `409 CONFLICT` if already applied |
| GET | `/me/applications` | user | `status?, page, limit` | `Page<Application>` |
| GET | `/me/applications/:id` | user | – | `Application` |
| GET | `/admin/jobs/:id/applications` | admin | `status?, page, limit` | `Page<ApplicantSummary>` |
| GET | `/admin/applications/:id` | admin | – | `ApplicantDetail` |
| PATCH | `/admin/applications/:id` | admin | `{ status: 'shortlisted'\|'hired'\|'rejected' }` | `ApplicantDetail` |

---

## 9. Messages & notifications

```ts
type Conversation = {
  id: string; participant: { id: string; name: string; role: Role };
  job: { id: string; title: string } | null;
  lastMessage: { text: string; at: string; fromMe: boolean } | null; unreadCount: number;
};
type Message = { id: string; conversationId: string; fromMe: boolean; text: string; createdAt: string };

type NotificationType = 'application_status' | 'new_applicant' | 'message' | 'verification' | 'job_review' | 'system';
type AppNotification = {
  id: string; type: NotificationType; read: boolean; createdAt: string;
  params: Record<string, string>;     // values interpolated into translated copy, e.g. { jobTitle, status }
  target: { kind: 'application' | 'job' | 'conversation' | 'verification' | 'none'; id: string | null };
};
```

| Method | Path | Body / Query | Response |
| --- | --- | --- | --- |
| GET | `/conversations` | `page, limit` | `Page<Conversation>` |
| GET | `/conversations/:id/messages` | `cursor?` (newest first) | `{ items: Message[], nextCursor }` — also marks the conversation read |
| POST | `/conversations/:id/messages` | `{ text }` (1–1000) | `201 Message` |
| POST | `/applications/:id/conversation` | – | `Conversation` (get-or-create between the seeker and the hirer) |
| GET | `/notifications` | `page, limit` | `Page<AppNotification> & { unread: number }` |
| POST | `/notifications/read` | `{ ids: string[] }` or `{ all: true }` | `204` |

Notification copy is rendered by the client from `type` + `params`, so it is always in the user's language.

---

## 10. Help & reports

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/help/faqs` | – | `{ id, question, answer }[]` (localised by `Accept-Language`) |
| POST | `/support/tickets` | `{ topic: 'account'\|'jobs'\|'payments'\|'safety'\|'other', message (20–1000) }` | `201 { id, createdAt }` |
| POST | `/reports` | `{ targetType: 'job'\|'user'\|'message', targetId, reason: 'fraud'\|'unsafe'\|'inappropriate'\|'misleading'\|'other', details (≤ 500) }` | `201 { id }` |

---

## 11. Superadmin (role `superadmin` only — everything else gets `403`)

```ts
type Overview = {
  kpis: { jobSeekers: number; hirers: number; activeJobs: number; applicationsToday: number;
          pendingVerifications: number; openReports: number; moderationQueue: number; hiresThisMonth: number };
  trends: { applications: { date: string; count: number }[]; signups: { date: string; count: number }[] }; // last 14 days
};

type AdminUserListItem = {
  id: string; role: 'user' | 'admin'; name: string | null; phone: string | null; city: string | null;
  status: AccountStatus; verificationStatus: VerificationStatus; createdAt: string;
};
type AdminUserDetail = AdminUserListItem & {
  email: string | null; statusReason: string | null;
  seeker: SeekerProfile | null; hirer: HirerProfile | null;
  documents: { id: string; kind: 'aadhaar_front' | 'aadhaar_back'; mimeType: string; uploadedAt: string }[];
  applications: Application[]; jobs: JobSummary[];
};

type ModerationItem = {
  id: string; kind: 'sector_suggestion' | 'workplace_photos'; status: 'open' | 'approved' | 'rejected';
  createdAt: string; job: { id: string; title: string; hirerName: string };
  sectorSuggestion: { proposedName: string; decision: 'new' | 'review'; confidence: number } | null;
  photos: { id: string; url: string }[]; analysis: JobAnalysis | null; note: string | null;
};

type Report = {
  id: string; targetType: 'job' | 'user' | 'message'; targetId: string; targetLabel: string;
  reason: string; details: string; status: 'open' | 'resolved' | 'dismissed';
  reporter: { id: string; name: string }; createdAt: string; resolutionNote: string | null;
};

type AuditLog = {
  id: string; actor: { id: string; name: string; role: Role }; action: AuditAction;
  target: { type: string; id: string; label: string }; reason: string | null; createdAt: string;
};
type AuditAction = 'auth.login'|'user.suspend'|'user.ban'|'user.reactivate'|'verification.approve'|'verification.reject'
  |'job.approve'|'job.reject'|'job.take_down'|'moderation.approve'|'moderation.reject'
  |'report.resolve'|'report.dismiss'|'settings.update';

type PlatformSettings = {
  ai: { sectorMatchThreshold: number; sectorReviewThreshold: number; photoSafetyThreshold: number; authenticityThreshold: number };
  otp: { maxRequestsPerHour: number; resendAfterSec: number; expirySec: number };
  enabledLanguages: LanguageCode[];
};
```

| Method | Path | Body / Query | Response |
| --- | --- | --- | --- |
| GET | `/superadmin/overview` | – | `Overview` |
| GET | `/superadmin/users` | `role, status?, q?, page, limit` | `Page<AdminUserListItem>` |
| GET | `/superadmin/users/:id` | – | `AdminUserDetail` |
| PATCH | `/superadmin/users/:id/status` | `{ status: AccountStatus, reason (5–300) }` | `AdminUserDetail` |
| PATCH | `/superadmin/users/:id/verification` | `{ decision: 'verified'\|'rejected', reason? }` (reason required for rejected) | `AdminUserDetail` |
| GET | `/superadmin/documents/:id/url` | – | `{ url, expiresAt }` — signed URL valid for 60 s |
| GET | `/superadmin/jobs` | `status?, q?, page, limit` | `Page<JobSummary>` |
| PATCH | `/superadmin/jobs/:id` | `{ action: 'approve'\|'reject'\|'take_down', reason? }` | `JobDetail` |
| GET | `/superadmin/moderation` | `status=open\|closed, page, limit` | `Page<ModerationItem>` |
| POST | `/superadmin/moderation/:id/decision` | `{ decision: 'approve'\|'reject', note (5–300), sectorId?, sectorName? }` | `ModerationItem` |
| GET | `/superadmin/reports` | `status?, page, limit` | `Page<Report>` |
| PATCH | `/superadmin/reports/:id` | `{ status: 'resolved'\|'dismissed', note (5–300) }` | `Report` |
| GET | `/superadmin/audit-logs` | `action?, q?, page, limit` | `Page<AuditLog>` |
| GET | `/superadmin/settings` | – | `PlatformSettings` |
| PATCH | `/superadmin/settings` | `Partial<PlatformSettings>` | `PlatformSettings` |

Approving a `sector_suggestion` creates (or links, via `sectorId`) the sector and activates the job.
Approving `workplace_photos` activates the job; rejecting either sets the job to `rejected`.
Every mutating superadmin call writes an `AuditLog` entry.
