import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquareText } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { Divider } from '../../Components/ui/Divider';
import { GoogleMark } from '../../Components/ui/GoogleMark';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useAuth, useAuthActions } from '../../context/AuthContext';
import { useGoogleSignIn, useRequestOtp } from '../../api/queries/auth';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { googleSignInMode } from '../../lib/googleSignIn';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { toE164 } from '../../utils/format';
import { phoneSchema, type PhoneForm } from '../../utils/validation';

export function SignInScreen({ navigation, route }: RootScreenProps<'SignIn'>) {
  const { role } = route.params;
  const { t } = useTranslation();
  const { sessionExpired } = useAuth();
  const { completeSignIn } = useAuthActions();
  const errorMessage = useErrorMessage();
  const requestOtp = useRequestOtp();
  const google = useGoogleSignIn();
  const googleMode = googleSignInMode();

  const { control, handleSubmit } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = handleSubmit(({ phone }) => {
    requestOtp.mutate(
      { phone, role },
      {
        onSuccess: (response) =>
          navigation.navigate('VerifyOtp', {
            phone: toE164(phone),
            role,
            requestId: response.requestId,
            resendAfterSec: response.resendAfterSec,
          }),
      },
    );
  });

  const onGoogle = () => {
    google.mutate(role, {
      onSuccess: (auth) => {
        // null = the user closed the Google sheet; nothing to do.
        if (auth) void completeSignIn(auth);
      },
    });
  };

  const failure = requestOtp.error ?? google.error;

  return (
    <Screen header={<Header />}>
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {role === 'admin' ? t('signIn.titleAdmin') : t('signIn.titleUser')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('signIn.subtitle')}
        </Text>
      </View>

      {sessionExpired ? <InlineAlert tone="info" message={t('errors.UNAUTHORIZED')} /> : null}

      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('signIn.phoneLabel')}
            prefix="+91"
            placeholder={t('signIn.phonePlaceholder')}
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="phone-pad"
            inputMode="tel"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
            autoFocus
          />
        )}
      />

      {failure ? <InlineAlert tone="danger" message={errorMessage(failure)} /> : null}

      <Button
        label={t('signIn.getOtp')}
        icon={MessageSquareText}
        onPress={() => void onSubmit()}
        loading={requestOtp.isPending}
      />

      {googleMode === 'unavailable' ? null : (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine}>
              <Divider />
            </View>
            <Text variant="caption" color="textSubtle">
              {t('signIn.or')}
            </Text>
            <View style={styles.dividerLine}>
              <Divider />
            </View>
          </View>
          <Button
            label={t('signIn.google')}
            variant="secondary"
            leading={<GoogleMark />}
            onPress={onGoogle}
            loading={google.isPending}
          />
          {googleMode === 'mock' ? (
            <Text variant="caption" color="textSubtle" align="center">
              {t('signIn.googleDemo')}
            </Text>
          ) : null}
        </>
      )}

      <View style={styles.spacer} />
      <Text variant="caption" color="textSubtle" align="center">
        {t('signIn.terms')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xs },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1 },
  spacer: { flex: 1 },
});
