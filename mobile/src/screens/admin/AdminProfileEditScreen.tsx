import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { HirerDetailsFields } from '../../Components/domain/HirerDetailsFields';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { ChipGroup } from '../../Components/ui/ChipGroup';
import { useToast } from '../../context/ToastContext';
import { useMe, useUpdateHirerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/hooks/useUnsavedChangesGuard';
import type { RootScreenProps } from '../../lib/types/navigation';
import { HIRER_TYPES } from '../../lib/types/profile';
import { hirerDetailsFrom, hirerPatch } from '../../utils/jobForms';
import { hirerDetailsSchema, type HirerDetailsForm } from '../../utils/validation';

export function AdminProfileEditScreen({ navigation }: RootScreenProps<'AdminProfileEdit'>) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const save = useUpdateHirerProfile();
  const [saved, setSaved] = useState(false);
  const hirer = me.data?.hirer ?? null;

  const { control, handleSubmit, reset, setValue, formState } = useForm<HirerDetailsForm>({
    resolver: zodResolver(hirerDetailsSchema),
    defaultValues: { hirerType: 'individual', name: '', businessName: '', line1: '', city: '', state: '', pincode: '', gstin: '' },
    values: hirer ? hirerDetailsFrom(hirer) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  useUnsavedChangesGuard(formState.isDirty && !save.isPending && !saved);

  useEffect(() => {
    if (saved) navigation.goBack();
  }, [saved, navigation]);

  const submit = handleSubmit((values) => {
    save.mutate(hirerPatch(values), {
      onSuccess: () => {
        reset(values);
        showToast(t('profile.saved'), 'success');
        setSaved(true);
      },
    });
  });

  if (me.isPending || me.isError || !hirer) {
    return (
      <Screen header={<Header title={t('hirer.detailsTitle')} />}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton />}
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('hirer.detailsTitle')} />}
      footer={<Button label={t('common.saveChanges')} onPress={() => void submit()} loading={save.isPending} />}
    >
      <Controller
        control={control}
        name="hirerType"
        render={({ field }) => (
          <ChipGroup
            label={t('hirer.typeTitle')}
            options={HIRER_TYPES.map((type) => ({ value: type, label: t(`enums.hirerType.${type}`) }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <HirerDetailsFields control={control} setValue={setValue} />
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}
