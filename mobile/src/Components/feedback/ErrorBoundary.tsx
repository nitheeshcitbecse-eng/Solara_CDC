import { RotateCcw, TriangleAlert } from 'lucide-react-native';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Screen } from '../layout/Screen';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

type Props = { children: ReactNode; onReset?: () => void };
type State = { hasError: boolean };

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.iconTile}>
        <TriangleAlert size={sizes.iconLg} color={colors.danger} strokeWidth={2} />
      </View>
      <Text variant="title" align="center">
        {t('states.crashTitle')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {t('states.crashBody')}
      </Text>
      <Button label={t('common.retry')} icon={RotateCcw} onPress={onRetry} />
    </Screen>
  );
}

/**
 * Last line of defence for render errors. Shows a friendly retry screen instead of
 * a red box or a blank app. (Async errors from queries are handled by ErrorState.)
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Only the error name/message in development — never user data, never in production.
    if (__DEV__) console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  private readonly reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) return <CrashScreen onRetry={this.reset} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'stretch', gap: spacing.md },
  iconTile: {
    alignSelf: 'center',
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
