import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { SignUpRole } from './auth';
import type { ModerationItem, Report } from './superadmin';

/**
 * One root native stack renders a different *group* of screens depending on the
 * session (see RootNavigator). Screens that both job seekers and hirers use
 * (Messages, Chat, Settings…) share a route name; only one group exists at a time.
 */
export type RootStackParamList = {
  // Language selection (first launch, or changed later)
  Language: { mode: 'initial' | 'change' } | undefined;

  // Signed out
  Welcome: undefined;
  SignIn: { role: SignUpRole };
  VerifyOtp: { phone: string; role: SignUpRole; requestId: string; resendAfterSec: number };
  SuperAdminLogin: undefined;
  SuperAdminTotp: { mfaToken: string; email: string };

  // Job seeker onboarding
  UserOnboardingAbout: undefined;
  UserOnboardingEducation: undefined;
  UserOnboardingWork: undefined;

  // Hirer onboarding
  AdminOnboardingType: undefined;
  AdminOnboardingDetails: undefined;
  AdminOnboardingAadhaar: undefined;

  // Shared by job seeker + hirer
  Messages: undefined;
  Chat: { conversationId: string; title: string };
  Notifications: undefined;
  Settings: undefined;
  Help: undefined;
  AadhaarUpload: undefined;
  VerificationStatus: undefined;

  // Job seeker
  UserTabs: NavigatorScreenParams<UserTabParamList> | undefined;
  SectorJobs: { sectorId: string; sectorName: string; sectorSlug: string };
  Search: { q?: string } | undefined;
  JobDetails: { jobId: string };
  Apply: { jobId: string };
  ApplicationDetails: { applicationId: string };
  ProfileEdit: { section: 'about' | 'education' | 'work' };
  MyJobs: undefined;
  JobHistory: undefined;

  // Hirer
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  AddWork: { jobId?: string } | undefined;
  JobManage: { jobId: string };
  JobApplicants: { jobId: string; jobTitle: string };
  ApplicantDetail: { applicationId: string };
  AdminProfileEdit: undefined;

  // Superadmin
  SuperAdminTabs: NavigatorScreenParams<SuperAdminTabParamList> | undefined;
  UserDetail: { userId: string };
  DocumentViewer: { documentId: string; title: string };
  ModerationDetail: { item: ModerationItem };
  SuperJobs: undefined;
  SuperJobDetail: { jobId: string };
  Reports: undefined;
  ReportDetail: { report: Report };
  AuditLogs: undefined;
  PlatformSettings: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Explore: undefined;
  Applied: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  AdminJobs: undefined;
  Applicants: undefined;
  AdminProfile: undefined;
};

export type SuperAdminTabParamList = {
  Overview: undefined;
  Users: undefined;
  Moderation: undefined;
  More: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type UserTabScreenProps<T extends keyof UserTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type AdminTabScreenProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type SuperAdminTabScreenProps<T extends keyof SuperAdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<SuperAdminTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Lets `useNavigation()` without generics know every route in the app.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- interface merging is how React Navigation reads the param list.
    interface RootParamList extends RootStackParamList {}
  }
}
