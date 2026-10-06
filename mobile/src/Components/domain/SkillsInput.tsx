import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../lib/theme/tokens';
import { normalizeText } from '../../utils/format';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';

type SkillsInputProps = {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  maxItems: number;
  maxLength: number;
};

/** Free-text list entry (skills, requirements, benefits) shown as removable chips. */
export function SkillsInput({ label, placeholder, value, onChange, error, maxItems, maxLength }: SkillsInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const item = normalizeText(draft);
    if (item.length < 2) return;
    const exists = value.some((existing) => existing.toLowerCase() === item.toLowerCase());
    if (!exists && value.length < maxItems) onChange([...value, item]);
    setDraft('');
  };

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={draft}
        onChangeText={setDraft}
        maxLength={maxLength}
        onSubmitEditing={add}
        returnKeyType="done"
        blurOnSubmit={false}
        error={error}
        editable={value.length < maxItems}
        right={
          <IconButton
            icon={Plus}
            onPress={add}
            accessibilityLabel={t('common.add')}
            disabled={normalizeText(draft).length < 2 || value.length >= maxItems}
          />
        }
      />
      {value.length > 0 ? (
        <View style={styles.wrap}>
          {value.map((item) => (
            <Chip key={item} label={item} onRemove={() => onChange(value.filter((existing) => existing !== item))} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
