import type { SeekerProfile, SeekerProfilePatch } from '../lib/types/profile';
import { normalizeText } from './format';
import type { AboutForm, EducationForm, WorkForm } from './validation';

/**
 * Mapping between API profile models and form values. Forms keep numbers as text
 * and "no value" as '' (what TextInputs need); the API uses numbers and null.
 */

export const EMPTY_ABOUT: AboutForm = { fullName: '', gender: 'female', dateOfBirth: '', email: '', languagesKnown: [] };
export const EMPTY_EDUCATION: EducationForm = { qualification: 'secondary', state: '', district: '', city: '', pincode: '' };
export const EMPTY_WORK: WorkForm = {
  workHistory: [],
  currentWork: '',
  skills: [],
  preferredSectorIds: [],
  expectedSalary: '',
  availability: 'immediate',
};

export function aboutFormFrom(seeker: SeekerProfile, accountEmail: string | null): AboutForm {
  return {
    fullName: seeker.fullName ?? '',
    gender: seeker.gender ?? 'female',
    dateOfBirth: seeker.dateOfBirth ?? '',
    email: seeker.email ?? accountEmail ?? '',
    languagesKnown: seeker.languagesKnown,
  };
}

export function aboutPatch(values: AboutForm): SeekerProfilePatch {
  return {
    fullName: normalizeText(values.fullName),
    gender: values.gender,
    dateOfBirth: values.dateOfBirth,
    email: values.email.trim() || null,
    languagesKnown: values.languagesKnown,
  };
}

export function educationFormFrom(seeker: SeekerProfile): EducationForm {
  return {
    qualification: seeker.qualification ?? 'secondary',
    state: seeker.state ?? '',
    district: seeker.district ?? '',
    city: seeker.city ?? '',
    pincode: seeker.pincode ?? '',
  };
}

export function educationPatch(values: EducationForm): SeekerProfilePatch {
  return {
    qualification: values.qualification,
    state: values.state,
    district: normalizeText(values.district),
    city: normalizeText(values.city),
    pincode: values.pincode,
  };
}

export function workFormFrom(seeker: SeekerProfile): WorkForm {
  return {
    workHistory: seeker.workHistory.map((entry) => ({ ...entry, to: entry.to ?? '' })),
    currentWork: seeker.currentWork ?? '',
    skills: seeker.skills,
    preferredSectorIds: seeker.preferredSectorIds,
    expectedSalary: seeker.expectedSalary ? String(seeker.expectedSalary) : '',
    availability: seeker.availability ?? 'immediate',
  };
}

export function workPatch(values: WorkForm): SeekerProfilePatch {
  return {
    workHistory: values.workHistory.map((entry) => ({ ...entry, to: entry.to || null })),
    currentWork: normalizeText(values.currentWork) || null,
    skills: values.skills,
    preferredSectorIds: values.preferredSectorIds,
    expectedSalary: values.expectedSalary ? Number(values.expectedSalary) : null,
    availability: values.availability,
  };
}
