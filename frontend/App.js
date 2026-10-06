import React, { useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "./src/context/AuthContext";
import { InternetProvider, InternetContext } from "./src/context/InternetContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import NoInternetModal from "./src/Components/NoInternetScreen";
import ServerWakeBanner from "./src/Components/ServerWakeBanner";
import LoadingScreen from "./src/Components/LoadingScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import colors from "./src/colors";

function AppContent() {
  const { isConnected } = useContext(InternetContext);

  return (
    <>
      <StatusBar style="dark" />

      {/* Main App Navigation — kept above the phone's navigation buttons / gesture bar.
          Screens handle the keyboard themselves (KeyboardAwareScrollView), so there is no
          app-wide KeyboardAvoidingView: nesting them makes inputs jump while typing. */}
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <AppNavigator />
      </SafeAreaView>

      {/* "Connecting to the server…" while a sleeping free server wakes up */}
      <ServerWakeBanner />

      {/* Global No Internet Overlay */}
      <NoInternetModal visible={!isConnected} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // If a font fails to load the app still starts with the system font.
  if (!fontsLoaded && !fontError) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <InternetProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
        </InternetProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
