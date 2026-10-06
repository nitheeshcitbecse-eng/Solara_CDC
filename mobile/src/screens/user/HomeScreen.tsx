import {
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  History,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { HomeHero } from '../../Components/domain/HomeHero';
import { JobList } from '../../Components/domain/JobList';
import { SectorTile } from '../../Components/domain/SectorTile';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { SideMenu, type SideMenuItem } from '../../Components/layout/SideMenu';
import { Avatar } from '../../Components/ui/Avatar';
import { IconButton } from '../../Components/ui/IconButton';
import { Logo } from '../../Components/ui/Logo';
import { Skeleton } from '../../Components/ui/Skeleton';
import { Text } from '../../Components/ui/Text';
import { useAuthActions, useSessionUser } from '../../context/AuthContext';
import { useJobCount, useJobSearch } from '../../api/queries/jobs';
import { useUnreadNotificationCount } from '../../api/queries/notifications';
import { useMe } from '../../api/queries/profile';
import { useSectors } from '../../api/queries/sectors';
import { colors, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { Sector } from '../../lib/types/jobs';
import type { UserTabScreenProps } from '../../lib/types/navigation';
import { formatPhone } from '../../utils/format';

export function HomeScreen({ navigation }: UserTabScreenProps<'Home'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const { signOut } = useAuthActions();
  const me = useMe();
  const city = me.data?.seeker?.city ?? null;
  const sectors = useSectors();
  // The API lists jobs in the seeker's own city first, so the unfiltered list is "near you".
  const jobs = useJobSearch({});
  const localCount = useJobCount({ city: city ?? undefined }, city !== null);
  const unread = useUnreadNotificationCount();
  const [menuOpen, setMenuOpen] = useState(false);

  const openJob = useCallback((jobId: string) => navigation.navigate('JobDetails', { jobId }), [navigation]);
  const openSector = useCallback(
    (sector: Sector) => navigation.navigate('SectorJobs', { sectorId: sector.id, sectorName: sector.name, sectorSlug: sector.slug }),
    [navigation],
  );

  const confirmSignOut = () => {
    Alert.alert(t('menu.signOutTitle'), t('menu.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const menuItems: SideMenuItem[] = [
    { key: 'profile', icon: UserRound, label: t('menu.profile'), onPress: () => navigation.navigate('Profile') },
    { key: 'jobs', icon: BriefcaseBusiness, label: t('menu.myJobs'), onPress: () => navigation.navigate('MyJobs') },
    { key: 'history', icon: History, label: t('menu.jobHistory'), onPress: () => navigation.navigate('JobHistory') },
    { key: 'settings', icon: Settings, label: t('menu.settings'), onPress: () => navigation.navigate('Settings') },
    { key: 'help', icon: CircleHelp, label: t('menu.help'), onPress: () => navigation.navigate('Help') },
    { key: 'signout', icon: LogOut, label: t('common.signOut'), onPress: confirmSignOut, tone: 'danger' },
  ];

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Logo />
        <View style={styles.actions}>
          <IconButton icon={MessageSquare} onPress={() => navigation.navigate('Messages')} accessibilityLabel={t('home.messages')} />
          <IconButton
            icon={Languages}
            onPress={() => navigation.navigate('Language', { mode: 'change' })}
            accessibilityLabel={t('welcome.language')}
          />
          <IconButton
            icon={Bell}
            badge={unread}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel={
              unread > 0 ? `${t('home.notifications')}, ${t('a11y.unreadCount', { count: unread })}` : t('home.notifications')
            }
          />
          <IconButton icon={Menu} onPress={() => setMenuOpen(true)} accessibilityLabel={t('home.menu')} />
        </View>
      </View>

      {/* Greeting rule: first name only. */}
      <Text variant="title" accessibilityRole="header">
        {t('home.greeting', { name: user.firstName ?? '' })}
      </Text>

      <Pressable
        onPress={() => navigation.navigate('Search')}
        accessibilityRole="search"
        accessibilityLabel={t('home.searchPlaceholder')}
        style={({ pressed }) => [styles.search, pressed ? styles.searchPressed : null]}
      >
        <Text variant="body" color="textSubtle" style={styles.searchText} numberOfLines={1}>
          {t('home.searchPlaceholder')}
        </Text>
        <View style={styles.searchButton}>
          <Search size={sizes.icon} color={colors.textOnDark} strokeWidth={2} />
        </View>
      </Pressable>

      <HomeHero count={localCount.data ?? null} city={city} />

      <Section title={t('home.sectors')} action={{ label: t('common.seeAll'), onPress: () => navigation.navigate('Explore') }}>
        {sectors.isPending ? (
          <Skeleton height={MIN_TOUCH + spacing.sm} radius={radius.pill} />
        ) : (
          <FlatList
            data={sectors.data ?? []}
            horizontal
            keyExtractor={(sector) => sector.id}
            renderItem={({ item }) => <SectorTile sector={item} onPress={openSector} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectors}
          />
        )}
      </Section>

      <Text variant="heading" accessibilityRole="header">
        {t('home.jobsNearYou')}
      </Text>
    </View>
  );

  return (
    <Screen edges={['top']} scroll={false}>
      <JobList
        query={jobs}
        onPressJob={openJob}
        header={header}
        empty={{
          icon: BriefcaseBusiness,
          title: t('home.emptyTitle'),
          body: t('home.emptyBody'),
          action: { label: t('home.exploreAll'), onPress: () => navigation.navigate('Explore') },
        }}
      />
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        header={
          <>
            <Avatar name={user.name} size="lg" />
            <Text variant="heading">{user.name ?? ''}</Text>
            <Text variant="caption" color="textMuted" latin>
              {formatPhone(user.phone)}
            </Text>
          </>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg, paddingBottom: spacing.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  search: {
    minHeight: sizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingStart: spacing.md,
    paddingEnd: spacing.xxs + 2,
  },
  searchPressed: { backgroundColor: colors.surfaceMuted },
  searchText: { flex: 1 },
  searchButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectors: { gap: spacing.xs },
});
