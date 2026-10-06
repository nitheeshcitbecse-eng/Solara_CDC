import { CircleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { en } from '../../lib/i18n/locales/en';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type ValidationKey = keyof typeof en.validation;

function isValidationKey(value: string): value is ValidationKey {
  return value in en.validation;
}

/**
 * Shows a zod error message. Schemas use i18n keys as messages ("validation.phone"),
 * so the text is always in the user's language.
 */
export function FieldError({ message }: { message?: string }) {
  const { t } = useTranslation();
  if (!message) return null;
  const key = message.replace(/^validation\./, '');
  const text = isValidationKey(key) ? t(`validation.${key}`) : t('validation.required');

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <CircleAlert size={sizes.iconSm} color={colors.danger} strokeWidth={2} />
      <Text variant="caption" color="danger" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxs, marginTop: spacing.xxs },
  text: { flex: 1 },
});
