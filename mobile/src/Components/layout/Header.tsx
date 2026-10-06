import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../lib/theme/tokens';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  /** Show a back button (defaults to "if there is somewhere to go back to"). */
  back?: boolean;
  /** Override the back action (e.g. go to the previous wizard step). */
  onBack?: () => void;
  right?: ReactNode;
};

/**
 * In-app header. Native headers are turned off so every title uses our fonts
 * (Tamil/Devanagari line heights) and translated labels.
 */
export function Header({ title, subtitle, back, onBack, right }: HeaderProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showBack = back ?? navigation.canGoBack();

  return (
    <View style={styles.container}>
      {showBack ? (
        <IconButton
          icon={ArrowLeft}
          onPress={onBack ?? (() => navigation.goBack())}
          accessibilityLabel={t('a11y.back')}
        />
      ) : null}
      <View style={[styles.titles, showBack ? null : styles.titlesNoBack]}>
        {title ? (
          <Text variant="heading" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  titles: { flex: 1, paddingVertical: spacing.xxs },
  titlesNoBack: { paddingStart: spacing.xs },
  right: { flexDirection: 'row', alignItems: 'center' },
});
