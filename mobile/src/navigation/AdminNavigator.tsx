import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BriefcaseBusiness, LayoutDashboard, UserRound, UsersRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useSessionSync } from '../api/queries/profile';
import { AddWorkScreen } from '../screens/admin/AddWorkScreen';
import { AdminJobsScreen } from '../screens/admin/AdminJobsScreen';
import { AdminOnboardingAadhaarScreen } from '../screens/admin/AdminOnboardingAadhaarScreen';
import { AdminOnboardingDetailsScreen } from '../screens/admin/AdminOnboardingDetailsScreen';
import { AdminOnboardingTypeScreen } from '../screens/admin/AdminOnboardingTypeScreen';
import { AdminProfileEditScreen } from '../screens/admin/AdminProfileEditScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { ApplicantDetailScreen } from '../screens/admin/ApplicantDetailScreen';
import { ApplicantsScreen } from '../screens/admin/ApplicantsScreen';
import { DashboardScreen } from '../screens/admin/DashboardScreen';
import { JobApplicantsScreen } from '../screens/admin/JobApplicantsScreen';
import { JobManageScreen } from '../screens/admin/JobManageScreen';
import { VerificationStatusScreen } from '../screens/admin/VerificationStatusScreen';
import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { AadhaarUploadScreen } from '../screens/user/AadhaarUploadScreen';
import { ChatScreen } from '../screens/user/ChatScreen';
import { HelpScreen } from '../screens/user/HelpScreen';
import { MessagesScreen } from '../screens/user/MessagesScreen';
import { NotificationsScreen } from '../screens/user/NotificationsScreen';
import { SettingsScreen } from '../screens/user/SettingsScreen';
import type { AdminTabParamList } from '../lib/types/navigation';
import { RootStack } from './rootStack';
import { tabOptions, tabScreenOptions } from './tabBar';

const Tabs = createBottomTabNavigator<AdminTabParamList>();

function AdminTabs() {
  const { t } = useTranslation();
  useSessionSync();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen name="Dashboard" component={DashboardScreen} options={tabOptions(LayoutDashboard, t('tabs.dashboard'))} />
      <Tabs.Screen name="AdminJobs" component={AdminJobsScreen} options={tabOptions(BriefcaseBusiness, t('tabs.myJobs'))} />
      <Tabs.Screen name="Applicants" component={ApplicantsScreen} options={tabOptions(UsersRound, t('tabs.applicants'))} />
      <Tabs.Screen name="AdminProfile" component={AdminProfileScreen} options={tabOptions(UserRound, t('tabs.profile'))} />
    </Tabs.Navigator>
  );
}

/** Hirer onboarding: type → details → Aadhaar → verification status. */
export function adminOnboardingScreens(userId: string) {
  return (
    <RootStack.Group key="admin-onboarding" navigationKey={`admin-onboarding-${userId}`}>
      <RootStack.Screen name="AdminOnboardingType" component={AdminOnboardingTypeScreen} />
      <RootStack.Screen name="AdminOnboardingDetails" component={AdminOnboardingDetailsScreen} />
      <RootStack.Screen name="AdminOnboardingAadhaar" component={AdminOnboardingAadhaarScreen} />
      <RootStack.Screen name="VerificationStatus" component={VerificationStatusScreen} />
    </RootStack.Group>
  );
}

/** The hirer app. Messages, Settings and Help are shared screens with role-aware content. */
export function adminScreens(userId: string) {
  return (
    <RootStack.Group key="admin" navigationKey={`admin-${userId}`}>
      <RootStack.Screen name="AdminTabs" component={AdminTabs} />
      <RootStack.Screen name="AddWork" component={AddWorkScreen} />
      <RootStack.Screen name="JobManage" component={JobManageScreen} />
      <RootStack.Screen name="JobApplicants" component={JobApplicantsScreen} />
      <RootStack.Screen name="ApplicantDetail" component={ApplicantDetailScreen} />
      <RootStack.Screen name="AdminProfileEdit" component={AdminProfileEditScreen} />
      <RootStack.Screen name="VerificationStatus" component={VerificationStatusScreen} />
      <RootStack.Screen name="AadhaarUpload" component={AadhaarUploadScreen} />
      <RootStack.Screen name="Messages" component={MessagesScreen} />
      <RootStack.Screen name="Chat" component={ChatScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Help" component={HelpScreen} />
      <RootStack.Screen name="Language" component={LanguageScreen} initialParams={{ mode: 'change' }} />
    </RootStack.Group>
  );
}
