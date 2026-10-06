import { z } from 'zod';

import { LANGUAGE_CODES } from '../lib/i18n/languages';
import { SALARY_TYPES, SHIFTS } from '../lib/types/jobs';
import { AVAILABILITIES, GENDERS, HIRER_TYPES, QUALIFICATIONS } from '../lib/types/profile';
import { REPORT_REASONS, SUPPORT_TOPICS } from '../lib/types/support';
import { ageFrom, toIsoDate } from './format';

/**
 * Form schemas. Every `message` is an i18n key (see locales/en.ts → validation.*),
 * translated by the form field components. Schemas keep input and output types
 * identical (numbers stay strings while typing); screens convert on submit.
 */

export const PATTERNS = {
  indianMobile: /^[6-9]\d{9}$/,
  pincode: /^[1-9]\d{5}$/,
  otp: /^\d{6}$/,
  last4: /^\d{4}$/,
  yearMonth: /^\d{4}-(0[1-9]|1[0-2])$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]\d|2[0-3]):[0-5]\d$/,
  digits: /^\d+$/,
  // A person's name in any script: letters, combining marks, spaces, dots, apostrophes, hyphens.
  personName: /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
} as const;

export const LIMITS = {
  name: 60,
  businessName: 80,
  email: 120,
  place: 40,
  address: 120,
  jobTitle: 60,
  jobDescription: 1000,
  listItem: 80,
  listCount: 10,
  skill: 30,
  skillCount: 15,
  sectorName: 40,
  applyMessageMin: 20,
  applyMessageMax: 500,
  chatMessage: 1000,
  supportMessageMin: 20,
  supportMessageMax: 1000,
  reportDetails: 500,
  reasonMin: 5,
  reasonMax: 300,
  search: 80,
  password: 128,
  preferredSectors: 5,
  workHistory: 10,
} as const;

const required = (max: number) =>
  z.string().trim().min(1, 'validation.required').max(max, 'validation.tooLong');

const boundedText = (min: number, max: number) =>
  z.string().trim().min(min, 'validation.tooShort').max(max, 'validation.tooLong');

const optionalText = (max: number) => z.string().trim().max(max, 'validation.tooLong');

const personName = required(LIMITS.name)
  .min(2, 'validation.tooShort')
  .regex(PATTERNS.personName, 'validation.name');

const pincode = z.string().trim().regex(PATTERNS.pincode, 'validation.pincode');
const languageCode = z.enum(LANGUAGE_CODES);

/** Optional numeric text field, validated as a whole number within a range. */
const optionalAmount = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || PATTERNS.digits.test(value), 'validation.number')
    .refine((value) => value === '' || (Number(value) >= min && Number(value) <= max), 'validation.amountRange');

// ── Auth ─────────────────────────────────────────────────────────────────────

export const phoneSchema = z.object({
  phone: z.string().trim().regex(PATTERNS.indianMobile, 'validation.phone'),
});
export type PhoneForm = z.infer<typeof phoneSchema>;

export const otpCodeSchema = z.string().regex(PATTERNS.otp, 'validation.otp');

export const superAdminLoginSchema = z.object({
  email: z.email('validation.email').trim().max(LIMITS.email, 'validation.tooLong'),
  password: z.string().min(8, 'validation.password').max(LIMITS.password, 'validation.tooLong'),
});
export type SuperAdminLoginForm = z.infer<typeof superAdminLoginSchema>;

// ── Job seeker onboarding / profile ──────────────────────────────────────────

export const MIN_AGE = 18;
export const MAX_AGE = 80;

