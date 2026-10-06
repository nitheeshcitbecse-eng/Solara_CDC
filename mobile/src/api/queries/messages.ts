import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { getConversations, getMessages, sendMessage } from '../messages';
import { queryKeys } from '../queryKeys';
import type { CursorPage } from '../../lib/types/common';
import type { Message } from '../../lib/types/messages';
import { nextPageParam } from './jobs';

const CHAT_POLL_MS = 10_000;

export function useConversations() {
  const focused = useIsFocused();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: ({ pageParam }) => getConversations({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    refetchInterval: focused ? CHAT_POLL_MS * 3 : false,
  });
}

/**
 * Newest-first pages of a conversation. While the Chat screen is focused we poll
 * every 10 s; polling stops as soon as the user navigates away.
 */
export function useMessages(conversationId: string) {
  const focused = useIsFocused();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId),
    queryFn: ({ pageParam }) => getMessages(conversationId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: CursorPage<Message>) => last.nextCursor ?? undefined,
    refetchInterval: focused ? CHAT_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.conversations.messages(conversationId);
  return useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, text),
    // Show the bubble immediately; it is replaced by the server's copy on refetch.
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InfiniteData<CursorPage<Message>>>(key);
      const optimistic: Message = {
        id: `pending-${Date.now()}`,
        conversationId,
        fromMe: true,
        text,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<InfiniteData<CursorPage<Message>>>(key, (current) => {
        if (!current) return current;
        const [first, ...rest] = current.pages;
        if (!first) return current;
        return { ...current, pages: [{ ...first, items: [optimistic, ...first.items] }, ...rest] };
      });
      return { previous };
    },
    onError: (_error, _text, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
    },
  });
}
