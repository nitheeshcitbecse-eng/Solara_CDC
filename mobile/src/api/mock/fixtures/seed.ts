import { MOCK_DB_VERSION, type MockDb } from '../db';
import { buildApplications, buildConversations, buildEngagements, buildNotifications } from './activity';
import { buildJobs, buildSectors, JOB_IDS } from './jobs';
import { buildAuditLogs, buildModeration, buildReports, defaultPlatformSettings } from './platform';
import { buildDocuments, buildUsers, IDS } from './users';

/** Builds a fresh demo database. Timestamps are relative to `now`. */
export function createSeed(now: number): MockDb {
  const users = buildUsers(now);
  const prasina = users.find((user) => user.id === IDS.prasina);
  if (prasina) prasina.savedJobIds = [JOB_IDS.elderlyCare, JOB_IDS.clinicCleaner];

  const { conversations, messages } = buildConversations(now);
  return {
    version: MOCK_DB_VERSION,
    users,
    documents: buildDocuments(users),
    sectors: buildSectors(now),
    jobs: buildJobs(now),
    applications: buildApplications(now),
    engagements: buildEngagements(now),
    conversations,
    messages,
    notifications: buildNotifications(now),
    reports: buildReports(now),
    moderation: buildModeration(now),
    auditLogs: buildAuditLogs(now),
    tickets: [],
    settings: defaultPlatformSettings(),
    auth: { accessTokens: {}, refreshTokens: {}, otpRequests: {}, otpHistory: {}, mfaTokens: {} },
  };
}
