import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useToast } from '../../context/ToastContext';
import { useCreateReport } from '../../api/queries/support';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { REPORT_REASONS, type ReportTargetType } from '../../lib/types/support';
import { normalizeMultiline } from '../../utils/format';
import { LIMITS, reportSchema, type ReportForm } from '../../utils/validation';
import { InlineAlert } from '../feedback/InlineAlert';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { ChipGroup } from '../ui/ChipGroup';
import { TextField } from '../ui/TextField';

type ReportSheetProps = {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
};

/** Report a job, user or message to the Solara safety team. */
export function ReportSheet({ visible, onClose, targetType, targetId }: ReportSheetProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const report = useCreateReport();
  const { control, handleSubmit, reset } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: 'fraud', details: '' },
  });

  const close = () => {
    reset();
    report.reset();
    onClose();
  };

  const submit = handleSubmit((values) => {
    report.mutate(
      { targetType, targetId, reason: values.reason, details: normalizeMultiline(values.details) },
      {
        onSuccess: () => {
          showToast(t('report.sent'), 'success');
          close();
        },
      },
    );
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t('report.title')}
      description={t('report.subtitle')}
      footer={<Button label={t('report.submit')} variant="danger" onPress={() => void submit()} loading={report.isPending} />}
    >
      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <ChipGroup
            label={t('report.reason')}
            options={REPORT_REASONS.map((reason) => ({ value: reason, label: t(`enums.reportReason.${reason}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="details"
        render={({ field, fieldState }) => (
          <TextField
            label={t('report.details')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={LIMITS.reportDetails}
            showCounter
            optional
          />
        )}
      />
      {report.error ? <InlineAlert tone="danger" message={errorMessage(report.error)} /> : null}
    </BottomSheet>
  );
}
