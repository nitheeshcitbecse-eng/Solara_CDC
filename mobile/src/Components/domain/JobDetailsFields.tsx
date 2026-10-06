import { Controller, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LANGUAGES } from '../../lib/i18n/languages';
import { spacing } from '../../lib/theme/tokens';
import { SALARY_TYPES, SHIFTS } from '../../lib/types/jobs';
import { formatRupees } from '../../utils/format';
import { INDIAN_STATES } from '../../utils/india';
import { LIMITS, SALARY_RANGES, type JobDetailsForm } from '../../utils/validation';
import { Section } from '../layout/Section';
import { ChipGroup } from '../ui/ChipGroup';
import { DateField } from '../ui/DateField';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';
import { SkillsInput } from './SkillsInput';

/** Every field of a job post (Add work step 2 and Job manage → Edit). */
export function JobDetailsFields({ control }: { control: Control<JobDetailsForm> }) {
  const { t } = useTranslation();
  const salaryType = useWatch({ control, name: 'salaryType' });
  const range = SALARY_RANGES[salaryType];

  return (
    <>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label={t('addWork.jobTitle')}
            placeholder={t('addWork.jobTitlePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.jobTitle}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label={t('addWork.description')}
            hint={t('addWork.descriptionHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={LIMITS.jobDescription}
            showCounter
          />
        )}
      />

      <Section title={t('addWork.pay')}>
        <Controller
          control={control}
          name="salaryType"
          render={({ field }) => (
            <ChipGroup
              options={SALARY_TYPES.map((type) => ({ value: type, label: t(`enums.salaryType.${type}`) }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="salaryAmount"
          render={({ field, fieldState }) => (
            <TextField
              label={t('addWork.amount')}
              hint={t('addWork.amountHint', { min: formatRupees(range.min), max: formatRupees(range.max) })}
              prefix="₹"
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
      </Section>

      <Section title={t('addWork.schedule')}>
        <Controller
          control={control}
          name="shift"
          render={({ field, fieldState }) => (
            <ChipGroup
              options={SHIFTS.map((shift) => ({ value: shift, label: t(`enums.shift.${shift}`) }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Controller
              control={control}
              name="timingStart"
              render={({ field, fieldState }) => (
                <DateField
                  mode="time"
                  label={t('addWork.startTime')}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  defaultValue="09:00"
                  optional
                />
              )}
            />
          </View>
          <View style={styles.half}>
            <Controller
              control={control}
              name="timingEnd"
              render={({ field, fieldState }) => (
                <DateField
                  mode="time"
                  label={t('addWork.endTime')}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  defaultValue="18:00"
                  optional
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="openings"
          render={({ field, fieldState }) => (
            <TextField
              label={t('job.openings')}
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
            />
          )}
        />
      </Section>

      <Section title={t('job.location')}>
        <Controller
          control={control}
          name="area"
          render={({ field, fieldState }) => (
            <TextField
              label={t('addWork.area')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              maxLength={LIMITS.place}
              autoCapitalize="words"
              optional
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
      </Section>

      <Controller
        control={control}
        name="requirements"
        render={({ field, fieldState }) => (
          <SkillsInput
            label={t('job.requirements')}
            placeholder={t('addWork.requirementPlaceholder')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            maxItems={LIMITS.listCount}
            maxLength={LIMITS.listItem}
          />
        )}
      />
      <Controller
        control={control}
        name="languages"
        render={({ field, fieldState }) => (
          <ChipGroup
            multiple
            label={t('addWork.languages')}
            options={LANGUAGES.map((language) => ({ value: language.code, label: language.nativeName }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="benefits"
        render={({ field, fieldState }) => (
          <SkillsInput
            label={t('job.benefits')}
            placeholder={t('addWork.benefitPlaceholder')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            maxItems={LIMITS.listCount}
            maxLength={LIMITS.listItem}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
