import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { Button } from '../../Components/ui/Button';
import { ChipGroup } from '../../Components/ui/ChipGroup';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useToast } from '../../context/ToastContext';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../api/queries/superadmin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import { LANGUAGES } from '../../lib/i18n/languages';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { PlatformSettings } from '../../lib/types/superadmin';
import { platformSettingsSchema, type PlatformSettingsForm } from '../../utils/validation';

type NumberField = Exclude<keyof PlatformSettingsForm, 'enabledLanguages'>;

const EMPTY: PlatformSettingsForm = {
  sectorMatchThreshold: '',
  sectorReviewThreshold: '',
  photoSafetyThreshold: '',
  authenticityThreshold: '',
  maxRequestsPerHour: '',
  resendAfterSec: '',
  expirySec: '',
  enabledLanguages: ['en'],
};

function toForm(settings: PlatformSettings): PlatformSettingsForm {
  return {
    sectorMatchThreshold: String(settings.ai.sectorMatchThreshold),
    sectorReviewThreshold: String(settings.ai.sectorReviewThreshold),
    photoSafetyThreshold: String(settings.ai.photoSafetyThreshold),
    authenticityThreshold: String(settings.ai.authenticityThreshold),
    maxRequestsPerHour: String(settings.otp.maxRequestsPerHour),
    resendAfterSec: String(settings.otp.resendAfterSec),
    expirySec: String(settings.otp.expirySec),
    enabledLanguages: settings.enabledLanguages,
  };
}

function NumberInput({ control, name, label, hint, decimal }: { control: Control<PlatformSettingsForm>; name: NumberField; label: string; hint: string; decimal?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          hint={hint}
          value={field.value}
          onChangeText={(text) => field.onChange(text.replace(decimal ? /[^\d.]/g : /\D/g, ''))}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          maxLength={decimal ? 4 : 3}
        />
      )}
    />
  );
}

/** AI confidence thresholds, OTP limits and enabled languages. Changes are audit-logged. */
export function PlatformSettingsScreen(_props: RootScreenProps<'PlatformSettings'>) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const settings = usePlatformSettings();
  const update = useUpdatePlatformSettings();
  const { control, handleSubmit, reset, formState } = useForm<PlatformSettingsForm>({
    resolver: zodResolver(platformSettingsSchema),
    // Explicit defaults: `values` is applied after the first render, and list fields must never be undefined.
    defaultValues: EMPTY,
    values: settings.data ? toForm(settings.data) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !update.isPending);

  const save = handleSubmit((values) => {
    update.mutate(
      {
        ai: {
          sectorMatchThreshold: Number(values.sectorMatchThreshold),
          sectorReviewThreshold: Number(values.sectorReviewThreshold),
          photoSafetyThreshold: Number(values.photoSafetyThreshold),
          authenticityThreshold: Number(values.authenticityThreshold),
        },
        otp: {
          maxRequestsPerHour: Number(values.maxRequestsPerHour),
          resendAfterSec: Number(values.resendAfterSec),
          expirySec: Number(values.expirySec),
        },
        enabledLanguages: values.enabledLanguages,
      },
      {
        onSuccess: (updated) => {
          reset(toForm(updated));
          showToast(t('superadmin.settingsSaved'), 'success');
        },
      },
    );
  });

  if (settings.isPending || settings.isError) {
    return (
      <Screen header={<Header title={t('superadmin.platformSettings')} />}>
        {settings.isPending ? <ScreenSkeleton /> : <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />}
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('superadmin.platformSettings')} />}
      footer={<Button label={t('common.saveChanges')} onPress={() => void save()} loading={update.isPending} disabled={!formState.isDirty} />}
    >
      <Section title={t('superadmin.aiThresholds')}>
        <Text variant="caption" color="textMuted">
          {t('superadmin.aiThresholdsHint')}
        </Text>
        <View style={styles.fields}>
          <NumberInput control={control} name="sectorMatchThreshold" label={t('superadmin.sectorMatch')} hint={t('superadmin.sectorMatchHint')} decimal />
          <NumberInput control={control} name="sectorReviewThreshold" label={t('superadmin.sectorReview')} hint={t('superadmin.sectorReviewHint')} decimal />
          <NumberInput control={control} name="photoSafetyThreshold" label={t('superadmin.photoSafety')} hint={t('superadmin.photoSafetyHint')} decimal />
          <NumberInput control={control} name="authenticityThreshold" label={t('superadmin.authenticity')} hint={t('superadmin.authenticityHint')} decimal />
        </View>
      </Section>
      <Section title={t('superadmin.otpLimits')}>
        <View style={styles.fields}>
          <NumberInput control={control} name="maxRequestsPerHour" label={t('superadmin.otpPerHour')} hint={t('superadmin.otpPerHourHint')} />
          <NumberInput control={control} name="resendAfterSec" label={t('superadmin.otpResend')} hint={t('superadmin.otpResendHint')} />
          <NumberInput control={control} name="expirySec" label={t('superadmin.otpExpiry')} hint={t('superadmin.otpExpiryHint')} />
        </View>
      </Section>
      <Section title={t('superadmin.languages')}>
        <Controller
          control={control}
          name="enabledLanguages"
          render={({ field, fieldState }) => (
            <ChipGroup
              multiple
              hint={t('superadmin.languagesHint')}
              options={LANGUAGES.map((language) => ({ value: language.code, label: language.nativeName }))}
              // English is the fallback for every other language, so it always stays enabled.
              value={field.value}
              onChange={(next) => field.onChange(next.includes('en') ? next : ['en', ...next])}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>
      {update.error ? <InlineAlert tone="danger" message={errorMessage(update.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
});
