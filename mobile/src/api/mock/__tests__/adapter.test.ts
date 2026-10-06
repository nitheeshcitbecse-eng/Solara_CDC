import { createApiClient, type TokenStore } from '../../client';
import { mockAdapter, setMockLatency } from '../adapter';
import { MOCK_OTP, MOCK_TOTP } from '../routes/auth';
import type { AppError } from '../../../utils/errors';

/**
 * Contract tests: drive the in-app mock through a real API client, exactly as the app
 * does, to check the flows documented in docs/API.md (and the demo data in the README).
 */

function makeClient() {
  let access: string | null = null;
  let refresh: string | null = null;
  const tokens: TokenStore = {
    getAccessToken: () => access,
    setAccessToken: (token) => {
      access = token;
    },
    getRefreshToken: async () => refresh,
    setRefreshToken: async (token) => {
      refresh = token;
    },
  };
  const client = createApiClient({
    baseURL: 'http://localhost:4000/api/v1',
    adapter: mockAdapter,
    tokens,
    getLanguage: () => 'en',
    isOnline: () => true,
    onSessionExpired: () => undefined,
    clientVersion: 'test',
  });
  return {
    http: client.http,
    signIn: (auth: { accessToken: string; refreshToken: string }) => {
      access = auth.accessToken;
      refresh = auth.refreshToken;
    },
    expireAccessToken: () => {
      access = 'expired-token';
    },
    currentRefresh: () => refresh,
  };
}

const AUTH = { skipAuthRefresh: true } as const;

async function otpSignIn(client: ReturnType<typeof makeClient>, phone: string, role: 'user' | 'admin') {
  const { data: request } = await client.http.post('/auth/otp/request', { phone, role }, AUTH);
  const { data: auth } = await client.http.post('/auth/otp/verify', { requestId: request.requestId, phone, code: MOCK_OTP }, AUTH);
  client.signIn(auth);
  return auth;
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    expect((error as AppError).code).toBe(code);
    return error as AppError;
  }
  throw new Error(`Expected ${code}`);
}

// One signed-in session per demo account, shared across tests. Signing in again in every
// test would (correctly) hit the mock's OTP rate limit of 5 requests per number per hour.
let sharedSeeker: ReturnType<typeof makeClient> | null = null;
let sharedHirer: ReturnType<typeof makeClient> | null = null;

async function seekerSession() {
  if (!sharedSeeker) {
    sharedSeeker = makeClient();
    await otpSignIn(sharedSeeker, '+919876543210', 'user');
  }
  return sharedSeeker;
}

async function hirerSession() {
  if (!sharedHirer) {
    sharedHirer = makeClient();
    await otpSignIn(sharedHirer, '+919876500001', 'admin');
  }
  return sharedHirer;
}

beforeAll(() => setMockLatency(0, 0));

