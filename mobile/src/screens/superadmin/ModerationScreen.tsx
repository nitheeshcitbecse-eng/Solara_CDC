import { Images, ShieldCheck, Shapes } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { PagedList } from '../../Components/layout/PagedList';
import { Screen } from '../../Components/layout/Screen';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { useModerationQueue } from '../../api/queries/superadmin';
import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import { spacing } from '../../lib/theme/tokens';
import type { SuperAdminTabScreenProps } from '../../lib/types/navigation';
import type { ModerationItem } from '../../lib/types/superadmin';

export function ModerationScreen({ navigation }: SuperAdminTabScreenProps<'Moderation'>) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const queue = useModerationQueue({ status });

  const renderItem = useCallback(
    ({ item }: { item: ModerationItem }) => (
      <ListRow
        icon={item.kind === 'sector_suggestion' ? Shapes : Images}
        title={item.job.title}
        subtitle={`${t(`superadmin.moderationKind.${item.kind}`)} · ${item.job.hirerName}`}
        meta={item.status === 'open' ? relativeTime(item.createdAt) : t(`superadmin.moderationStatus.${item.status}`)}
        onPress={() => navigation.navigate('ModerationDetail', { item })}
      />
    ),
    [navigation, relativeTime, t],
  );

  return (
    <Screen
      edges={['top']}
      scroll={false}
      header={
        <View>
          <Header back={false} title={t('tabs.moderation')} />
          <View style={styles.segment}>
            <SegmentedControl
              segments={[
                { value: 'open', label: t('superadmin.queueOpen') },
                { value: 'closed', label: t('superadmin.queueClosed') },
              ]}
              value={status}
              onChange={setStatus}
              accessibilityLabel={t('tabs.moderation')}
            />
          </View>
        </View>
      }
    >
      <PagedList
        query={queue}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        empty={{ icon: ShieldCheck, title: t('superadmin.queueEmptyTitle'), body: t('superadmin.queueEmptyBody') }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
});
