import { Building2, Search, UserRound, UsersRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { PagedList } from '../../Components/layout/PagedList';
import { Screen } from '../../Components/layout/Screen';
import { Chip } from '../../Components/ui/Chip';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { TextField } from '../../Components/ui/TextField';
import { useAdminUsers } from '../../api/queries/superadmin';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { AccountStatus } from '../../lib/types/auth';
import type { SuperAdminTabScreenProps } from '../../lib/types/navigation';
import type { AdminUserListItem, ManagedRole } from '../../lib/types/superadmin';
import { formatPhone, normalizeText } from '../../utils/format';
import { LIMITS } from '../../utils/validation';

const STATUSES: readonly AccountStatus[] = ['active', 'suspended', 'banned'];

export function UsersScreen({ navigation }: SuperAdminTabScreenProps<'Users'>) {
  const { t } = useTranslation();
  const [role, setRole] = useState<ManagedRole>('user');
  const [status, setStatus] = useState<AccountStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const q = useDebounce(normalizeText(search), 350);
  const users = useAdminUsers({ role, status, q: q || undefined });

  const renderItem = useCallback(
    ({ item }: { item: AdminUserListItem }) => (
      <ListRow
        icon={item.role === 'admin' ? Building2 : UserRound}
        title={item.name ?? t('profile.notSet')}
        subtitle={[formatPhone(item.phone), item.city, t(`enums.verification.${item.verificationStatus}`)].filter(Boolean).join(' · ')}
        meta={t(`enums.accountStatus.${item.status}`)}
        tone={item.status === 'active' ? 'default' : 'danger'}
        onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
      />
    ),
    [navigation, t],
  );

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <View style={styles.header}>
          <Header back={false} title={t('tabs.users')} />
          <View style={styles.controls}>
            <SegmentedControl
              segments={[
                { value: 'user', label: t('superadmin.jobSeekers') },
                { value: 'admin', label: t('superadmin.hirers') },
              ]}
              value={role}
              onChange={setRole}
              accessibilityLabel={t('tabs.users')}
            />
            <TextField
              label={t('common.search')}
              placeholder={t('superadmin.searchUsers')}
              value={search}
              onChangeText={setSearch}
              maxLength={LIMITS.search}
              right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label={t('applied.all')} selected={status === undefined} role="radio" onPress={() => setStatus(undefined)} />
            {STATUSES.map((value) => (
              <Chip key={value} label={t(`enums.accountStatus.${value}`)} selected={status === value} role="radio" onPress={() => setStatus(value)} />
            ))}
          </ScrollView>
        </View>
      }
    >
      <PagedList
        query={users}
        renderItem={renderItem}
        keyExtractor={(user) => user.id}
        empty={{ icon: UsersRound, title: t('superadmin.noUsersTitle'), body: t('superadmin.noUsersBody') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  controls: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filters: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
