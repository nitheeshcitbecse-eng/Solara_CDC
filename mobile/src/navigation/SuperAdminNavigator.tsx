import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ellipsis, Gauge, ShieldCheck, UsersRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { AuditLogsScreen } from '../screens/superadmin/AuditLogsScreen';
import { DocumentViewerScreen } from '../screens/superadmin/DocumentViewerScreen';
import { ModerationDetailScreen } from '../screens/superadmin/ModerationDetailScreen';
import { ModerationScreen } from '../screens/superadmin/ModerationScreen';
import { MoreScreen } from '../screens/superadmin/MoreScreen';
import { OverviewScreen } from '../screens/superadmin/OverviewScreen';
import { PlatformSettingsScreen } from '../screens/superadmin/PlatformSettingsScreen';
import { ReportDetailScreen } from '../screens/superadmin/ReportDetailScreen';
import { ReportsScreen } from '../screens/superadmin/ReportsScreen';
import { SuperJobDetailScreen } from '../screens/superadmin/SuperJobDetailScreen';
import { SuperJobsScreen } from '../screens/superadmin/SuperJobsScreen';
import { UserDetailScreen } from '../screens/superadmin/UserDetailScreen';
import { UsersScreen } from '../screens/superadmin/UsersScreen';
import type { SuperAdminTabParamList } from '../lib/types/navigation';
import { RootStack } from './rootStack';
import { tabOptions, tabScreenOptions } from './tabBar';

const Tabs = createBottomTabNavigator<SuperAdminTabParamList>();

function SuperAdminTabs() {
  const { t } = useTranslation();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen name="Overview" component={OverviewScreen} options={tabOptions(Gauge, t('tabs.overview'))} />
      <Tabs.Screen name="Users" component={UsersScreen} options={tabOptions(UsersRound, t('tabs.users'))} />
      <Tabs.Screen name="Moderation" component={ModerationScreen} options={tabOptions(ShieldCheck, t('tabs.moderation'))} />
      <Tabs.Screen name="More" component={MoreScreen} options={tabOptions(Ellipsis, t('tabs.more'))} />
    </Tabs.Navigator>
  );
}

/** The owner console. Reached only through email + password + TOTP, never phone OTP. */
export function superAdminScreens(userId: string) {
  return (
    <RootStack.Group key="superadmin" navigationKey={`superadmin-${userId}`}>
      <RootStack.Screen name="SuperAdminTabs" component={SuperAdminTabs} />
      <RootStack.Screen name="UserDetail" component={UserDetailScreen} />
      <RootStack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
      <RootStack.Screen name="ModerationDetail" component={ModerationDetailScreen} />
      <RootStack.Screen name="SuperJobs" component={SuperJobsScreen} />
      <RootStack.Screen name="SuperJobDetail" component={SuperJobDetailScreen} />
      <RootStack.Screen name="Reports" component={ReportsScreen} />
      <RootStack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <RootStack.Screen name="AuditLogs" component={AuditLogsScreen} />
      <RootStack.Screen name="PlatformSettings" component={PlatformSettingsScreen} />
      <RootStack.Screen name="Language" component={LanguageScreen} initialParams={{ mode: 'change' }} />
    </RootStack.Group>
  );
}
