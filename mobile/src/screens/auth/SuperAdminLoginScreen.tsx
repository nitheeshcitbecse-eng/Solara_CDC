import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useSuperAdminLogin } from '../../api/queries/auth';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { toAppError } from '../../utils/errors';
import { LIMITS, superAdminLoginSchema, type SuperAdminLoginForm } from '../../utils/validation';

/** Owner sign-in, step 1 of 2. Deliberately separate from the phone-OTP flow; there is no sign-up. */
export function SuperAdminLoginScreen({ navigation }: RootScreenProps<'SuperAdminLogin'>) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const login = useSuperAdminLogin();
  const { control, handleSubmit } = useForm<SuperAdminLoginForm>({
    resolver: zodResolver(superAdminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: ({ mfaToken }) => navigation.navigate('SuperAdminTotp', { mfaToken, email: values.email.trim().toLowerCase() }),
    });
  });

  const failureText = login.error
    ? toAppError(login.error).code === 'UNAUTHORIZED'
      ? t('errors.INVALID_CREDENTIALS')
      : errorMessage(login.error)
    : null;

  return (
    <Screen
      header={<Header />}
      footer={<Button label={t('common.continue')} onPress={() => void onSubmit()} loading={login.isPending} />}
    >
      <View style={styles.iconTile}>
        <LockKeyhole size={sizes.iconLg} color={colors.plum} strokeWidth={2} />
      </View>
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('superAdmin.loginTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('superAdmin.loginSubtitle')}
        </Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('superAdmin.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
            maxLength={LIMITS.email}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t('superAdmin.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            maxLength={LIMITS.password}
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      {failureText ? <InlineAlert tone="danger" message={failureText} /> : null}
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
