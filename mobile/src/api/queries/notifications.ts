import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { getNotifications, markNotificationsRead } from '../notifications';
import { queryKeys } from '../queryKeys';
import type { MarkReadBody, NotificationPage } from '../../lib/types/messages';
import { nextPageParam } from './jobs';

const PAGE_SIZE = 20;

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: ({ pageParam }) => getNotifications({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    // Keep the bell badge fresh while the app is open.
    refetchInterval: 60_000,
  });
}

/** Unread count for the bell badge (shares the notifications query, so no extra request). */
export function useUnreadNotificationCount(): number {
  const { data } = useNotifications();
  return data?.pages[0]?.unread ?? 0;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadBody) => markNotificationsRead(body),
    // Optimistic: the dot disappears immediately; rolled back if the request fails.
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previous = queryClient.getQueryData<InfiniteData<NotificationPage>>(queryKeys.notifications.all);
      const ids = 'ids' in body ? new Set(body.ids) : null;
      queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKeys.notifications.all, (current) => {
        if (!current) return current;
        let newlyRead = 0;
        const pages = current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => {
            if (item.read || (ids && !ids.has(item.id))) return item;
            newlyRead += 1;
            return { ...item, read: true };
          }),
        }));
        return {
          ...current,
          pages: pages.map((page) => ({ ...page, unread: ids ? Math.max(0, page.unread - newlyRead) : 0 })),
        };
      });
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications.all, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