describe('mock API — auth', () => {
  it('signs in the seeded job seeker with a complete profile', async () => {
    const client = makeClient();
    const auth = await otpSignIn(client, '+919876543210', 'user');
    expect(auth.user).toMatchObject({ role: 'user', firstName: 'Prasina', profileComplete: true });
    const { data: me } = await client.http.get('/me');
    expect(me.seeker.fullName).toBe('Prasina Selvam');
  });

  it('creates an incomplete account for an unknown number', async () => {
    const client = makeClient();
    const auth = await otpSignIn(client, '+919988776655', 'user');
    expect(auth.user.profileComplete).toBe(false);
  });

  it('rejects a wrong code and rate-limits the demo number', async () => {
    const client = makeClient();
    const { data: request } = await client.http.post('/auth/otp/request', { phone: '+919876543210', role: 'user' }, AUTH);
    await expectCode(client.http.post('/auth/otp/verify', { requestId: request.requestId, phone: '+919876543210', code: '000000' }, AUTH), 'OTP_INVALID');
    const limited = await expectCode(client.http.post('/auth/otp/request', { phone: '+919000000000', role: 'user' }, AUTH), 'RATE_LIMITED');
    expect(limited.retryAfter).toBe(60);
  });

  it('refuses a phone registered with the other role', async () => {
    const client = makeClient();
    const error = await expectCode(client.http.post('/auth/otp/request', { phone: '+919876543210', role: 'admin' }, AUTH), 'CONFLICT');
    expect(error.details?.reason).toBe('ROLE_MISMATCH');
  });

  it('signs the owner in with password + TOTP only', async () => {
    const client = makeClient();
    await expectCode(client.http.post('/superadmin/auth/login', { email: 'owner@solara.app', password: 'wrong-pass' }, AUTH), 'UNAUTHORIZED');
    const { data: login } = await client.http.post('/superadmin/auth/login', { email: 'owner@solara.app', password: 'Solara@123' }, AUTH);
    const { data: auth } = await client.http.post('/superadmin/auth/totp', { mfaToken: login.mfaToken, code: MOCK_TOTP }, AUTH);
    client.signIn(auth);
    expect(auth.user.role).toBe('superadmin');
    const { data: overview } = await client.http.get('/superadmin/overview');
    expect(overview.trends.applications).toHaveLength(14);
  });

  it('refreshes an expired access token transparently and detects refresh-token reuse', async () => {
    const client = makeClient();
    await otpSignIn(client, '+919876543210', 'user');
    const firstRefresh = client.currentRefresh();
    client.expireAccessToken();
    const { data: me } = await client.http.get('/me');
    expect(me.user.firstName).toBe('Prasina');
    expect(client.currentRefresh()).not.toBe(firstRefresh);
    // Re-using the rotated (old) token must be rejected.
    await expectCode(client.http.post('/auth/refresh', { refreshToken: firstRefresh }, AUTH), 'UNAUTHORIZED');
  });
});

describe('mock API — roles', () => {
  it('returns 403 for endpoints of another role', async () => {
    const seeker = await seekerSession();
    await expectCode(seeker.http.get('/superadmin/overview'), 'FORBIDDEN');
    await expectCode(seeker.http.get('/admin/dashboard'), 'FORBIDDEN');
  });
});

describe('mock API — hirer flows', () => {
  it('maps typed sector names with the deterministic AI', async () => {
    const hirer = await hirerSession();
    const check = async (name: string) => (await hirer.http.post('/sectors/check', { name })).data;
    expect(await check('sweeper')).toMatchObject({ decision: 'match', sector: { slug: 'cleaning' } });
    expect(await check('Chef')).toMatchObject({ decision: 'match', sector: { slug: 'cooking' } });
    expect((await check('Shop helper')).decision).toBe('review');
    expect((await check('Gardener')).decision).toBe('new');
  });

  it('serves the dashboard with stats and recent applicants', async () => {
    const hirer = await hirerSession();
    const { data } = await hirer.http.get('/admin/dashboard');
    expect(data.verificationStatus).toBe('verified');
    expect(data.stats.activeJobs).toBeGreaterThan(0);
    expect(data.recentApplicants.length).toBeGreaterThan(0);
  });
});

