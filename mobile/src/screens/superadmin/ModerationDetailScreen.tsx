import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AnalysisResult } from '../../Components/domain/AnalysisResult';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { PhotoCarousel } from '../../Components/media/PhotoCarousel';
import { Badge } from '../../Components/ui/Badge';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { SegmentedControl } from '../../Components/ui/SegmentedControl';
import { Select } from '../../Components/ui/Select';
import { Text } from '../../Components/ui/Text';
import { TextField } from '../../Components/ui/TextField';
import { useToast } from '../../context/ToastContext';
import { useSectors } from '../../api/queries/sectors';
import { useDecideModeration } from '../../api/queries/superadmin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { sectorLabel } from '../../lib/i18n/labels';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { ModerationItem } from '../../lib/types/superadmin';
import { normalizeMultiline, normalizeText } from '../../utils/format';
import { LIMITS, reasonSchema, type ReasonForm } from '../../utils/validation';

type SectorMode = 'new' | 'existing';

/** Decide one moderation item: a proposed sector or a workplace flagged by the photo check. */
export function ModerationDetailScreen({ navigation, route }: RootScreenProps<'ModerationDetail'>) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const sectors = useSectors();
  const [item, setItem] = useState<ModerationItem>(route.params.item);
  const decide = useDecideModeration(item.id);
  const [sectorMode, setSectorMode] = useState<SectorMode>('new');
  const [sectorName, setSectorName] = useState(item.sectorSuggestion?.proposedName ?? '');
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [sectorError, setSectorError] = useState<string | undefined>();
  const { control, handleSubmit } = useForm<ReasonForm>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });

  const isSector = item.kind === 'sector_suggestion';
  const open = item.status === 'open';
  const analysis = item.analysis?.status === 'complete' ? item.analysis : null;

  const submit = (decision: 'approve' | 'reject') =>
    handleSubmit(({ reason }) => {
      const extra: { sectorId?: string; sectorName?: string } = {};
      if (decision === 'approve' && isSector) {
        if (sectorMode === 'existing') {
          if (!sectorId) return setSectorError('validation.required');
          extra.sectorId = sectorId;
        } else {
          const name = normalizeText(sectorName);
          if (name.length < 2) return setSectorError('validation.tooShort');
          extra.sectorName = name;
        }
      }
      setSectorError(undefined);
      decide.mutate(
        { decision, note: normalizeMultiline(reason), ...extra },
        {
          onSuccess: (updated) => {
            setItem(updated);
            showToast(decision === 'approve' ? t('superadmin.approvedToast') : t('superadmin.rejectedToast'), 'success');
          },
        },
      );
    })();

  return (
    <Screen
      header={<Header title={t(`superadmin.moderationKind.${item.kind}`)} />}
      footer={
        open ? (
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label={t('superadmin.reject')} icon={X} variant="secondary" onPress={() => void submit('reject')} disabled={decide.isPending} />
            </View>
            <View style={styles.flex}>
              <Button label={t('superadmin.approve')} icon={Check} onPress={() => void submit('approve')} loading={decide.isPending} />
            </View>
          </View>
        ) : null
      }
    >
      <ListRow
        icon={BriefcaseBusiness}
        title={item.job.title}
        subtitle={item.job.hirerName}
        onPress={() => navigation.navigate('SuperJobDetail', { jobId: item.job.id })}
      />

      {!open ? (
        <InlineAlert
          tone={item.status === 'approved' ? 'success' : 'danger'}
          title={t(`superadmin.moderationStatus.${item.status}`)}
          message={item.note ?? ''}
        />
      ) : null}

      {isSector && item.sectorSuggestion ? (
        <Section title={t('superadmin.proposedSector')}>
          <Card>
            <Text variant="heading">{item.sectorSuggestion.proposedName}</Text>
            <View style={styles.badges}>
              <Badge label={t(`superadmin.aiDecision.${item.sectorSuggestion.decision}`)} tone="brand" />
              <Badge label={t('addWork.confidence', { percent: Math.round(item.sectorSuggestion.confidence * 100) })} tone="neutral" />
            </View>
          </Card>
          {open ? (
            <>
              <SegmentedControl
                segments={[
                  { value: 'new', label: t('superadmin.createSector') },
                  { value: 'existing', label: t('superadmin.useExisting') },
                ]}
                value={sectorMode}
                onChange={setSectorMode}
              />
              {sectorMode === 'new' ? (
                <TextField
                  label={t('superadmin.sectorName')}
                  value={sectorName}
                  onChangeText={setSectorName}
                  maxLength={LIMITS.sectorName}
                  error={sectorError}
                  autoCapitalize="words"
                />
              ) : (
                <Select
                  label={t('superadmin.chooseSector')}
                  value={sectorId}
                  options={(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sectorLabel(t, sector) }))}
                  onChange={setSectorId}
                  error={sectorError}
                />
              )}
            </>
          ) : null}
        </Section>
      ) : null}

      {item.photos.length > 0 ? (
        <Section title={t('superadmin.workplacePhotos')}>
          <PhotoCarousel photos={item.photos} />
        </Section>
      ) : null}
      {analysis ? <AnalysisResult analysis={analysis} /> : null}

      {open ? (
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <TextField
              label={t('superadmin.decisionNote')}
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
      ) : null}
      {decide.error ? <InlineAlert tone="danger" message={errorMessage(decide.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
});
