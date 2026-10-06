import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnline } from '../../lib/hooks/useOnline';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

/**
 * Rendered above the navigator. It occupies the status-bar area itself, so the
 * screens' SafeAreaViews (which only pad where they overlap the unsafe area)
 * don't add a second top inset while it's visible.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <WifiOff size={sizes.iconSm} color={colors.warning} strokeWidth={2} />
      <Text variant="label" color="warning" style={styles.text}>
        {t('states.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  text: { flex: 1 },
});
