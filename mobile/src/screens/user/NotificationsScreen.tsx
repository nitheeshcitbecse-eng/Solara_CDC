import {
  Bell,
  BellOff,
  BriefcaseBusiness,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '../../Components/layout/EmptyState';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Divider } from '../../Components/ui/Divider';
import { IconButton } from '../../Components/ui/IconButton';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { useSessionUser } from '../../context/AuthContext';
import { useFlatPages } from '../../api/queries/jobs';
import { useMarkNotificationsRead, useNotifications } from '../../api/queries/notifications';
import { useNotificationCopy } from '../../lib/hooks/useNotificationCopy';
import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { AppNotification, NotificationType } from '../../lib/types/messages';
import type { RootScreenProps } from '../../lib/types/navigation';

const ICONS: Record<NotificationType, LucideIcon> = {
  application_status: ClipboardList,
  new_applicant: UserPlus,
  message: MessageSquare,
  verification: ShieldCheck,
  job_review: BriefcaseBusiness,
  system: Bell,
};

type RowProps = { notification: AppNotification; onPress: (notification: AppNotification) => void };

const NotificationRow = memo(function NotificationRow({ notification, onPress }: RowProps) {
  const { t } = useTranslation();
  const copy = useNotificationCopy();
  const relativeTime = useRelativeTime();
  const { title, body } = copy(notification);
  const Icon = ICONS[notification.type];

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${notification.read ? '' : `${t('notifications.unread')}, `}${title}, ${body}`}
      style={({ pressed }) => [styles.row, notification.read ? null : styles.unread, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconTile}>
        <Icon size={sizes.icon} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="body" color="textMuted">
          {body}
        </Text>
        <Text variant="caption" color="textSubtle">
          {relativeTime(notification.createdAt)}
        </Text>
      </View>
      {notification.read ? null : <View style={styles.dot} />}
    </Pressable>
  );
});

const keyExtractor = (notification: AppNotification) => notification.id;

export function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const query = useNotifications();
  const notifications = useFlatPages(query.data);
  const unread = query.data?.pages[0]?.unread ?? 0;
  const markRead = useMarkNotificationsRead();

  const open = useCallback(
    (notification: AppNotification) => {
      if (!notification.read) markRead.mutate({ ids: [notification.id] });
      const { kind, id } = notification.target;
      const isHirer = user.role === 'admin';
      if (kind === 'conversation' && id) navigation.navigate('Chat', { conversationId: id, title: notification.params.name ?? '' });
      else if (kind === 'application' && id) {
        if (isHirer) navigation.navigate('ApplicantDetail', { applicationId: id });
        else navigation.navigate('ApplicationDetails', { applicationId: id });
      } else if (kind === 'job' && id) {
        if (isHirer) navigation.navigate('JobManage', { jobId: id });
        else navigation.navigate('JobDetails', { jobId: id });
      } else if (kind === 'verification') {
        if (isHirer) navigation.navigate('VerificationStatus');
        else navigation.navigate('AadhaarUpload');
      }
    },
    [markRead, navigation, user.role],
  );

  const renderItem = useCallback(({ item }: { item: AppNotification }) => <NotificationRow notification={item} onPress={open} />, [open]);

  const placeholder = query.isPending ? (
    <View style={styles.skeletons}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} height={sizes.listRow + spacing.lg} radius={radius.md} />
      ))}
    </View>
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState icon={BellOff} title={t('notifications.emptyTitle')} body={t('notifications.emptyBody')} />
  );

  return (
    <Screen
      scroll={false}
      header={
        <Header
          title={t('notifications.title')}
          right={
            unread > 0 ? (
              <IconButton icon={CheckCheck} onPress={() => markRead.mutate({ all: true })} accessibilityLabel={t('notifications.markAllRead')} />
            ) : null
          }
        />
      }
    >
      <FlatList
        data={query.isPending || query.isError ? [] : notifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={placeholder}
        contentContainerStyle={styles.content}
        removeClippedSubviews
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
  skeletons: { padding: spacing.lg, gap: spacing.sm },
  footer: { paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  unread: { backgroundColor: colors.surfaceSelected },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconTile: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  dot: { width: sizes.badgeDot, height: sizes.badgeDot, borderRadius: radius.pill, backgroundColor: colors.primary, marginTop: spacing.xs },
});
