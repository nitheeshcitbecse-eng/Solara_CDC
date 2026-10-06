import { LANGUAGE_CODES, type LanguageCode } from '../../../lib/i18n/languages';
import {
  AVAILABILITIES,
  GENDERS,
  HIRER_TYPES,
  QUALIFICATIONS,
  type AadhaarInfo,
  type HirerProfile,
  type SeekerProfile,
  type Settings,
} from '../../../lib/types/profile';
import { ageFrom } from '../../../utils/format';
import { newId, nowIso, type DbUser, type MockDb } from '../db';
import { notify } from '../events';
import {
  accepted,
  caller,
  fail,
  isPlainObject,
  ok,
  readEnum,
  readNumber,
  readString,
  readStringArray,
  route,
  type Route,
} from '../http';
import { toMe } from '../serializers';
import { assertUploadAllowed, storeUpload } from '../uploads';

const PINCODE = /^[1-9]\d{5}$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Demo shortcut for Aadhaar review (documented in the README):
 *   last 4 digits "1111" → verified automatically after a few seconds
 *   last 4 digits "0000" → rejected automatically after a few seconds
 *   anything else        → stays pending until the superadmin decides
 */
const AUTO_DECISION_DELAY_MS = 6_000;
const AUTO_REJECT_REASON = 'The photo is blurred and the details cannot be read. Please upload a clear photo.';

export function applyAutoVerification(db: MockDb, user: DbUser): void {
  const profile = user.seeker ?? user.hirer;
  const aadhaar = profile?.aadhaar;
  if (!aadhaar || aadhaar.status !== 'pending' || !aadhaar.uploadedAt) return;
  if (Date.now() - new Date(aadhaar.uploadedAt).getTime() < AUTO_DECISION_DELAY_MS) return;
  if (aadhaar.last4 === '1111') setVerification(db, user, 'verified', null);
  if (aadhaar.last4 === '0000') setVerification(db, user, 'rejected', AUTO_REJECT_REASON);
}

export function setVerification(db: MockDb, user: DbUser, status: 'verified' | 'rejected', reason: string | null): void {
  const profile = user.seeker ?? user.hirer;
  if (!profile) return;
  profile.aadhaar = { ...profile.aadhaar, status, rejectionReason: status === 'rejected' ? reason : null };
  notify(db, user.id, 'verification', { status }, { kind: 'verification', id: null });
}

/** Deep copy of plain JSON data (profiles contain no dates, functions or classes). */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readLanguages(body: Record<string, unknown>, key: string): LanguageCode[] {
  const values = readStringArray(body, key, LANGUAGE_CODES.length, 2);
  if (!values.every((value) => (LANGUAGE_CODES as readonly string[]).includes(value))) throw fail.validation({ [key]: 'invalid' });
  return values as LanguageCode[];
}

function nullableString(body: Record<string, unknown>, key: string, max: number): string | null {
  const value = readString(body, key, { optional: true, max });
  return value === '' ? null : value;
}

