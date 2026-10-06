import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing, type ColorToken } from '../../lib/theme/tokens';
import { Text } from '../ui/Text';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { background: string; foreground: ColorToken; icon: LucideIcon }> = {
  info: { background: colors.surfaceSelected, foreground: 'plum', icon: Info },
  success: { background: colors.successSoft, foreground: 'success', icon: CircleCheck },
  warning: { background: colors.warningSoft, foreground: 'warning', icon: TriangleAlert },
  danger: { background: colors.dangerSoft, foreground: 'danger', icon: CircleAlert },
};

type InlineAlertProps = {
  tone: AlertTone;
  title?: string;
  message: string;
  /** Optional action rendered under the message (e.g. a link-style button). */
  children?: ReactNode;
};

/** A full-width, in-flow message: form errors, verification banners, AI results. */
export function InlineAlert({ tone, title, message, children }: InlineAlertProps) {
  const style = TONES[tone];
  const Icon = style.icon;
  return (
    <View
      style={[styles.box, { backgroundColor: style.background }]}
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
    >
      <Icon size={sizes.icon} color={colors[style.foreground]} strokeWidth={2} />
      <View style={styles.text}>
        {title ? (
          <Text variant="bodyStrong" color={style.foreground}>
            {title}
          </Text>
        ) : null}
        <Text variant="body" color={title ? 'text' : style.foreground}>
          {message}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { flex: 1, gap: spacing.xxs },
});
