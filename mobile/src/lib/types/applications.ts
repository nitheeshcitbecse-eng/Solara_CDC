import type { LanguageCode } from '../i18n/languages';
import type { PageParams } from './common';
import type { JobSummary } from './jobs';
import type { Qualification, WorkExperience } from './profile';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'hired' | 'rejected';
export const APPLICATION_STATUSES: readonly ApplicationStatus[] = ['applied', 'shortlisted', 'hired', 'rejected'];

export type StatusEvent = { status: ApplicationStatus; at: string };
export type VoiceIntro = { url: string; durationSec: number };

export type Application = {
  id: string;
  job: JobSummary;
  status: ApplicationStatus;
  createdAt: string;
  message: string;
  voiceIntro: VoiceIntro;
  expectedSalary: number | null;
  availableFrom: string | null;
  sharePhone: boolean;
  timeline: StatusEvent[];
  conversationId: string | null;
};

export type ApplicantSummary = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  createdAt: string;
  applicant: { id: string; name: string; city: string | null; verified: boolean; skills: string[] };
};

export type ApplicantDetail = ApplicantSummary & {
  message: string;
  voiceIntro: VoiceIntro;
  expectedSalary: number | null;
  availableFrom: string | null;
  phone: string | null;
  profile: {
    qualification: Qualification | null;
    languagesKnown: LanguageCode[];
    workHistory: WorkExperience[];
    currentWork: string | null;
    age: number | null;
  };
  timeline: StatusEvent[];
  conversationId: string | null;
};

/** Values the job seeker fills in on the Apply screen. */
export type ApplyInput = {
  message: string;
  voiceIntro: { uri: string; durationSec: number; mimeType: string; name: string; size: number };
  expectedSalary: number | null;
  availableFrom: string | null;
  sharePhone: boolean;
};

export type ApplicationListParams = PageParams & { status?: ApplicationStatus };

export type HirerDecision = Exclude<ApplicationStatus, 'applied'>;