function applySeekerPatch(profile: SeekerProfile, body: Record<string, unknown>, sectorIds: readonly string[]): void {
  if ('fullName' in body) profile.fullName = readString(body, 'fullName', { min: 2, max: 60 });
  if ('gender' in body) profile.gender = readEnum(body, 'gender', GENDERS);
  if ('dateOfBirth' in body) {
    const dob = readString(body, 'dateOfBirth', { pattern: ISO_DATE });
    if (ageFrom(dob) < 18) throw fail.validation({ dateOfBirth: 'min_age' });
    profile.dateOfBirth = dob;
  }
  if ('email' in body) profile.email = nullableString(body, 'email', 120);
  if ('languagesKnown' in body) profile.languagesKnown = readLanguages(body, 'languagesKnown');
  if ('qualification' in body) profile.qualification = readEnum(body, 'qualification', QUALIFICATIONS);
  if ('state' in body) profile.state = readString(body, 'state', { min: 2, max: 40 });
  if ('district' in body) profile.district = readString(body, 'district', { min: 2, max: 40 });
  if ('city' in body) profile.city = readString(body, 'city', { min: 2, max: 40 });
  if ('pincode' in body) profile.pincode = readString(body, 'pincode', { pattern: PINCODE });
  if ('workHistory' in body) {
    const raw = body.workHistory;
    if (!Array.isArray(raw) || raw.length > 10) throw fail.validation({ workHistory: 'invalid' });
    profile.workHistory = raw.map((entry: unknown) => {
      if (!isPlainObject(entry)) throw fail.validation({ workHistory: 'invalid' });
      const to = readString(entry, 'to', { optional: true, pattern: YEAR_MONTH });
      return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : newId('wx'),
        title: readString(entry, 'title', { min: 2, max: 80 }),
        employer: readString(entry, 'employer', { min: 2, max: 80 }),
        from: readString(entry, 'from', { pattern: YEAR_MONTH }),
        to: to === '' ? null : to,
      };
    });
  }
  if ('currentWork' in body) profile.currentWork = nullableString(body, 'currentWork', 80);
  if ('skills' in body) profile.skills = readStringArray(body, 'skills', 15, 30);
  if ('preferredSectorIds' in body) {
    const ids = readStringArray(body, 'preferredSectorIds', 5, 40);
    if (!ids.every((id) => sectorIds.includes(id))) throw fail.validation({ preferredSectorIds: 'unknown_sector' });
    profile.preferredSectorIds = ids;
  }
  if ('expectedSalary' in body) {
    profile.expectedSalary = body.expectedSalary === null ? null : readNumber(body, 'expectedSalary', 1000, 500000);
  }
  if ('availability' in body) profile.availability = readEnum(body, 'availability', AVAILABILITIES);
  if ('onboardingStep' in body) profile.onboardingStep = readNumber(body, 'onboardingStep', 1, 3) as SeekerProfile['onboardingStep'];
}

function assertSeekerComplete(profile: SeekerProfile): void {
  const missing: Record<string, string> = {};
  if (!profile.fullName) missing.fullName = 'required';
  if (!profile.gender) missing.gender = 'required';
  if (!profile.dateOfBirth) missing.dateOfBirth = 'required';
  if (profile.languagesKnown.length === 0) missing.languagesKnown = 'required';
  if (!profile.qualification) missing.qualification = 'required';
  if (!profile.state || !profile.district || !profile.city) missing.location = 'required';
  if (!profile.pincode) missing.pincode = 'required';
  if (profile.skills.length === 0) missing.skills = 'required';
  if (profile.preferredSectorIds.length === 0) missing.preferredSectorIds = 'required';
  if (!profile.availability) missing.availability = 'required';
  if (Object.keys(missing).length > 0) throw fail.validation(missing);
}

function applyHirerPatch(profile: HirerProfile, body: Record<string, unknown>): void {
  if ('hirerType' in body) profile.hirerType = readEnum(body, 'hirerType', HIRER_TYPES);
  if ('name' in body) profile.name = readString(body, 'name', { min: 2, max: 60 });
  if ('businessName' in body) profile.businessName = nullableString(body, 'businessName', 80);
  if ('address' in body) {
    const address = body.address;
    if (!isPlainObject(address)) throw fail.validation({ address: 'invalid' });
    profile.address = {
      line1: readString(address, 'line1', { min: 5, max: 120 }),
      city: readString(address, 'city', { min: 2, max: 40 }),
      state: readString(address, 'state', { min: 2, max: 40 }),
      pincode: readString(address, 'pincode', { pattern: PINCODE }),
    };
  }
  if ('gstin' in body) profile.gstin = nullableString(body, 'gstin', 15);
  if ('onboardingStep' in body) profile.onboardingStep = readNumber(body, 'onboardingStep', 1, 4) as HirerProfile['onboardingStep'];
}

function assertHirerComplete(profile: HirerProfile): void {
  const missing: Record<string, string> = {};
  if (!profile.hirerType) missing.hirerType = 'required';
  if (!profile.name) missing.name = 'required';
  if (!profile.address) missing.address = 'required';
  if (profile.hirerType !== 'individual' && !profile.businessName) missing.businessName = 'required';
  if (profile.aadhaar.status === 'none') missing.aadhaar = 'required';
  if (Object.keys(missing).length > 0) throw fail.validation(missing);
}

