import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import LoadingScreen from "../Components/LoadingScreen";

// Common Screens
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ChooseTierScreen from "../screens/ChooseTierScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import UserScreen from "../screens/UserScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import ChatScreen from "../screens/ChatScreen";
import HelpScreen from "../screens/HelpScreen";

// Onboarding Screens (shown until the profile is complete)
import QuickSetupScreen from "../screens/QuickSetupScreen";
import PremiumSeekerSetupScreen from "../screens/Seeker/PremiumSeekerSetupScreen";
import PremiumHirerSetupScreen from "../screens/Hirer/PremiumHirerSetupScreen";

// Seeker Screens
import FindJobsScreen from "../screens/Seeker/FindJobsScreen";
import JobDetailsScreen from "../screens/Seeker/FindJobs/JobDetailsScreen";
import ApplyJobScreen from "../screens/Seeker/FindJobs/ApplyJobScreen";
import SavedJobsScreen from "../screens/Seeker/SavedJobsScreen";
import MyApplicationsScreen from "../screens/Seeker/MyApplicationsScreen";
import ApplicationDetailsScreen from "../screens/Seeker/MyApplications/ApplicationDetailsScreen";

// Hirer Screens
import VerificationScreen from "../screens/VerificationScreen";
import ManageJobsScreen from "../screens/Hirer/ManageJobsScreen";
import AddJobScreen from "../screens/Hirer/ManageJobs/AddJobScreen";
import ViewJobsScreen from "../screens/Hirer/ManageJobs/ViewJobsScreen";
import CloseJobScreen from "../screens/Hirer/ManageJobs/CloseJobScreen";
import JobApplicantsScreen from "../screens/Hirer/ManageJobs/JobApplicantsScreen";
import ApplicantDetailsScreen from "../screens/Hirer/ManageJobs/ApplicantDetailsScreen";

// Admin Screens
import ManageUsersScreen from "../screens/Admin/ManageUsersScreen";
import ViewUsersScreen from "../screens/Admin/ManageUsers/ViewUsersScreen";
import UserDetailsScreen from "../screens/Admin/ManageUsers/UserDetailsScreen";
import VerifyUsersScreen from "../screens/Admin/ManageUsers/VerifyUsersScreen";
import ManageSectorsScreen from "../screens/Admin/ManageSectorsScreen";
import AddSectorScreen from "../screens/Admin/ManageSectors/AddSectorScreen";
import ViewSectorsScreen from "../screens/Admin/ManageSectors/ViewSectorsScreen";
import RemoveSectorScreen from "../screens/Admin/ManageSectors/RemoveSectorScreen";
import ModerateJobsScreen from "../screens/Admin/ModerateJobsScreen";
import ReviewJobsScreen from "../screens/Admin/ModerateJobs/ReviewJobsScreen";
import ViewAllJobsScreen from "../screens/Admin/ModerateJobs/ViewAllJobsScreen";
import TakeDownJobsScreen from "../screens/Admin/ModerateJobs/TakeDownJobsScreen";
import ReportsScreen from "../screens/Admin/ReportsScreen";
import ShortlistApprovalsScreen from "../screens/Admin/ShortlistApprovalsScreen";
import AuditLogsScreen from "../screens/Admin/AuditLogsScreen";
import ManageAdminsScreen from "../screens/Admin/ManageAdminsScreen";

const Stack = createNativeStackNavigator();

// Normal users get one short screen (photo + Aadhaar); premium users a detailed wizard.
const setupScreenFor = (user) => {
  if (user.tier !== "premium") return { name: "QuickSetupScreen", component: QuickSetupScreen };
  return user.role === "hirer"
    ? { name: "PremiumHirerSetupScreen", component: PremiumHirerSetupScreen }
    : { name: "PremiumSeekerSetupScreen", component: PremiumSeekerSetupScreen };
};

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {!user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ChooseTier" component={ChooseTierScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : !user.onboarded ? (
          <Stack.Screen {...setupScreenFor(user)} />
        ) : (
          <>
            {/* Main user home */}
            <Stack.Screen name="UserScreen" component={UserScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
            <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
            <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
            <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="HelpScreen" component={HelpScreen} />

            {/* Seeker Screens */}
            <Stack.Screen name="FindJobsScreen" component={FindJobsScreen} />
            <Stack.Screen name="JobDetailsScreen" component={JobDetailsScreen} />
            <Stack.Screen name="ApplyJobScreen" component={ApplyJobScreen} />
            <Stack.Screen name="SavedJobsScreen" component={SavedJobsScreen} />
            <Stack.Screen name="MyApplicationsScreen" component={MyApplicationsScreen} />
            <Stack.Screen name="ApplicationDetailsScreen" component={ApplicationDetailsScreen} />

            {/* Hirer Screens */}
            <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
            <Stack.Screen name="ManageJobsScreen" component={ManageJobsScreen} />
            <Stack.Screen name="AddJobScreen" component={AddJobScreen} />
            <Stack.Screen name="ViewJobsScreen" component={ViewJobsScreen} />
            <Stack.Screen name="CloseJobScreen" component={CloseJobScreen} />
            <Stack.Screen name="JobApplicantsScreen" component={JobApplicantsScreen} />
            <Stack.Screen name="ApplicantDetailsScreen" component={ApplicantDetailsScreen} />

            {/* Admin Screens */}
            <Stack.Screen name="ManageUsersScreen" component={ManageUsersScreen} />
            <Stack.Screen name="ViewUsersScreen" component={ViewUsersScreen} />
            <Stack.Screen name="UserDetailsScreen" component={UserDetailsScreen} />
            <Stack.Screen name="VerifyUsersScreen" component={VerifyUsersScreen} />
            <Stack.Screen name="ManageSectorsScreen" component={ManageSectorsScreen} />
            <Stack.Screen name="AddSectorScreen" component={AddSectorScreen} />
            <Stack.Screen name="ViewSectorsScreen" component={ViewSectorsScreen} />
            <Stack.Screen name="RemoveSectorScreen" component={RemoveSectorScreen} />
            <Stack.Screen name="ModerateJobsScreen" component={ModerateJobsScreen} />
            <Stack.Screen name="ReviewJobsScreen" component={ReviewJobsScreen} />
            <Stack.Screen name="ViewAllJobsScreen" component={ViewAllJobsScreen} />
            <Stack.Screen name="TakeDownJobsScreen" component={TakeDownJobsScreen} />
            <Stack.Screen name="ShortlistApprovalsScreen" component={ShortlistApprovalsScreen} />
            <Stack.Screen name="ReportsScreen" component={ReportsScreen} />
            <Stack.Screen name="AuditLogsScreen" component={AuditLogsScreen} />
            <Stack.Screen name="ManageAdminsScreen" component={ManageAdminsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
