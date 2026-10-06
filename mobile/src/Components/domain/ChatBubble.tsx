import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Message } from '../../lib/types/messages';
import { formatTime } from '../../utils/format';
import { Text } from '../ui/Text';

type ChatBubbleProps = {
  message: Message;
  /** Long-press on the other person's message (e.g. to report it). */
  onLongPress?: (message: Message) => void;
};

function ChatBubbleBase({ message, onLongPress }: ChatBubbleProps) {
  const { activeLanguage } = useLanguage();
  const mine = message.fromMe;
  const pending = message.id.startsWith('pending-');

  return (
    <View style={[styles.row, mine ? styles.rowMine : null]}>
      <Pressable
        onLongPress={!mine && onLongPress ? () => onLongPress(message) : undefined}
        accessibilityRole="text"
        style={[styles.bubble, mine ? styles.mine : styles.theirs, pending ? styles.pending : null]}
      >
        <Text variant="body" color={mine ? 'textOnDark' : 'text'}>
          {message.text}
        </Text>
        <Text variant="caption" color={mine ? 'textOnDarkMuted' : 'textSubtle'} align="right">
          {formatTime(message.createdAt, activeLanguage)}
        </Text>
      </Pressable>
    </View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: spacing.lg },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 2 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.sm / 2 },
  theirs: { backgroundColor: colors.surface, borderWidth: sizes.hairline, borderColor: colors.border, borderBottomLeftRadius: radius.sm / 2 },
  pending: { opacity: 0.7 },
});
