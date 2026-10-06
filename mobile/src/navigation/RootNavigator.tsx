import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SuperAdminLoginScreen } from '../screens/auth/SuperAdminLoginScreen';
import { SuperAdminTotpScreen } from '../screens/auth/SuperAdminTotpScreen';
import { VerifyOtpScreen } from '../screens/auth/VerifyOtpScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { adminOnboardingScreens, adminScreens } from './AdminNavigator';
import { stackScreenOptions } from './navigationTheme';
import { RootStack } from './rootStack';
import { superAdminScreens } from './SuperAdminNavigator';
import { userOnboardingScreens, userScreens } from './UserNavigator';

/**
 * Renders a DIFFERENT set of screens depending on state:
 *   no language     → Language
 *   signed out      → Welcome / sign-in
 *   signed in, profile incomplete → that role's onboarding
 *   signed in, profile complete   → that role's app
 *
 * Signing in or out only changes state; React Navigation then swaps the screen
 * groups. We never navigate "home" manually, so screens from one role (or from a
 * signed-out session) can never stay behind in the back stack.
 */
export function RootNavigator() {
  const { savedLanguage } = useLanguage();
  const { status, user } = useAuth();

  return (
    <RootStack.Navigator screenOptions={stackScreenOptions}>
      {!savedLanguage ? (
        // Distinct navigationKeys matter: every group also has a "Language" route, and without a
        // key change React Navigation would keep the user on it when the group switches.
        <RootStack.Screen name="Language" component={LanguageScreen} initialParams={{ mode: 'initial' }} navigationKey="first-launch" />
      ) : status !== 'signedIn' || !user ? (
        <RootStack.Group key="auth" navigationKey="signed-out">
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="SignIn" component={SignInScreen} />
          <RootStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          <RootStack.Screen name="SuperAdminLogin" component={SuperAdminLoginScreen} />
          <RootStack.Screen name="SuperAdminTotp" component={SuperAdminTotpScreen} />
          <RootStack.Screen name="Language" component={LanguageScreen} initialParams={{ mode: 'change' }} />
        </RootStack.Group>
      ) : user.role === 'superadmin' ? (
        superAdminScreens(user.id)
      ) : user.role === 'admin' ? (
        user.profileComplete ? adminScreens(user.id) : adminOnboardingScreens(user.id)
      ) : user.profileComplete ? (
        userScreens(user.id)
      ) : (
        userOnboardingScreens(user.id)
      )}
    </RootStack.Navigator>
  );
}
