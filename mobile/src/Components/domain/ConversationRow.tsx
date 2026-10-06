import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Conversation } from '../../lib/types/messages';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

type ConversationRowProps = { conversation: Conversation; onPress: (conversation: Conversation) => void };

function ConversationRowBase({ conversation, onPress }: ConversationRowProps) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const unread = conversation.unreadCount > 0;
  const preview = conversation.lastMessage
    ? `${conversation.lastMessage.fromMe ? `${t('messages.you')}: ` : ''}${conversation.lastMessage.text}`
    : t('messages.noMessages');

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      accessibilityRole="button"
      accessibilityLabel={[
        conversation.participant.name,
        conversation.job?.title,
        preview,
        unread ? t('a11y.unreadCount', { count: conversation.unreadCount }) : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Avatar name={conversation.participant.name} size="md" />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text variant={unread ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.name}>
            {conversation.participant.name}
          </Text>
          {conversation.lastMessage ? (
            <Text variant="caption" color={unread ? 'primary' : 'textSubtle'}>
              {relativeTime(conversation.lastMessage.at)}
            </Text>
          ) : null}
        </View>
        {conversation.job ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {conversation.job.title}
          </Text>
        ) : null}
        <View style={styles.topLine}>
          <Text variant="caption" color={unread ? 'text' : 'textMuted'} numberOfLines={1} style={styles.name}>
            {preview}
          </Text>
          {unread ? (
            <View style={styles.count}>
              <Text variant="caption" color="textOnDark" latin>
                {String(conversation.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const ConversationRow = memo(ConversationRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  pressed: { backgroundColor: colors.surfaceMuted },
  body: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1 },
  count: {
    minWidth: sizes.icon,
    paddingHorizontal: spacing.xxs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
});