export const aboutSchema = z.object({
  fullName: personName,
  gender: z.enum(GENDERS, 'validation.required'),
  dateOfBirth: z
    .string()
    .regex(PATTERNS.isoDate, 'validation.required')
    .refine((value) => ageFrom(value) >= MIN_AGE, 'validation.minAge')
    .refine((value) => ageFrom(value) <= MAX_AGE, 'validation.maxAge'),
  email: z
    .string()
    .trim()
    .max(LIMITS.email, 'validation.tooLong')
    .refine((value) => value === '' || z.email().safeParse(value).success, 'validation.email'),
  languagesKnown: z.array(languageCode).min(1, 'validation.pickOne'),
});
export type AboutForm = z.infer<typeof aboutSchema>;

export const educationSchema = z.object({
  qualification: z.enum(QUALIFICATIONS, 'validation.required'),
  state: required(LIMITS.place).min(2, 'validation.tooShort'),
  district: required(LIMITS.place).min(2, 'validation.tooShort'),
  city: required(LIMITS.place).min(2, 'validation.tooShort'),
  pincode,
});
export type EducationForm = z.infer<typeof educationSchema>;

export const workExperienceSchema = z
  .object({
    id: z.string(),
    title: boundedText(2, LIMITS.listItem),
    employer: boundedText(2, LIMITS.listItem),
    from: z.string().regex(PATTERNS.yearMonth, 'validation.month'),
    to: z.string().regex(PATTERNS.yearMonth, 'validation.month').or(z.literal('')),
  })
  .refine((entry) => entry.to === '' || entry.to >= entry.from, { message: 'validation.monthOrder', path: ['to'] })
  .refine((entry) => entry.from <= toIsoDate(new Date()).slice(0, 7), { message: 'validation.futureMonth', path: ['from'] });
export type WorkExperienceForm = z.infer<typeof workExperienceSchema>;

export const workSchema = z.object({
  workHistory: z.array(workExperienceSchema).max(LIMITS.workHistory, 'validation.tooMany'),
  currentWork: optionalText(LIMITS.listItem),
  skills: z
    .array(boundedText(2, LIMITS.skill))
    .min(1, 'validation.pickOne')
    .max(LIMITS.skillCount, 'validation.tooMany'),
  preferredSectorIds: z.array(z.string()).min(1, 'validation.pickOne').max(LIMITS.preferredSectors, 'validation.tooMany'),
  expectedSalary: optionalAmount(1000, 500000),
  availability: z.enum(AVAILABILITIES, 'validation.required'),
});
export type WorkForm = z.infer<typeof workSchema>;

export const aadhaarSchema = z.object({
  last4: z.string().regex(PATTERNS.last4, 'validation.last4'),
});

// ── Hirer onboarding ─────────────────────────────────────────────────────────

export const hirerDetailsSchema = z
  .object({
    hirerType: z.enum(HIRER_TYPES),
    name: personName,
    businessName: optionalText(LIMITS.businessName),
    line1: boundedText(5, LIMITS.address),
    city: required(LIMITS.place).min(2, 'validation.tooShort'),
    state: required(LIMITS.place).min(2, 'validation.tooShort'),
    pincode,
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value === '' || PATTERNS.gstin.test(value), 'validation.gstin'),
  })
  .refine((form) => form.hirerType === 'individual' || form.businessName.trim().length >= 2, {
    message: 'validation.required',
    path: ['businessName'],
  });
export type HirerDetailsForm = z.infer<typeof hirerDetailsSchema>;

// ── Hirer: add work ──────────────────────────────────────────────────────────

export const sectorNameSchema = z.object({
  name: boundedText(2, LIMITS.sectorName).regex(PATTERNS.personName, 'validation.sectorName'),
});

/** Sensible pay ranges per salary type, in rupees. */
export const SALARY_RANGES = {
  monthly: { min: 3000, max: 200000 },
  daily: { min: 200, max: 5000 },
  hourly: { min: 50, max: 1000 },
} as const;

