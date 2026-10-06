import { LocateFixed } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCurrentAddress } from '../../lib/hooks/useCurrentAddress';
import { INDIAN_STATES } from '../../utils/india';
import { LIMITS, type HirerDetailsForm } from '../../utils/validation';
import { InlineAlert, type AlertTone } from '../feedback/InlineAlert';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';

type HirerDetailsFieldsProps = {
  control: Control<HirerDetailsForm>;
  setValue: UseFormSetValue<HirerDetailsForm>;
};

/** Name, business name (not for households), address and optional GSTIN. */
export function HirerDetailsFields({ control, setValue }: HirerDetailsFieldsProps) {
  const { t } = useTranslation();
  const hirerType = useWatch({ control, name: 'hirerType' });
  const { locate, locating, permissionSheet } = useCurrentAddress();
  const [notice, setNotice] = useState<{ tone: AlertTone; message: string } | null>(null);

  const fillFromLocation = async () => {
    const result = await locate();
    if (result.status !== 'ok') {
      setNotice(result.status === 'failed' ? { tone: 'warning', message: t('onboarding.locationFailed') } : null);
      return;
    }
    const options = { shouldDirty: true, shouldValidate: true } as const;
    const { address } = result;
    if (address.street) setValue('line1', address.street.slice(0, LIMITS.address), options);
    if (address.city) setValue('city', address.city, options);
    if (address.state) setValue('state', address.state, options);
    if (address.pincode) setValue('pincode', address.pincode, options);
    setNotice({ tone: 'success', message: t('onboarding.locationFilled') });
  };

  return (
    <>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('hirer.name')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={LIMITS.name}
          />
        )}
      />
      {hirerType !== 'individual' ? (
        <Controller
          control={control}
          name="businessName"
          render={({ field, fieldState }) => (
            <TextField
              label={hirerType === 'agency' ? t('hirer.agencyName') : t('hirer.businessName')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              maxLength={LIMITS.businessName}
            />
          )}
        />
      ) : null}
      <Button
        label={locating ? t('onboarding.locating') : t('onboarding.useLocation')}
        icon={LocateFixed}
        variant="secondary"
        onPress={() => void fillFromLocation()}
        loading={locating}
      />
      {notice ? <InlineAlert tone={notice.tone} message={notice.message} /> : null}
      <Controller
        control={control}
        name="line1"
        render={({ field, fieldState }) => (
          <TextField
            label={t('hirer.address')}
            placeholder={t('hirer.addressPlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.address}
            textContentType="streetAddressLine1"
          />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.city')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.place}
            autoCapitalize="words"
          />
        )}
      />
      <Controller
        control={control}
        name="state"
        render={({ field, fieldState }) => (
          <Select
            label={t('onboarding.state')}
            value={field.value || null}
            options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="pincode"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.pincode')}
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
          />
        )}
      />
      <Controller
        control={control}
        name="gstin"
        render={({ field, fieldState }) => (
          <TextField
            label={t('hirer.gstin')}
            hint={t('hirer.gstinHint')}
            value={field.value}
            onChangeText={(text) => field.onChange(text.toUpperCase())}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="characters"
            maxLength={15}
            optional
          />
        )}
      />
      {permissionSheet}
    </>
  );
}
