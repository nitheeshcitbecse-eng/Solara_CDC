import type { CursorPage, Page, PageParams } from '../lib/types/common';
import type { Conversation, Message } from '../lib/types/messages';
import { api } from './client';

export async function getConversations(params: PageParams): Promise<Page<Conversation>> {
  const { data } = await api.get<Page<Conversation>>('/conversations', { params });
  return data;
}

export async function getMessages(conversationId: string, cursor: string | null): Promise<CursorPage<Message>> {
  const { data } = await api.get<CursorPage<Message>>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    params: cursor ? { cursor } : undefined,
  });
  return data;
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  const { data } = await api.post<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { text });
  return data;
}