export const jobDetailsSchema = z
  .object({
    title: boundedText(4, LIMITS.jobTitle),
    description: boundedText(30, LIMITS.jobDescription),
    salaryType: z.enum(SALARY_TYPES),
    salaryAmount: z.string().trim().regex(PATTERNS.digits, 'validation.number'),
    shift: z.enum(SHIFTS, 'validation.required'),
    timingStart: z.string().regex(PATTERNS.time, 'validation.time').or(z.literal('')),
    timingEnd: z.string().regex(PATTERNS.time, 'validation.time').or(z.literal('')),
    openings: z
      .string()
      .trim()
      .regex(PATTERNS.digits, 'validation.number')
      .refine((value) => Number(value) >= 1 && Number(value) <= 50, 'validation.openings'),
    area: optionalText(LIMITS.place),
    city: required(LIMITS.place).min(2, 'validation.tooShort'),
    district: required(LIMITS.place).min(2, 'validation.tooShort'),
    state: required(LIMITS.place).min(2, 'validation.tooShort'),
    pincode,
    requirements: z.array(boundedText(2, LIMITS.listItem)).max(LIMITS.listCount, 'validation.tooMany'),
    languages: z.array(languageCode).min(1, 'validation.pickOne'),
    benefits: z.array(boundedText(2, LIMITS.listItem)).max(LIMITS.listCount, 'validation.tooMany'),
  })
  .refine(
    (form) => {
      const range = SALARY_RANGES[form.salaryType];
      const amount = Number(form.salaryAmount);
      return amount >= range.min && amount <= range.max;
    },
    { message: 'validation.salaryRange', path: ['salaryAmount'] },
  )
  .refine((form) => (form.timingStart === '') === (form.timingEnd === ''), {
    message: 'validation.timingPair',
    path: ['timingEnd'],
  });
export type JobDetailsForm = z.infer<typeof jobDetailsSchema>;

// ── Apply ────────────────────────────────────────────────────────────────────

export const applySchema = z.object({
  message: boundedText(LIMITS.applyMessageMin, LIMITS.applyMessageMax),
  expectedSalary: optionalAmount(1000, 500000),
  availableFrom: z
    .string()
    .refine((value) => value === '' || PATTERNS.isoDate.test(value), 'validation.date')
    .refine((value) => value === '' || value >= toIsoDate(new Date()), 'validation.pastDate'),
  sharePhone: z.boolean(),
});
export type ApplyForm = z.infer<typeof applySchema>;

// ── Messaging, help, reports, moderation ─────────────────────────────────────

export const chatMessageSchema = boundedText(1, LIMITS.chatMessage);

export const supportSchema = z.object({
  topic: z.enum(SUPPORT_TOPICS, 'validation.required'),
  message: boundedText(LIMITS.supportMessageMin, LIMITS.supportMessageMax),
});
export type SupportForm = z.infer<typeof supportSchema>;

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, 'validation.required'),
  details: optionalText(LIMITS.reportDetails),
});
export type ReportForm = z.infer<typeof reportSchema>;

/** Destructive superadmin actions always carry a reason for the audit log. */
export const reasonSchema = z.object({ reason: boundedText(LIMITS.reasonMin, LIMITS.reasonMax) });
export type ReasonForm = z.infer<typeof reasonSchema>;

const threshold = z
  .string()
  .trim()
  .refine((value) => /^(0(\.\d{1,2})?|1(\.0{1,2})?)$/.test(value), 'validation.threshold');
const boundedInteger = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(PATTERNS.digits, 'validation.number')
    .refine((value) => Number(value) >= min && Number(value) <= max, 'validation.amountRange');

export const platformSettingsSchema = z.object({
  sectorMatchThreshold: threshold,
  sectorReviewThreshold: threshold,
  photoSafetyThreshold: threshold,
  authenticityThreshold: threshold,
  maxRequestsPerHour: boundedInteger(1, 20),
  resendAfterSec: boundedInteger(15, 300),
  expirySec: boundedInteger(60, 900),
  enabledLanguages: z.array(languageCode).min(1, 'validation.pickOne'),
});
export type PlatformSettingsForm = z.infer<typeof platformSettingsSchema>;
