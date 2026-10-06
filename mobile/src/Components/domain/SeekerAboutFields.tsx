import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { LANGUAGES } from '../../lib/i18n/languages';
import { GENDERS } from '../../lib/types/profile';
import { LIMITS, MAX_AGE, MIN_AGE, type AboutForm } from '../../utils/validation';
import { ChipGroup } from '../ui/ChipGroup';
import { DateField } from '../ui/DateField';
import { TextField } from '../ui/TextField';

/** Name, gender, date of birth, email and languages — used by onboarding and profile edit. */
export function SeekerAboutFields({ control }: { control: Control<AboutForm> }) {
  const { t } = useTranslation();
  const thisYear = new Date().getFullYear();

  return (
    <>
      <Controller
        control={control}
        name="fullName"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.fullName')}
            placeholder={t('onboarding.fullNamePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            maxLength={LIMITS.name}
          />
        )}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field, fieldState }) => (
          <ChipGroup
            label={t('onboarding.gender')}
            options={GENDERS.map((gender) => ({ value: gender, label: t(`enums.gender.${gender}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field, fieldState }) => (
          <DateField
            mode="date"
            label={t('onboarding.dob')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            minYear={thisYear - MAX_AGE}
            maxYear={thisYear - MIN_AGE}
            defaultValue={`${thisYear - 25}-01-01`}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.email')}
            hint={t('onboarding.emailHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={LIMITS.email}
            optional
          />
        )}
      />
      <Controller
        control={control}
        name="languagesKnown"
        render={({ field, fieldState }) => (
          <ChipGroup
            multiple
            label={t('onboarding.languages')}
            hint={t('onboarding.languagesHint')}
            options={LANGUAGES.map((language) => ({ value: language.code, label: language.nativeName }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}
