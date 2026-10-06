import type { PageParams } from '../lib/types/common';
import type { MarkReadBody, NotificationPage } from '../lib/types/messages';
import { api } from './client';

export async function getNotifications(params: PageParams): Promise<NotificationPage> {
  const { data } = await api.get<NotificationPage>('/notifications', { params });
  return data;
}

export async function markNotificationsRead(body: MarkReadBody): Promise<void> {
  await api.post('/notifications/read', body);
}
