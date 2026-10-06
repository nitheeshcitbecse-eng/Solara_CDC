import type { LanguageCode } from '../i18n/languages';
import type { SessionUser, VerificationStatus } from './auth';

export type Gender = 'female' | 'male' | 'other' | 'prefer_not';
export const GENDERS: readonly Gender[] = ['female', 'male', 'other', 'prefer_not'];

export type Qualification =
  | 'none'
  | 'primary'
  | 'secondary'
  | 'higher_secondary'
  | 'diploma'
  | 'graduate'
  | 'postgraduate';
export const QUALIFICATIONS: readonly Qualification[] = [
  'none',
  'primary',
  'secondary',
  'higher_secondary',
  'diploma',
  'graduate',
  'postgraduate',
];

type Availability = 'immediate' | 'within_week' | 'within_month' | 'part_time';
export const AVAILABILITIES: readonly Availability[] = ['immediate', 'within_week', 'within_month', 'part_time'];

export type WorkExperience = {
  id: string;
  title: string;
  employer: string;
  /** YYYY-MM */
  from: string;
  /** YYYY-MM, or null while ongoing */
  to: string | null;
};

export type AadhaarInfo = {
  status: VerificationStatus;
  last4: string | null;
  rejectionReason: string | null;
  uploadedAt: string | null;
};

export type SeekerProfile = {
  fullName: string | null;
  gender: Gender | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  email: string | null;
  languagesKnown: LanguageCode[];
  qualification: Qualification | null;
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
  workHistory: WorkExperience[];
  currentWork: string | null;
  skills: string[];
  preferredSectorIds: string[];
  expectedSalary: number | null;
  availability: Availability | null;
  onboardingStep: 1 | 2 | 3;
  aadhaar: AadhaarInfo;
};

export type HirerType = 'individual' | 'business' | 'agency';
export const HIRER_TYPES: readonly HirerType[] = ['individual', 'business', 'agency'];

type HirerAddress = { line1: string; city: string; state: string; pincode: string };

export type HirerProfile = {
  hirerType: HirerType | null;
  name: string | null;
  businessName: string | null;
  address: HirerAddress | null;
  gstin: string | null;
  onboardingStep: 1 | 2 | 3 | 4;
  aadhaar: AadhaarInfo;
};

export type Settings = {
  language: LanguageCode;
  notifications: { applications: boolean; messages: boolean; jobAlerts: boolean };
  privacy: { profileVisibleToVerifiedHirers: boolean; sharePhoneByDefault: boolean };
};

export type Me = {
  user: SessionUser;
  seeker: SeekerProfile | null;
  hirer: HirerProfile | null;
  settings: Settings;
  deletionRequestedAt: string | null;
};

export type SeekerProfilePatch = Partial<Omit<SeekerProfile, 'aadhaar'>> & { complete?: boolean };
export type HirerProfilePatch = Partial<Omit<HirerProfile, 'aadhaar'>> & { complete?: boolean };

export type SettingsPatch = {
  language?: LanguageCode;
  notifications?: Partial<Settings['notifications']>;
  privacy?: Partial<Settings['privacy']>;
};

export type DeleteAccountResponse = { scheduledFor: string };
