import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import { Text } from './Text';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Fires once when the 6th digit is entered (auto-submit). */
  onComplete?: (code: string) => void;
  length?: number;
  hasError?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
};

/**
 * Six visible boxes over ONE hidden TextInput. A single input (instead of six) is
 * what makes SMS autofill work: iOS `oneTimeCode` and Android `sms-otp` fill the
 * whole code into one field, and paste/backspace behave naturally.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  hasError = false,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const { t } = useTranslation();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const completedFor = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.(value);
    }
    if (value.length < length) completedFor.current = null;
  }, [value, length, onComplete]);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel={t('verifyOtp.codeLabel')}
      style={styles.row}
    >
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        const active = focused && index === Math.min(value.length, length - 1);
        return (
          <View
            key={index}
            style={[
              styles.box,
              active ? styles.boxActive : null,
              hasError ? styles.boxError : null,
            ]}
            accessibilityLabel={t('a11y.otpDigit', { index: index + 1 })}
          >
            <Text variant="title" latin>
              {digit}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={t('verifyOtp.codeLabel')}
        testID="otp-input"
        // Kept on top of the boxes but invisible, so taps and long-press paste land on it.
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  box: {
    flex: 1,
    minHeight: sizes.otpBox + spacing.sm,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary, borderWidth: sizes.focusRing },
  boxError: { borderColor: colors.danger },
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0, color: 'transparent' },
});
