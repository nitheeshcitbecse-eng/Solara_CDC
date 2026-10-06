import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LanguageCode } from '../../lib/i18n/languages';
import type { ApplicationStatus, StatusEvent, VoiceIntro } from '../../lib/types/applications';
import type { AccountStatus, Role, SignUpRole } from '../../lib/types/auth';
import type { AppNotification } from '../../lib/types/messages';
import type {
  Difficulty,
  JobAnalysisComplete,
  JobLocation,
  JobPhoto,
  JobStatus,
  Safety,
  Salary,
  SectorCheckDecision,
  Shift,
} from '../../lib/types/jobs';
import type { HirerProfile, SeekerProfile, Settings } from '../../lib/types/profile';
import type { AuditAction, PlatformSettings, ReportStatus } from '../../lib/types/superadmin';
import type { ReportReason, ReportTargetType, SupportTopic } from '../../lib/types/support';
import { createSeed } from './fixtures/seed';

/**
 * In-memory database behind the mock API. Records are richer than API responses
 * (they hold foreign keys); `serializers.ts` turns them into contract shapes.
 *
 * Mock mode only: the DB is persisted to AsyncStorage under "solara.mock.*" so demo
 * data survives restarts. Everything here is fictional seed data — the real app never
 * writes personal data to AsyncStorage.
 */

export type DbUser = {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  /** Superadmin only. A real server stores a salted hash, never the password. */
  password: string | null;
  name: string | null;
  status: AccountStatus;
  statusReason: string | null;
  createdAt: string;
  profileComplete: boolean;
  seeker: SeekerProfile | null;
  hirer: HirerProfile | null;
  settings: Settings;
  deletionRequestedAt: string | null;
  savedJobIds: string[];
};

export type DbDocument = {
  id: string;
  ownerId: string;
  kind: 'aadhaar_front' | 'aadhaar_back';
  mimeType: string;
  uri: string;
  uploadedAt: string;
};

export type DbSector = { id: string; slug: string; name: string; createdAt: string };

type DbAnalysis = {
  startedAt: string;
  photoNames: string[];
  note: string;
  /** Computed at upload time but only revealed once the simulated analysis delay has passed. */
  result: JobAnalysisComplete;
};

export type DbJob = {
  id: string;
  hirerId: string;
  sectorId: string | null;
  proposedSectorName: string | null;
  sectorDecision: SectorCheckDecision | null;
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
  photos: JobPhoto[];
  difficulty: Difficulty | null;
  safety: Safety | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  analysis: DbAnalysis | null;
};

export type DbApplication = {
  id: string;
  jobId: string;
  seekerId: string;
  status: ApplicationStatus;
  createdAt: string;
  message: string;
  voiceIntro: VoiceIntro;
  expectedSalary: number | null;
  availableFrom: string | null;
  sharePhone: boolean;
  timeline: StatusEvent[];
  conversationId: string | null;
  seenByHirer: boolean;
};

export type DbEngagement = {
  id: string;
  applicationId: string;
  jobId: string;
  seekerId: string;
  startedOn: string;
  endedOn: string | null;
};

export type DbConversation = {
  id: string;
  seekerId: string;
  hirerId: string;
  jobId: string | null;
  applicationId: string | null;
  createdAt: string;
  lastReadAt: Record<string, string>;
};

export type DbMessage = { id: string; conversationId: string; senderId: string; text: string; createdAt: string };

export type DbNotification = Omit<AppNotification, 'read'> & { userId: string; read: boolean };

export type DbReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reporterId: string;
  createdAt: string;
  resolutionNote: string | null;
};

export type DbModeration = {
  id: string;
  kind: 'sector_suggestion' | 'workplace_photos';
  status: 'open' | 'approved' | 'rejected';
  createdAt: string;
  jobId: string;
  sectorSuggestion: { proposedName: string; decision: 'new' | 'review'; confidence: number } | null;
  note: string | null;
};

export type DbAuditLog = {
  id: string;
  actorId: string;
  action: AuditAction;
  target: { type: string; id: string; label: string };
  reason: string | null;
  createdAt: string;
};

type DbTicket = { id: string; userId: string; topic: SupportTopic; message: string; createdAt: string };

type DbSession = { userId: string; familyId: string; revoked: boolean; expiresAt: number };

export type MockDb = {
  version: number;
  users: DbUser[];
  documents: DbDocument[];
  sectors: DbSector[];
  jobs: DbJob[];
  applications: DbApplication[];
  engagements: DbEngagement[];
  conversations: DbConversation[];
  messages: DbMessage[];
  notifications: DbNotification[];
  reports: DbReport[];
  moderation: DbModeration[];
  auditLogs: DbAuditLog[];
  tickets: DbTicket[];
  settings: PlatformSettings;
  auth: {
    accessTokens: Record<string, { userId: string; expiresAt: number }>;
    refreshTokens: Record<string, DbSession>;
    otpRequests: Record<string, { phone: string; role: SignUpRole; expiresAt: number; attempts: number }>;
    otpHistory: Record<string, number[]>;
    mfaTokens: Record<string, { userId: string; expiresAt: number }>;
  };
};

/** Bump when the seed shape changes so stale persisted data is discarded. */
export const MOCK_DB_VERSION = 1;
const STORAGE_KEY = 'solara.mock.db';

let db: MockDb | null = null;
let loading: Promise<MockDb> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<MockDb> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === MOCK_DB_VERSION) return parsed;
    }
  } catch {
    // Corrupt or unreadable mock data: fall through and reseed.
  }
  return createSeed(Date.now());
}

export async function getDb(): Promise<MockDb> {
  if (db) return db;
  loading ??= load().then((loaded) => {
    db = loaded;
    return loaded;
  });
  return loading;
}

/** Debounced write so a burst of requests causes a single AsyncStorage write. */
export function persistDb(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!db) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db)).catch(() => undefined);
  }, 300);
}

let idCounter = 0;
/** Short unique ids such as "job_lq2x8k3a". */
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
