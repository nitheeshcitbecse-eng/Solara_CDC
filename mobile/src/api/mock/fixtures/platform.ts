import { LANGUAGE_CODES } from '../../../lib/i18n/languages';
import type { PlatformSettings } from '../../../lib/types/superadmin';
import type { DbAuditLog, DbModeration, DbReport } from '../db';
import { JOB_IDS } from './jobs';
import { ago } from './time';
import { IDS } from './users';

export function defaultPlatformSettings(): PlatformSettings {
  return {
    ai: { sectorMatchThreshold: 0.8, sectorReviewThreshold: 0.5, photoSafetyThreshold: 0.7, authenticityThreshold: 0.75 },
    otp: { maxRequestsPerHour: 5, resendAfterSec: 30, expirySec: 300 },
    enabledLanguages: [...LANGUAGE_CODES],
  };
}

export function buildReports(now: number): DbReport[] {
  return [
    {
      id: 'rep_01',
      targetType: 'job',
      targetId: JOB_IDS.dataEntryScam,
      targetLabel: 'Earn ₹50,000 from home – data entry',
      reason: 'fraud',
      details: 'They asked me to pay a ₹999 registration fee before starting.',
      status: 'resolved',
      reporterId: IDS.pooja,
      createdAt: ago(now, { days: 17, hours: 6 }),
      resolutionNote: 'Job taken down. Hirer verification rejected.',
    },
    {
      id: 'rep_02',
      targetType: 'user',
      targetId: IDS.suresh,
      targetLabel: 'Suresh Babu',
      reason: 'other',
      details: 'Did not turn up on the confirmed start date, twice, without informing.',
      status: 'open',
      reporterId: IDS.arun,
      createdAt: ago(now, { days: 1, hours: 5 }),
      resolutionNote: null,
    },
    {
      id: 'rep_03',
      targetType: 'job',
      targetId: JOB_IDS.tandoorCook,
      targetLabel: 'Tandoor cook – restaurant client',
      reason: 'misleading',
      details: 'The salary offered at the interview was lower than the amount shown in the app.',
      status: 'open',
      reporterId: IDS.imran,
      createdAt: ago(now, { hours: 9 }),
      resolutionNote: null,
    },
    {
      id: 'rep_04',
      targetType: 'message',
      targetId: 'msg_c3_1',
      targetLabel: 'Message from Arun Kumar',
      reason: 'inappropriate',
      details: 'Asked for documents in chat.',
      status: 'dismissed',
      reporterId: IDS.karthik,
      createdAt: ago(now, { days: 2, hours: 4 }),
      resolutionNote: 'Reviewed: a normal request to see a driving licence in person.',
    },
  ];
}

export function buildModeration(now: number): DbModeration[] {
  return [
    {
      id: 'mod_01',
      kind: 'sector_suggestion',
      status: 'open',
      createdAt: ago(now, { days: 1 }),
      jobId: JOB_IDS.pantry,
      sectorSuggestion: { proposedName: 'Pantry services', decision: 'new', confidence: 0.18 },
      note: null,
    },
    {
      id: 'mod_02',
      kind: 'workplace_photos',
      status: 'open',
      createdAt: ago(now, { hours: 6 }),
      jobId: JOB_IDS.nightHousekeeping,
      sectorSuggestion: null,
      note: null,
    },
    {
      id: 'mod_03',
      kind: 'sector_suggestion',
      status: 'approved',
      createdAt: ago(now, { days: 12, hours: 3 }),
      jobId: JOB_IDS.homeTutor,
      sectorSuggestion: { proposedName: 'Tuition', decision: 'review', confidence: 0.55 },
      note: 'Merged into the existing Teaching sector.',
    },
  ];
}

export function buildAuditLogs(now: number): DbAuditLog[] {
  const log = (
    id: string,
    action: DbAuditLog['action'],
    target: DbAuditLog['target'],
    when: { days?: number; hours?: number },
    reason: string | null = null,
  ): DbAuditLog => ({ id, actorId: IDS.owner, action, target, reason, createdAt: ago(now, when) });

  return [
    log('aud_01', 'auth.login', { type: 'session', id: IDS.owner, label: 'Solara Owner' }, { hours: 1 }),
    log('aud_02', 'report.dismiss', { type: 'report', id: 'rep_04', label: 'Message from Arun Kumar' }, { days: 2 }, 'Reviewed: a normal request to see a driving licence in person.'),
    log('aud_03', 'auth.login', { type: 'session', id: IDS.owner, label: 'Solara Owner' }, { days: 3 }),
    log('aud_04', 'verification.approve', { type: 'user', id: IDS.imran, label: 'Imran Shaikh' }, { days: 13 }),
    log('aud_05', 'moderation.approve', { type: 'moderation', id: 'mod_03', label: 'Tuition → Teaching' }, { days: 12 }, 'Merged into the existing Teaching sector.'),
    log('aud_06', 'user.suspend', { type: 'user', id: IDS.suresh, label: 'Suresh Babu' }, { days: 10 }, 'Repeated no-shows reported by three hirers.'),
    log('aud_07', 'verification.reject', { type: 'user', id: IDS.vikram, label: 'Vikram Rao' }, { days: 17, hours: 2 }, 'The document photo is blurred.'),
    log('aud_08', 'job.take_down', { type: 'job', id: JOB_IDS.dataEntryScam, label: 'Earn ₹50,000 from home – data entry' }, { days: 17, hours: 3 }, 'Asks applicants for a registration fee.'),
    log('aud_09', 'report.resolve', { type: 'report', id: 'rep_01', label: 'Earn ₹50,000 from home – data entry' }, { days: 17, hours: 3 }, 'Job taken down. Hirer verification rejected.'),
    log('aud_10', 'verification.approve', { type: 'user', id: IDS.divya, label: 'Divya Ramesh' }, { days: 24 }),
    log('aud_11', 'settings.update', { type: 'settings', id: 'platform', label: 'OTP limits' }, { days: 30 }, 'Raised the OTP limit to 5 requests per hour.'),
    log('aud_12', 'verification.approve', { type: 'user', id: IDS.lakshmi, label: 'Lakshmi Narayanan' }, { days: 39 }),
    log('aud_13', 'verification.approve', { type: 'user', id: IDS.karthik, label: 'Karthik Raja' }, { days: 58 }),
  ];
}
