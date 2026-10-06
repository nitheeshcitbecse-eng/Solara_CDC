import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './Components/feedback/ErrorBoundary';
import { OfflineBanner } from './Components/feedback/OfflineBanner';
import { ToastHost } from './Components/feedback/ToastHost';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { navigationTheme } from './navigation/navigationTheme';
import { RootNavigator } from './navigation/RootNavigator';
import { queryClient, setupQueryManagers } from './lib/queryClient';
import { colors } from './lib/theme/tokens';
import { fontAssets } from './lib/theme/typography';

// Keep the native splash (plum background) up until fonts, language and session are ready,
// so users never see unstyled text or a flash of the wrong screen.
void SplashScreen.preventAutoHideAsync();
// Splash options need a development/production build; Expo Go ignores them with a warning.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ fade: true, duration: 250 });
}

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { hydrated } = useLanguage();
  const { status } = useAuth();
  const ready = fontsReady && hydrated && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <ErrorBoundary onReset={() => void queryClient.resetQueries()}>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
      <ToastHost />
    </View>
  );
}

export function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => setupQueryManagers(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              {/* If a font fails to load we still start; text falls back to the system font. */}
              <AppShell fontsReady={fontsLoaded || fontError !== null} />
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
