import { newId, nowIso, persistDb, type DbConversation, type MockDb } from '../db';
import { notify } from '../events';
import { caller, created, fail, noContent, ok, paginate, readString, route, type MockRequest, type Route } from '../http';
import { displayName, findUser, toConversation, toMessage, toNotification } from '../serializers';

const MESSAGE_PAGE_SIZE = 30;

/**
 * To make polling visible in a single-device demo, the other side answers the first
 * message you send in each conversation (once per app session).
 */
const AUTO_REPLY_DELAY_MS = 6_000;
const AUTO_REPLIES = [
  'Thank you for your message. I will get back to you shortly.',
  'Noted, thank you. Let us speak tomorrow morning.',
  'Sounds good. I will confirm the timing by evening.',
];
const autoReplied = new Set<string>();

function scheduleAutoReply(db: MockDb, conversation: DbConversation, senderId: string): void {
  if (autoReplied.has(conversation.id)) return;
  autoReplied.add(conversation.id);
  const replierId = senderId === conversation.seekerId ? conversation.hirerId : conversation.seekerId;
  const text = AUTO_REPLIES[autoReplied.size % AUTO_REPLIES.length] ?? AUTO_REPLIES[0] ?? '';
  setTimeout(() => {
    db.messages.push({ id: newId('msg'), conversationId: conversation.id, senderId: replierId, text, createdAt: nowIso() });
    notify(db, senderId, 'message', { name: displayName(findUser(db, replierId)) }, { kind: 'conversation', id: conversation.id });
    persistDb();
  }, AUTO_REPLY_DELAY_MS);
}

function myConversation(request: MockRequest): DbConversation {
  const user = caller(request);
  const conversation = request.db.conversations.find((candidate) => candidate.id === request.params.id);
  if (!conversation || (conversation.seekerId !== user.id && conversation.hirerId !== user.id)) throw fail.notFound();
  return conversation;
}

function lastActivity(db: MockDb, conversation: DbConversation): string {
  return db.messages
    .filter((message) => message.conversationId === conversation.id)
    .reduce((latest, message) => (message.createdAt > latest ? message.createdAt : latest), conversation.createdAt);
}

export const messageRoutes: Route[] = [
  route('GET', '/conversations', ['user', 'admin'], (request) => {
    const user = caller(request);
    const { db } = request;
    const conversations = db.conversations
      .filter((conversation) => conversation.seekerId === user.id || conversation.hirerId === user.id)
      .sort((a, b) => lastActivity(db, b).localeCompare(lastActivity(db, a)));
    const page = paginate(conversations, request.query);
    return ok({ ...page, items: page.items.map((conversation) => toConversation(conversation, db, user.id)) });
  }),

  route('GET', '/conversations/:id/messages', ['user', 'admin'], (request) => {
    const user = caller(request);
    const conversation = myConversation(request);
    const { db } = request;
    const newestFirst = db.messages
      .filter((message) => message.conversationId === conversation.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = Math.max(0, Number(request.query.cursor) || 0);
    const items = newestFirst.slice(offset, offset + MESSAGE_PAGE_SIZE);
    const nextOffset = offset + MESSAGE_PAGE_SIZE;

    // Opening a conversation marks it — and its message notifications — as read.
    conversation.lastReadAt = { ...conversation.lastReadAt, [user.id]: nowIso() };
    db.notifications
      .filter((n) => n.userId === user.id && n.type === 'message' && n.target.id === conversation.id)
      .forEach((n) => {
        n.read = true;
      });

    return ok({
      items: items.map((message) => toMessage(message, user.id)),
      nextCursor: nextOffset < newestFirst.length ? String(nextOffset) : null,
    });
  }),

  route('POST', '/conversations/:id/messages', ['user', 'admin'], (request) => {
    const user = caller(request);
    const conversation = myConversation(request);
    const { db } = request;
    const text = readString(request.body, 'text', { min: 1, max: 1000 });
    const message = { id: newId('msg'), conversationId: conversation.id, senderId: user.id, text, createdAt: nowIso() };
    db.messages.push(message);
    conversation.lastReadAt = { ...conversation.lastReadAt, [user.id]: message.createdAt };
    const recipientId = user.id === conversation.seekerId ? conversation.hirerId : conversation.seekerId;
    notify(db, recipientId, 'message', { name: displayName(user) }, { kind: 'conversation', id: conversation.id });
    scheduleAutoReply(db, conversation, user.id);
    return created(toMessage(message, user.id));
  }),

  route('GET', '/notifications', ['user', 'admin'], (request) => {
    const user = caller(request);
    const mine = request.db.notifications
      .filter((notification) => notification.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = paginate(mine, request.query);
    return ok({
      ...page,
      items: page.items.map(toNotification),
      unread: mine.filter((notification) => !notification.read).length,
    });
  }),

  route('POST', '/notifications/read', ['user', 'admin'], (request) => {
    const user = caller(request);
    const { body, db } = request;
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
    if (body.all !== true && ids.length === 0) throw fail.validation({ ids: 'required' });
    db.notifications
      .filter((notification) => notification.userId === user.id && (body.all === true || ids.includes(notification.id)))
      .forEach((notification) => {
        notification.read = true;
      });
    return noContent();
  }),
];
