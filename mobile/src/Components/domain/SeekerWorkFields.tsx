import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { useSectors } from '../../api/queries/sectors';
import { sectorLabel } from '../../lib/i18n/labels';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import { AVAILABILITIES } from '../../lib/types/profile';
import { formatMonth } from '../../utils/format';
import { LIMITS, type WorkExperienceForm, type WorkForm } from '../../utils/validation';
import { Section } from '../layout/Section';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipGroup } from '../ui/ChipGroup';
import { IconButton } from '../ui/IconButton';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { SkillsInput } from './SkillsInput';
import { WorkExperienceSheet } from './WorkExperienceSheet';

/** Work history, skills, preferred sectors, salary and availability. */
export function SeekerWorkFields({ control }: { control: Control<WorkForm> }) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const sectors = useSectors();
  const history = useFieldArray({ control, name: 'workHistory', keyName: 'key' });
  const [editing, setEditing] = useState<{ index: number | null } | null>(null);

  const saveEntry = (entry: WorkExperienceForm) => {
    if (editing && editing.index !== null) history.update(editing.index, entry);
    else history.append(entry);
  };

  return (
    <>
      <Section title={t('onboarding.previousWork')}>
        {history.fields.length === 0 ? (
          <Text variant="body" color="textMuted">
            {t('onboarding.noWork')}
          </Text>
        ) : (
          history.fields.map((entry, index) => (
            <Card key={entry.key}>
              <View style={styles.workRow}>
                <BriefcaseBusiness size={sizes.icon} color={colors.primary} strokeWidth={2} />
                <View style={styles.workText}>
                  <Text variant="bodyStrong">{entry.title}</Text>
                  <Text variant="caption" color="textMuted">
                    {`${entry.employer} · ${formatMonth(entry.from, activeLanguage)} – ${
                      entry.to ? formatMonth(entry.to, activeLanguage) : t('common.present')
                    }`}
                  </Text>
                </View>
                <IconButton icon={Pencil} onPress={() => setEditing({ index })} accessibilityLabel={t('onboarding.editWork')} />
                <IconButton
                  icon={Trash2}
                  onPress={() => history.remove(index)}
                  accessibilityLabel={t('a11y.removeItem', { item: entry.title })}
                />
              </View>
            </Card>
          ))
        )}
        {history.fields.length < LIMITS.workHistory ? (
          <Button label={t('onboarding.addWork')} icon={Plus} variant="secondary" onPress={() => setEditing({ index: null })} />
        ) : null}
      </Section>

      <Controller
        control={control}
        name="currentWork"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.currentWork')}
            placeholder={t('onboarding.currentWorkPlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={LIMITS.listItem}
            optional
          />
        )}
      />
      <Controller
        control={control}
        name="skills"
        render={({ field, fieldState }) => (
          <SkillsInput
            label={t('onboarding.skills')}
            placeholder={t('onboarding.skillPlaceholder')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            maxItems={LIMITS.skillCount}
            maxLength={LIMITS.skill}
          />
        )}
      />
      {sectors.isPending ? (
        <Skeleton height={sizes.chip * 2} />
      ) : (
        <Controller
          control={control}
          name="preferredSectorIds"
          render={({ field, fieldState }) => (
            <ChipGroup
              multiple
              label={t('onboarding.sectors')}
              options={(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sectorLabel(t, sector) }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="expectedSalary"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.salary')}
            prefix="₹"
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            optional
          />
        )}
      />
      <Controller
        control={control}
        name="availability"
        render={({ field, fieldState }) => (
          <ChipGroup
            label={t('onboarding.availability')}
            options={AVAILABILITIES.map((value) => ({ value, label: t(`enums.availability.${value}`) }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      {editing ? (
        <WorkExperienceSheet
          initial={editing.index === null ? null : (history.fields[editing.index] ?? null)}
          onClose={() => setEditing(null)}
          onSave={saveEntry}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  workRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  workText: { flex: 1, gap: 2 },
});
