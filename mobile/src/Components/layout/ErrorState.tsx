import { CloudOff, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { errorMessageKey, toAppError } from '../../utils/errors';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

type ErrorStateProps = { error: unknown; onRetry: () => void };

/** Translated, code-based error message with a retry action. Never shows server text. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const { code } = toAppError(error);
  const Icon = code === 'NETWORK' || code === 'OFFLINE' || code === 'TIMEOUT' ? CloudOff : TriangleAlert;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.iconTile}>
        <Icon size={sizes.iconLg} color={colors.danger} strokeWidth={2} />
      </View>
      <Text variant="heading" align="center">
        {t('states.errorTitle')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {t(errorMessageKey(error))}
      </Text>
      <View style={styles.action}>
        <Button label={t('common.retry')} onPress={onRetry} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
