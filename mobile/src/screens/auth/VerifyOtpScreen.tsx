import { PencilLine, ShieldCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { OtpInput } from '../../Components/ui/OtpInput';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useRequestOtp, useVerifyOtp } from '../../api/queries/auth';
import { useCountdown } from '../../lib/hooks/useCountdown';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, MIN_TOUCH, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { toAppError } from '../../utils/errors';
import { formatPhone } from '../../utils/format';
import { otpCodeSchema } from '../../utils/validation';

const CODE_LENGTH = 6;

export function VerifyOtpScreen({ navigation, route }: RootScreenProps<'VerifyOtp'>) {
  const { phone, role } = route.params;
  const { t } = useTranslation();
  const { completeSignIn } = useAuthActions();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const verify = useVerifyOtp();
  const resend = useRequestOtp();
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState(route.params.requestId);
  const { remaining, restart } = useCountdown(route.params.resendAfterSec);

  const submit = useCallback(
    (value: string) => {
      if (!otpCodeSchema.safeParse(value).success || verify.isPending) return;
      verify.mutate(
        { requestId, phone, code: value },
        {
          // The navigator switches to onboarding or the home tabs on its own.
          onSuccess: (auth) => void completeSignIn(auth),
          onError: (error) => {
            if (toAppError(error).code === 'OTP_INVALID') setCode('');
          },
        },
      );
    },
    [verify, requestId, phone, completeSignIn],
  );

  const onResend = () => {
    resend.mutate(
      { phone: phone.slice(-10), role },
      {
        onSuccess: (response) => {
          setRequestId(response.requestId);
          setCode('');
          verify.reset();
          restart(response.resendAfterSec);
          showToast(t('verifyOtp.resent'), 'success');
        },
      },
    );
  };

  const failure = verify.error ?? resend.error;

  return (
    <Screen
      header={<Header />}
      footer={
        <Button
          label={t('verifyOtp.verify')}
          onPress={() => submit(code)}
          loading={verify.isPending}
          disabled={code.length !== CODE_LENGTH}
        />
      }
    >
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('verifyOtp.title')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('verifyOtp.subtitle', { phone: formatPhone(phone) })}
        </Text>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.link} hitSlop={spacing.xs}>
          <PencilLine size={sizes.iconSm} color={colors.primary} strokeWidth={2} />
          <Text variant="label" color="primary">
            {t('verifyOtp.editNumber')}
          </Text>
        </Pressable>
      </View>

      <OtpInput
        value={code}
        onChange={(value) => {
          if (verify.isError) verify.reset();
          setCode(value);
        }}
        onComplete={submit}
        hasError={verify.isError}
        disabled={verify.isPending}
      />

      {failure ? <InlineAlert tone="danger" message={errorMessage(failure)} /> : null}

      <View style={styles.resendRow}>
        {remaining > 0 ? (
          <Text variant="body" color="textMuted" accessibilityLiveRegion="polite">
            {t('verifyOtp.resendIn', { seconds: remaining })}
          </Text>
        ) : (
          <Pressable
            onPress={onResend}
            disabled={resend.isPending}
            accessibilityRole="button"
            style={styles.link}
            hitSlop={spacing.xs}
          >
            <Text variant="bodyStrong" color="primary">
              {t('verifyOtp.resend')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.privacy}>
        <ShieldCheck size={sizes.icon} color={colors.success} strokeWidth={2} />
        <Text variant="caption" color="textMuted" style={styles.privacyText}>
          {t('verifyOtp.privacy')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: MIN_TOUCH, alignSelf: 'flex-start' },
  resendRow: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  privacyText: { flex: 1 },
});
