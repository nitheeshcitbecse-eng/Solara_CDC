import type { AuditAction } from '../../lib/types/superadmin';
import { newId, nowIso, type DbNotification, type MockDb } from './db';

/** Side effects shared by several routes: in-app notifications and audit entries. */

export function notify(
  db: MockDb,
  userId: string,
  type: DbNotification['type'],
  params: Record<string, string>,
  target: DbNotification['target'],
): void {
  db.notifications.push({ id: newId('ntf'), userId, type, params, target, read: false, createdAt: nowIso() });
}

export function audit(
  db: MockDb,
  actorId: string,
  action: AuditAction,
  target: { type: string; id: string; label: string },
  reason: string | null = null,
): void {
  db.auditLogs.push({ id: newId('aud'), actorId, action, target, reason, createdAt: nowIso() });
}
