import { REPORT_REASONS, SUPPORT_TOPICS, type ReportTargetType } from '../../../lib/types/support';
import { newId, nowIso, type MockDb } from '../db';
import { FAQS } from '../fixtures/faqs';
import { caller, created, fail, ok, readEnum, readString, route, type Route } from '../http';
import { displayName, findUser } from '../serializers';

const TARGET_TYPES: readonly ReportTargetType[] = ['job', 'user', 'message'];

/** Human-readable label for the moderation queue, resolved when the report is filed. */
function targetLabel(db: MockDb, type: ReportTargetType, id: string): string | null {
  if (type === 'job') return db.jobs.find((job) => job.id === id)?.title ?? null;
  if (type === 'user') {
    const user = findUser(db, id);
    return user ? displayName(user) : null;
  }
  const message = db.messages.find((candidate) => candidate.id === id);
  return message ? `Message from ${displayName(findUser(db, message.senderId))}` : null;
}

export const supportRoutes: Route[] = [
  route('GET', '/help/faqs', 'any', ({ language }) => {
    const localized = language === 'ta' || language === 'hi' ? FAQS[language] : FAQS.en;
    return ok(localized);
  }),

  route('POST', '/support/tickets', ['user', 'admin'], (request) => {
    const user = caller(request);
    const topic = readEnum(request.body, 'topic', SUPPORT_TOPICS);
    const message = readString(request.body, 'message', { min: 20, max: 1000 });
    const ticket = { id: newId('tkt'), userId: user.id, topic, message, createdAt: nowIso() };
    request.db.tickets.push(ticket);
    return created({ id: ticket.id, createdAt: ticket.createdAt });
  }),

  route('POST', '/reports', ['user', 'admin'], (request) => {
    const user = caller(request);
    const { body, db } = request;
    const targetType = readEnum(body, 'targetType', TARGET_TYPES);
    const targetId = readString(body, 'targetId', { max: 60 });
    const reason = readEnum(body, 'reason', REPORT_REASONS);
    const details = readString(body, 'details', { optional: true, max: 500 });
    const label = targetLabel(db, targetType, targetId);
    if (!label) throw fail.notFound();
    const report = {
      id: newId('rep'),
      targetType,
      targetId,
      targetLabel: label,
      reason,
      details,
      status: 'open' as const,
      reporterId: user.id,
      createdAt: nowIso(),
      resolutionNote: null,
    };
    db.reports.push(report);
    return created({ id: report.id });
  }),
];
