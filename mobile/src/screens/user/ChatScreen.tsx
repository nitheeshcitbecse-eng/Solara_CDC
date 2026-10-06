import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, SendHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { ChatBubble } from '../../Components/domain/ChatBubble';
import { ReportSheet } from '../../Components/domain/ReportSheet';
import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useFlatPages } from '../../api/queries/jobs';
import { useMessages, useSendMessage } from '../../api/queries/messages';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { queryKeys } from '../../api/queryKeys';
import { colors, MAX_FONT_SCALE, radius, sizes, spacing } from '../../lib/theme/tokens';
import { getTextStyle } from '../../lib/theme/typography';
import type { Message } from '../../lib/types/messages';
import type { RootScreenProps } from '../../lib/types/navigation';
import { normalizeMultiline } from '../../utils/format';
import { chatMessageSchema, LIMITS } from '../../utils/validation';

const keyExtractor = (message: Message) => message.id;

export function ChatScreen({ route }: RootScreenProps<'Chat'>) {
  const { conversationId, title } = route.params;
  const { t } = useTranslation();
  const { script } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const query = useMessages(conversationId);
  const messages = useFlatPages(query.data);
  const send = useSendMessage(conversationId);
  const [draft, setDraft] = useState('');
  const [reporting, setReporting] = useState<Message | null>(null);
  const typography = getTextStyle('body', script);

  // Opening a chat marks it read on the server; refresh unread badges when we leave.
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    [queryClient],
  );

  const onSend = () => {
    const text = normalizeMultiline(draft);
    if (!chatMessageSchema.safeParse(text).success) return;
    setDraft('');
    send.mutate(text, {
      onError: (error) => {
        setDraft(text); // give the text back so nothing is lost
        showToast(errorMessage(error), 'error');
      },
    });
  };

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <ChatBubble message={item} onLongPress={setReporting} />,
    [],
  );

  return (
    <Screen
      scroll={false}
      header={<Header title={title} />}
      footer={
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('messages.placeholder')}
            placeholderTextColor={colors.textSubtle}
            multiline
            maxLength={LIMITS.chatMessage}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            accessibilityLabel={t('messages.placeholder')}
            style={[
              styles.input,
              { fontFamily: typography.fontFamily, fontSize: typography.fontSize, lineHeight: typography.lineHeight },
            ]}
          />
          <IconButton
            icon={SendHorizontal}
            variant="surface"
            color={colors.primary}
            onPress={onSend}
            disabled={normalizeMultiline(draft).length === 0}
            accessibilityLabel={t('messages.send')}
          />
        </View>
      }
    >
      {query.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('a11y.loading')} />
        </View>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          // Inverted: newest message at the bottom, older pages load as you scroll up.
          inverted
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          ListEmptyComponent={
            <View style={styles.flipped}>
              <EmptyState icon={MessageCircle} title={t('messages.startTitle')} body={t('messages.startBody')} />
            </View>
          }
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <Text variant="caption" color="textSubtle" align="center" style={styles.hint}>
        {t('messages.reportHint')}
      </Text>
      {reporting ? (
        <ReportSheet visible onClose={() => setReporting(null)} targetType="message" targetId={reporting.id} />
      ) : null}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: spacing.md, flexGrow: 1 },
  separator: { height: spacing.xs },
  // Inverted lists flip their children; flip the empty state back upright.
  flipped: { transform: [{ scaleY: -1 }], flex: 1, justifyContent: 'center' },
  hint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxs },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: {
    flex: 1,
    minHeight: sizes.inputHeight,
    maxHeight: sizes.textAreaMin,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
});
