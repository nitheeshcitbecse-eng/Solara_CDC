import type { Role } from './auth';
import type { Page } from './common';

export type Conversation = {
  id: string;
  participant: { id: string; name: string; role: Role };
  job: { id: string; title: string } | null;
  lastMessage: { text: string; at: string; fromMe: boolean } | null;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  fromMe: boolean;
  text: string;
  createdAt: string;
};

export type NotificationType =
  | 'application_status'
  | 'new_applicant'
  | 'message'
  | 'verification'
  | 'job_review'
  | 'system';

type NotificationTarget = {
  kind: 'application' | 'job' | 'conversation' | 'verification' | 'none';
  id: string | null;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  params: Record<string, string>;
  target: NotificationTarget;
};

export type NotificationPage = Page<AppNotification> & { unread: number };

export type MarkReadBody = { ids: string[] } | { all: true };
