import { Eye, EyeOff } from 'lucide-react-native';
import { useState, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors, MAX_FONT_SCALE, MIN_TOUCH, radius, sizes, spacing } from '../../lib/theme/tokens';
import { getTextStyle } from '../../lib/theme/typography';
import { FieldError } from './FieldError';
import { Text } from './Text';

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  error?: string;
  hint?: string;
  /** Fixed text before the input, e.g. "+91". */
  prefix?: string;
  /** Element after the input, e.g. a search icon. */
  right?: ReactNode;
  showCounter?: boolean;
  optional?: boolean;
  ref?: Ref<TextInput>;
};

export function TextField({
  label,
  error,
  hint,
  prefix,
  right,
  showCounter = false,
  optional = false,
  multiline = false,
  secureTextEntry = false,
  maxLength,
  value,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: TextFieldProps) {
  const { t } = useTranslation();
  const { script } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const typography = getTextStyle('body', script);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="label" color="textMuted" style={styles.label}>
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" color="textSubtle">
            {t('common.optional')}
          </Text>
        ) : null}
      </View>
      <View style={[styles.field, multiline ? styles.multiline : null, { borderColor }]}>
        {prefix ? (
          <Text variant="bodyStrong" color="textMuted" latin style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !revealed}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          accessibilityHint={hint}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            { fontFamily: typography.fontFamily, fontSize: typography.fontSize, color: colors.text },
            // Single-line inputs size themselves; a lineHeight there misaligns text on iOS.
            multiline ? { lineHeight: typography.lineHeight } : null,
          ]}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('superAdmin.hidePassword') : t('superAdmin.showPassword')}
            style={styles.reveal}
          >
            {revealed ? (
              <EyeOff size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <Eye size={sizes.icon} color={colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
        {right}
      </View>
      <View style={styles.footer}>
        <View style={styles.footerMain}>
          {error ? (
            <FieldError message={error} />
          ) : hint ? (
            <Text variant="caption" color="textSubtle">
              {hint}
            </Text>
          ) : null}
        </View>
        {showCounter && maxLength ? (
          <Text variant="caption" color="textSubtle" latin>
            {`${value?.length ?? 0}/${maxLength}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  label: { flexShrink: 1 },
  field: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  multiline: { minHeight: sizes.textAreaMin, alignItems: 'flex-start', paddingVertical: spacing.sm },
  prefix: { paddingEnd: spacing.xxs },
  input: { flex: 1, paddingVertical: spacing.sm },
  reveal: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', marginEnd: -spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  footerMain: { flex: 1 },
});
