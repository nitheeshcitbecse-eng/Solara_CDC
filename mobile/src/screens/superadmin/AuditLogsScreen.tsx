import { ScrollText, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { PagedList } from '../../Components/layout/PagedList';
import { Screen } from '../../Components/layout/Screen';
import { Select } from '../../Components/ui/Select';
import { TextField } from '../../Components/ui/TextField';
import { useAuditLogs } from '../../api/queries/superadmin';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { AUDIT_ACTIONS, type AuditAction, type AuditLog } from '../../lib/types/superadmin';
import { normalizeText } from '../../utils/format';
import { LIMITS } from '../../utils/validation';

type ActionFilter = AuditAction | 'all';

export function AuditLogsScreen(_props: RootScreenProps<'AuditLogs'>) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const [action, setAction] = useState<ActionFilter>('all');
  const [search, setSearch] = useState('');
  const q = useDebounce(normalizeText(search), 350);
  const logs = useAuditLogs({ action: action === 'all' ? undefined : action, q: q || undefined });

  const renderItem = useCallback(
    ({ item }: { item: AuditLog }) => (
      <ListRow
        icon={ScrollText}
        title={t(`superadmin.audit.${item.action}`)}
        subtitle={[item.target.label, item.actor.name, item.reason].filter(Boolean).join(' · ')}
        meta={relativeTime(item.createdAt)}
      />
    ),
    [relativeTime, t],
  );

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.header}>
          <Header title={t('superadmin.auditLogs')} />
          <View style={styles.filters}>
            <Select<ActionFilter>
              label={t('superadmin.filterAction')}
              value={action}
              options={[
                { value: 'all', label: t('superadmin.allActions') },
                ...AUDIT_ACTIONS.map((value) => ({ value, label: t(`superadmin.audit.${value}`) })),
              ]}
              onChange={setAction}
            />
            <TextField
              label={t('common.search')}
              value={search}
              onChangeText={setSearch}
              maxLength={LIMITS.search}
              right={<Search size={sizes.icon} color={colors.textSubtle} strokeWidth={2} />}
            />
          </View>
        </View>
      }
    >
      <PagedList
        query={logs}
        renderItem={renderItem}
        keyExtractor={(log) => log.id}
        empty={{ icon: ScrollText, title: t('superadmin.noLogsTitle'), body: t('superadmin.noLogsBody') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  filters: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xs },
});
