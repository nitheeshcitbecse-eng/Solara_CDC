import { BriefcaseBusiness, Flag, Languages, LogOut, ScrollText, SlidersHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { useAuthActions, useSessionUser } from '../../context/AuthContext';
import { useOverview } from '../../api/queries/superadmin';
import type { SuperAdminTabScreenProps } from '../../lib/types/navigation';

export function MoreScreen({ navigation }: SuperAdminTabScreenProps<'More'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const { signOut } = useAuthActions();
  const overview = useOverview();
  const openReports = overview.data?.kpis.openReports;

  const confirmSignOut = () =>
    Alert.alert(t('menu.signOutTitle'), t('superadmin.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen edges={['top']} header={<Header back={false} title={t('tabs.more')} subtitle={user.email ?? undefined} />}>
      <Section title={t('superadmin.manage')}>
        <View>
          <ListRow icon={BriefcaseBusiness} title={t('superadmin.allJobs')} onPress={() => navigation.navigate('SuperJobs')} />
          <ListRow
            icon={Flag}
            title={t('superadmin.reports')}
            meta={openReports ? t('superadmin.openCount', { count: openReports }) : undefined}
            onPress={() => navigation.navigate('Reports')}
          />
          <ListRow icon={ScrollText} title={t('superadmin.auditLogs')} onPress={() => navigation.navigate('AuditLogs')} />
          <ListRow icon={SlidersHorizontal} title={t('superadmin.platformSettings')} onPress={() => navigation.navigate('PlatformSettings')} />
        </View>
      </Section>
      <Section title={t('settings.account')}>
        <View>
          <ListRow icon={Languages} title={t('settings.language')} onPress={() => navigation.navigate('Language', { mode: 'change' })} />
          <ListRow icon={LogOut} title={t('common.signOut')} tone="danger" onPress={confirmSignOut} />
        </View>
      </Section>
    </Screen>
  );
}
