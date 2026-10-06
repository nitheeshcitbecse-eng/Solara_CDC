import { LocateFixed } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCurrentAddress } from '../../lib/hooks/useCurrentAddress';
import { QUALIFICATIONS } from '../../lib/types/profile';
import { INDIAN_STATES } from '../../utils/india';
import { LIMITS, type EducationForm } from '../../utils/validation';
import { InlineAlert, type AlertTone } from '../feedback/InlineAlert';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';

type SeekerEducationFieldsProps = {
  control: Control<EducationForm>;
  setValue: UseFormSetValue<EducationForm>;
};

/** Qualification + address, with a one-tap "use my current location" fill. */
export function SeekerEducationFields({ control, setValue }: SeekerEducationFieldsProps) {
  const { t } = useTranslation();
  const { locate, locating, permissionSheet } = useCurrentAddress();
  const [notice, setNotice] = useState<{ tone: AlertTone; message: string } | null>(null);

  const fillFromLocation = async () => {
    const result = await locate();
    if (result.status !== 'ok') {
      setNotice(result.status === 'failed' ? { tone: 'warning', message: t('onboarding.locationFailed') } : null);
      return;
    }
    const { address } = result;
    const options = { shouldDirty: true, shouldValidate: true } as const;
    if (address.state) setValue('state', address.state, options);
    if (address.district) setValue('district', address.district, options);
    if (address.city) setValue('city', address.city, options);
    if (address.pincode) setValue('pincode', address.pincode, options);
    setNotice({ tone: 'success', message: t('onboarding.locationFilled') });
  };

  return (
    <>
      <Controller
        control={control}
        name="qualification"
        render={({ field, fieldState }) => (
          <Select
            label={t('onboarding.qualification')}
            value={field.value}
            options={QUALIFICATIONS.map((value) => ({ value, label: t(`enums.qualification.${value}`) }))}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
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
        name="district"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.district')}
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
            textContentType="addressCity"
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
            textContentType="postalCode"
            autoComplete="postal-code"
          />
        )}
      />
      {permissionSheet}
    </>
  );
}
