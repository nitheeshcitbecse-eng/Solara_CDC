import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClipboardList, Compass, House, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useSessionSync } from '../api/queries/profile';
import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { AadhaarUploadScreen } from '../screens/user/AadhaarUploadScreen';
import { ApplicationDetailsScreen } from '../screens/user/ApplicationDetailsScreen';
import { AppliedScreen } from '../screens/user/AppliedScreen';
import { ApplyScreen } from '../screens/user/ApplyScreen';
import { ChatScreen } from '../screens/user/ChatScreen';
import { ExploreScreen } from '../screens/user/ExploreScreen';
import { HelpScreen } from '../screens/user/HelpScreen';
import { HomeScreen } from '../screens/user/HomeScreen';
import { JobDetailsScreen } from '../screens/user/JobDetailsScreen';
import { JobHistoryScreen } from '../screens/user/JobHistoryScreen';
import { MessagesScreen } from '../screens/user/MessagesScreen';
import { MyJobsScreen } from '../screens/user/MyJobsScreen';
import { NotificationsScreen } from '../screens/user/NotificationsScreen';
import { ProfileEditScreen } from '../screens/user/ProfileEditScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { SearchScreen } from '../screens/user/SearchScreen';
import { SectorJobsScreen } from '../screens/user/SectorJobsScreen';
import { SettingsScreen } from '../screens/user/SettingsScreen';
import { UserOnboardingAboutScreen } from '../screens/user/UserOnboardingAboutScreen';
import { UserOnboardingEducationScreen } from '../screens/user/UserOnboardingEducationScreen';
import { UserOnboardingWorkScreen } from '../screens/user/UserOnboardingWorkScreen';
import type { UserTabParamList } from '../lib/types/navigation';
import { RootStack } from './rootStack';
import { tabOptions, tabScreenOptions } from './tabBar';

const Tabs = createBottomTabNavigator<UserTabParamList>();

function UserTabs() {
  const { t } = useTranslation();
  // Keeps routing flags (profileComplete, verification, name) in sync with /me.
  useSessionSync();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen name="Home" component={HomeScreen} options={tabOptions(House, t('tabs.home'))} />
      <Tabs.Screen name="Explore" component={ExploreScreen} options={tabOptions(Compass, t('tabs.explore'))} />
      <Tabs.Screen name="Applied" component={AppliedScreen} options={tabOptions(ClipboardList, t('tabs.applied'))} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={tabOptions(UserRound, t('tabs.profile'))} />
    </Tabs.Navigator>
  );
}

/** Job seeker onboarding (signed in, profile incomplete). */
export function userOnboardingScreens(userId: string) {
  return (
    <RootStack.Group key="user-onboarding" navigationKey={`onboarding-${userId}`}>
      <RootStack.Screen name="UserOnboardingAbout" component={UserOnboardingAboutScreen} />
      <RootStack.Screen name="UserOnboardingEducation" component={UserOnboardingEducationScreen} />
      <RootStack.Screen name="UserOnboardingWork" component={UserOnboardingWorkScreen} />
    </RootStack.Group>
  );
}

/** The job seeker app: tabs plus every screen pushed on top of them. */
export function userScreens(userId: string) {
  return (
    <RootStack.Group key="user" navigationKey={`user-${userId}`}>
      <RootStack.Screen name="UserTabs" component={UserTabs} />
      <RootStack.Screen name="SectorJobs" component={SectorJobsScreen} />
      <RootStack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="JobDetails" component={JobDetailsScreen} />
      <RootStack.Screen name="Apply" component={ApplyScreen} />
      <RootStack.Screen name="ApplicationDetails" component={ApplicationDetailsScreen} />
      <RootStack.Screen name="Messages" component={MessagesScreen} />
      <RootStack.Screen name="Chat" component={ChatScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      <RootStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <RootStack.Screen name="AadhaarUpload" component={AadhaarUploadScreen} />
      <RootStack.Screen name="MyJobs" component={MyJobsScreen} />
      <RootStack.Screen name="JobHistory" component={JobHistoryScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Help" component={HelpScreen} />
      <RootStack.Screen name="Language" component={LanguageScreen} initialParams={{ mode: 'change' }} />
    </RootStack.Group>
  );
}
