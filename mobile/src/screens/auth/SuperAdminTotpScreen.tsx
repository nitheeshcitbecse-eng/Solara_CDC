import { ShieldCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { OtpInput } from '../../Components/ui/OtpInput';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useSuperAdminTotp } from '../../api/queries/auth';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { toAppError } from '../../utils/errors';
import { otpCodeSchema } from '../../utils/validation';

/** Owner sign-in, step 2 of 2: the 6-digit code from an authenticator app. */
export function SuperAdminTotpScreen({ navigation, route }: RootScreenProps<'SuperAdminTotp'>) {
  const { mfaToken, email } = route.params;
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { completeSignIn } = useAuthActions();
  const totp = useSuperAdminTotp();
  const [code, setCode] = useState('');

  const submit = useCallback(
    (value: string) => {
      if (!otpCodeSchema.safeParse(value).success || totp.isPending) return;
      totp.mutate(
        { mfaToken, code: value },
        {
          onSuccess: (auth) => void completeSignIn(auth),
          onError: () => setCode(''),
        },
      );
    },
    [totp, mfaToken, completeSignIn],
  );

  // An expired MFA token can't be retried: the owner must start again from the password step.
  const expired = totp.error ? toAppError(totp.error).code === 'OTP_EXPIRED' : false;

  return (
    <Screen
      header={<Header />}
      footer={
        expired ? (
          <Button label={t('common.back')} variant="secondary" onPress={() => navigation.goBack()} />
        ) : (
          <Button label={t('superAdmin.verify')} onPress={() => submit(code)} loading={totp.isPending} disabled={code.length !== 6} />
        )
      }
    >
      <View style={styles.iconTile}>
        <ShieldCheck size={sizes.iconLg} color={colors.plum} strokeWidth={2} />
      </View>
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('superAdmin.totpTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('superAdmin.totpSubtitle', { email })}
        </Text>
      </View>
      <OtpInput
        value={code}
        onChange={(value) => {
          if (totp.isError) totp.reset();
          setCode(value);
        }}
        onComplete={submit}
        hasError={totp.isError}
        disabled={totp.isPending || expired}
      />
      {totp.error ? <InlineAlert tone="danger" message={errorMessage(totp.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { gap: spacing.xs },
});
