import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { colors, spacing } from '../../lib/theme/tokens';
import { normalizeText } from '../../utils/format';
import { LIMITS, workExperienceSchema, type WorkExperienceForm } from '../../utils/validation';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

type WorkExperienceSheetProps = {
  /** null when adding a new entry. Mount the sheet only while it is open so it starts fresh. */
  initial: WorkExperienceForm | null;
  onClose: () => void;
  onSave: (entry: WorkExperienceForm) => void;
};

export function WorkExperienceSheet({ initial, onClose, onSave }: WorkExperienceSheetProps) {
  const { t } = useTranslation();
  const [stillWorking, setStillWorking] = useState(initial ? initial.to === '' : false);
  // A lazy initialiser runs once, so the generated id stays stable across re-renders.
  const [newId] = useState(() => `wx_${Date.now().toString(36)}`);
  const { control, handleSubmit, setValue, setError } = useForm<WorkExperienceForm>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: initial ?? { id: newId, title: '', employer: '', from: '', to: '' },
  });
  const thisYear = new Date().getFullYear();

  const submit = handleSubmit((values) => {
    // An empty "to" means "still working here", so it is only allowed when the switch is on.
    if (!stillWorking && values.to === '') {
      setError('to', { message: 'validation.month' });
      return;
    }
    onSave({
      ...values,
      title: normalizeText(values.title),
      employer: normalizeText(values.employer),
      to: stillWorking ? '' : values.to,
    });
    onClose();
  });

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={initial ? t('onboarding.editWork') : t('onboarding.addWork')}
      footer={<Button label={t('common.save')} onPress={() => void submit()} />}
    >
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.jobTitle')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.listItem}
          />
        )}
      />
      <Controller
        control={control}
        name="employer"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.employer')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.listItem}
          />
        )}
      />
      <Controller
        control={control}
        name="from"
        render={({ field, fieldState }) => (
          <DateField
            mode="month"
            label={t('onboarding.from')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            minYear={thisYear - 50}
            maxYear={thisYear}
          />
        )}
      />
      <View style={styles.switchRow}>
        <Text variant="body" style={styles.switchLabel}>
          {t('onboarding.currentlyWorking')}
        </Text>
        <Switch
          value={stillWorking}
          onValueChange={(on) => {
            setStillWorking(on);
            if (on) setValue('to', '');
          }}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor={colors.surface}
          accessibilityLabel={t('onboarding.currentlyWorking')}
        />
      </View>
      {stillWorking ? null : (
        <Controller
          control={control}
          name="to"
          render={({ field, fieldState }) => (
            <DateField
              mode="month"
              label={t('onboarding.to')}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              minYear={thisYear - 50}
              maxYear={thisYear}
            />
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchLabel: { flex: 1 },
});