function mergeSettings(current: Settings, body: Record<string, unknown>): Settings {
  const next: Settings = {
    language: current.language,
    notifications: { ...current.notifications },
    privacy: { ...current.privacy },
  };
  if ('language' in body) next.language = readEnum(body, 'language', LANGUAGE_CODES);
  if (isPlainObject(body.notifications)) {
    for (const key of ['applications', 'messages', 'jobAlerts'] as const) {
      const value = body.notifications[key];
      if (typeof value === 'boolean') next.notifications[key] = value;
    }
  }
  if (isPlainObject(body.privacy)) {
    for (const key of ['profileVisibleToVerifiedHirers', 'sharePhoneByDefault'] as const) {
      const value = body.privacy[key];
      if (typeof value === 'boolean') next.privacy[key] = value;
    }
  }
  return next;
}

export const profileRoutes: Route[] = [
  route('GET', '/me', 'any', (request) => {
    const user = caller(request);
    applyAutoVerification(request.db, user);
    return ok(toMe(user));
  }),

  route('PATCH', '/me/profile', ['user'], (request) => {
    const user = caller(request);
    if (!user.seeker) throw fail.notFound();
    // Apply to a copy and commit only when every field (and completeness) validated.
    const profile = clone(user.seeker);
    applySeekerPatch(profile, request.body, request.db.sectors.map((sector) => sector.id));
    if (request.body.complete === true) assertSeekerComplete(profile);
    user.seeker = profile;
    if (profile.fullName) user.name = profile.fullName;
    if (request.body.complete === true) user.profileComplete = true;
    return ok(toMe(user));
  }),

  route('PATCH', '/admin/profile', ['admin'], (request) => {
    const user = caller(request);
    if (!user.hirer) throw fail.notFound();
    const profile = clone(user.hirer);
    applyHirerPatch(profile, request.body);
    if (request.body.complete === true) assertHirerComplete(profile);
    user.hirer = profile;
    if (profile.name) user.name = profile.name;
    if (request.body.complete === true) user.profileComplete = true;
    return ok(toMe(user));
  }),

  route('POST', '/me/aadhaar', ['user', 'admin'], async (request) => {
    const user = caller(request);
    const profile = user.seeker ?? user.hirer;
    const form = request.form;
    if (!profile || !form) throw fail.validation({ front: 'required' });
    const front = form.files.front?.[0];
    const back = form.files.back?.[0];
    const last4 = form.fields.last4?.[0] ?? '';
    if (!front) throw fail.validation({ front: 'required' });
    if (!/^\d{4}$/.test(last4)) throw fail.validation({ last4: 'format' });
    assertUploadAllowed(front, 'document');
    if (back) assertUploadAllowed(back, 'document');

    const uploadedAt = nowIso();
    const db = request.db;
    db.documents = db.documents.filter((document) => document.ownerId !== user.id);
    const parts = back ? ([['aadhaar_front', front], ['aadhaar_back', back]] as const) : ([['aadhaar_front', front]] as const);
    for (const [kind, file] of parts) {
      db.documents.push({ id: newId('doc'), ownerId: user.id, kind, mimeType: file.type, uri: await storeUpload(file), uploadedAt });
    }
    const aadhaar: AadhaarInfo = { status: 'pending', last4, rejectionReason: null, uploadedAt };
    profile.aadhaar = aadhaar;
    return ok(aadhaar);
  }),

  route('PATCH', '/me/settings', 'any', (request) => {
    const user = caller(request);
    user.settings = mergeSettings(user.settings, request.body);
    return ok(user.settings);
  }),

  route('DELETE', '/me', ['user', 'admin'], (request) => {
    const user = caller(request);
    user.deletionRequestedAt = nowIso();
    const scheduledFor = new Date(Date.now() + 30 * 86_400_000).toISOString();
    return accepted({ scheduledFor });
  }),
];
