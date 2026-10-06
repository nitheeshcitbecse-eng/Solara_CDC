import { MessagesSquare } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ConversationRow } from '../../Components/domain/ConversationRow';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Divider } from '../../Components/ui/Divider';
import { Skeleton } from '../../Components/ui/Skeleton';
import { useFlatPages } from '../../api/queries/jobs';
import { useConversations } from '../../api/queries/messages';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { Conversation } from '../../lib/types/messages';
import type { RootScreenProps } from '../../lib/types/navigation';

const keyExtractor = (conversation: Conversation) => conversation.id;

/** Conversation list for both job seekers and hirers. */
export function MessagesScreen({ navigation }: RootScreenProps<'Messages'>) {
  const { t } = useTranslation();
  const query = useConversations();
  const conversations = useFlatPages(query.data);

  const open = useCallback(
    (conversation: Conversation) =>
      navigation.navigate('Chat', { conversationId: conversation.id, title: conversation.participant.name }),
    [navigation],
  );
  const renderItem = useCallback(({ item }: { item: Conversation }) => <ConversationRow conversation={item} onPress={open} />, [open]);

  const placeholder = query.isPending ? (
    <View style={styles.skeletons}>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} height={sizes.avatarMd + spacing.md} />
      ))}
    </View>
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState icon={MessagesSquare} title={t('messages.emptyTitle')} body={t('messages.emptyBody')} />
  );

  return (
    <Screen scroll={false} header={<Header title={t('messages.title')} />}>
      <FlatList
        data={query.isPending || query.isError ? [] : conversations}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={placeholder}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl, flexGrow: 1 },
  skeletons: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingVertical: spacing.lg },
});