describe('mock API — job seeker flows', () => {
  it('lists active jobs with pagination and filters', async () => {
    const seeker = await seekerSession();
    const { data: page } = await seeker.http.get('/jobs', { params: { page: 1, limit: 5 } });
    expect(page.items).toHaveLength(5);
    expect(page.total).toBeGreaterThan(20);
    expect(page.items[0].location.city).toBe('Chennai'); // the seeker's own city comes first
    const { data: night } = await seeker.http.get('/jobs', { params: { shift: 'night' } });
    expect(night.items.every((job: { shift: string }) => job.shift === 'night')).toBe(true);
  });

  it('saves and unsaves a job', async () => {
    const seeker = await seekerSession();
    await seeker.http.post('/me/saved-jobs/job_02');
    let { data: saved } = await seeker.http.get('/me/saved-jobs');
    expect(saved.items.map((job: { id: string }) => job.id)).toContain('job_02');
    await seeker.http.delete('/me/saved-jobs/job_02');
    ({ data: saved } = await seeker.http.get('/me/saved-jobs'));
    expect(saved.items.map((job: { id: string }) => job.id)).not.toContain('job_02');
  });

  it('applies with a voice intro, then the hirer shortlists and hires', async () => {
    const seeker = await seekerSession();
    const form = new FormData();
    form.append('message', 'I have five years of experience in housekeeping for apartments.');
    form.append('voiceIntro', { uri: 'file:///cache/voice-intro.m4a', name: 'voice-intro.m4a', type: 'audio/m4a' });
    form.append('voiceDurationSec', '18');
    form.append('sharePhone', 'true');
    const { data: application } = await seeker.http.post('/jobs/job_02/applications', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data: unknown) => data,
    });
    expect(application).toMatchObject({ status: 'applied', sharePhone: true, voiceIntro: { durationSec: 18 } });
    await expectCode(
      seeker.http.post('/jobs/job_02/applications', form, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (data: unknown) => data }),
      'CONFLICT',
    );

    const hirer = await hirerSession();
    const { data: detail } = await hirer.http.get(`/admin/applications/${application.id}`);
    expect(detail.phone).toBe('+919876543210'); // shared with consent
    await hirer.http.patch(`/admin/applications/${application.id}`, { status: 'shortlisted' });
    const { data: hired } = await hirer.http.patch(`/admin/applications/${application.id}`, { status: 'hired' });
    expect(hired.timeline.map((event: { status: string }) => event.status)).toEqual(['applied', 'shortlisted', 'hired']);
    await expectCode(hirer.http.patch(`/admin/applications/${application.id}`, { status: 'rejected' }), 'CONFLICT');

    const { data: mine } = await seeker.http.get(`/me/applications/${application.id}`);
    expect(mine.status).toBe('hired');
  });

  it('keeps conversations and notifications per user', async () => {
    const seeker = await seekerSession();
    const { data: conversations } = await seeker.http.get('/conversations');
    expect(conversations.items.length).toBeGreaterThan(0);
    const first = conversations.items[0];
    const { data: sent } = await seeker.http.post(`/conversations/${first.id}/messages`, { text: 'Thank you, see you on Thursday.' });
    expect(sent.fromMe).toBe(true);
    const { data: notifications } = await seeker.http.get('/notifications');
    expect(notifications.unread).toBeGreaterThanOrEqual(0);
    await seeker.http.post('/notifications/read', { all: true });
    const { data: after } = await seeker.http.get('/notifications');
    expect(after.unread).toBe(0);
  });
});

describe('mock API — superadmin flows', () => {
  it('lists users, decides a report and records it in the audit log', async () => {
    const owner = makeClient();
    const { data: login } = await owner.http.post('/superadmin/auth/login', { email: 'owner@solara.app', password: 'Solara@123' }, AUTH);
    const { data: auth } = await owner.http.post('/superadmin/auth/totp', { mfaToken: login.mfaToken, code: MOCK_TOTP }, AUTH);
    owner.signIn(auth);

    const { data: hirers } = await owner.http.get('/superadmin/users', { params: { role: 'admin' } });
    expect(hirers.items.every((user: { role: string }) => user.role === 'admin')).toBe(true);

    const { data: reports } = await owner.http.get('/superadmin/reports', { params: { status: 'open' } });
    const report = reports.items[0];
    await expectCode(owner.http.patch(`/superadmin/reports/${report.id}`, { status: 'resolved', note: 'ok' }), 'VALIDATION');
    await owner.http.patch(`/superadmin/reports/${report.id}`, { status: 'resolved', note: 'Spoke to the hirer; salary corrected.' });
    const { data: logs } = await owner.http.get('/superadmin/audit-logs', { params: { action: 'report.resolve' } });
    expect(logs.items[0].target.id).toBe(report.id);
  });
});
