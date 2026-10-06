import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { normalizeMultiline } from '../../utils/format';
import { LIMITS, reasonSchema, type ReasonForm } from '../../utils/validation';
import { InlineAlert } from '../feedback/InlineAlert';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

type ReasonSheetProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

/**
 * Confirmation for owner actions. A written reason (5–300 characters) is required,
 * because every decision is stored in the audit log and may be shown to the user.
 */
export function ReasonSheet({ visible, title, description, confirmLabel, tone = 'danger', loading, error, onConfirm, onClose }: ReasonSheetProps) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<ReasonForm>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });

  useEffect(() => {
    if (visible) reset({ reason: '' });
  }, [visible, reset]);

  const submit = handleSubmit((values) => onConfirm(normalizeMultiline(values.reason)));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button label={confirmLabel} variant={tone === 'danger' ? 'danger' : 'primary'} onPress={() => void submit()} loading={loading} />
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
        </>
      }
    >
      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <TextField
            label={t('superadmin.reason')}
            hint={t('superadmin.reasonHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={LIMITS.reasonMax}
            showCounter
          />
        )}
      />
      {error ? <InlineAlert tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
