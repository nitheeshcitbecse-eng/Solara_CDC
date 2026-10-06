import type { LanguageCode } from '../i18n/languages';
import type { PageParams } from './common';
import type { ApplicantSummary } from './applications';
import type { VerificationStatus } from './auth';

export type Sector = { id: string; slug: string; name: string; jobCount: number };
export type SectorRef = Pick<Sector, 'id' | 'slug' | 'name'>;

export type SectorCheckDecision = 'match' | 'new' | 'review';
export type SectorCheckResponse = { decision: SectorCheckDecision; sector: Sector | null; confidence: number };

type SalaryType = 'monthly' | 'daily' | 'hourly';
export const SALARY_TYPES: readonly SalaryType[] = ['monthly', 'daily', 'hourly'];
export type Salary = { type: SalaryType; amount: number };

export type Shift = 'morning' | 'day' | 'evening' | 'night' | 'flexible';
export const SHIFTS: readonly Shift[] = ['morning', 'day', 'evening', 'night', 'flexible'];

export type JobLocation = { area: string | null; city: string; district: string; state: string; pincode: string };
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Safety = 'safe' | 'caution' | 'unsafe';
export type JobStatus = 'draft' | 'analysing' | 'pending_review' | 'active' | 'closed' | 'rejected' | 'taken_down';

export type JobSummary = {
  id: string;
  title: string;
  sector: SectorRef | null;
  proposedSectorName: string | null;
  hirer: { id: string; displayName: string; verified: boolean };
  salary: Salary;
  shift: Shift;
  location: JobLocation;
  openings: number;
  difficulty: Difficulty | null;
  status: JobStatus;
  createdAt: string;
  saved: boolean;
  applied: boolean;
  applicantCount: number;
};

export type JobPhoto = { id: string; url: string };

export type JobDetail = JobSummary & {
  description: string;
  timings: { start: string; end: string } | null;
  requirements: string[];
  languages: LanguageCode[];
  benefits: string[];
  photos: JobPhoto[];
  safety: Safety | null;
  myApplicationId: string | null;
};

export type JobSearchParams = PageParams & {
  sectorId?: string;
  q?: string;
  city?: string;
  minSalary?: number;
  shift?: Shift;
};

export type Engagement = {
  id: string;
  job: JobSummary;
  startedOn: string;
  endedOn: string | null;
  applicationId: string;
};

export type EngagementState = 'current' | 'past';

// ── Admin ────────────────────────────────────────────────────────────────────

export type JobInput = {
  sectorId: string | null;
  proposedSectorName: string | null;
  title: string;
  description: string;
  salary: Salary;
  shift: Shift;
  timings: { start: string; end: string } | null;
  openings: number;
  location: JobLocation;
  requirements: string[];
  languages: LanguageCode[];
  benefits: string[];
};

export type Hazard =
  | 'wet_floor'
  | 'sharp_tools'
  | 'heat'
  | 'heavy_lifting'
  | 'chemicals'
  | 'traffic'
  | 'heights'
  | 'electrical'
  | 'poor_ventilation';

type Authenticity = 'authentic' | 'ai_generated' | 'unrelated';

export type JobAnalysisComplete = {
  status: 'complete';
  verdict: 'pass' | 'unsafe' | 'rejected';
  rejectionReason: 'ai_generated' | 'unrelated' | null;
  difficulty: Difficulty;
  safety: Safety;
  authenticity: Authenticity;
  hazards: Hazard[];
  confidence: number;
  summary: string;
};

export type JobAnalysis = { status: 'analysing'; startedAt: string } | JobAnalysisComplete;

export type AdminJobState = 'active' | 'pending' | 'closed';

export type AdminDashboard = {
  stats: { activeJobs: number; newApplicants: number; hires: number; pendingReview: number };
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  recentApplicants: ApplicantSummary[];
};
