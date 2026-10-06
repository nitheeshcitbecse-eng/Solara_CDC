import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import { maskAadhaar } from '../../utils/format';
import { DocumentUpload } from '../media/DocumentUpload';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';

type AadhaarFieldsProps = {
  front: LocalFile | null;
  back: LocalFile | null;
  last4: string;
  onFrontChange: (file: LocalFile | null) => void;
  onBackChange: (file: LocalFile | null) => void;
  onLast4Change: (value: string) => void;
  frontError?: string;
  last4Error?: string;
};

/**
 * Aadhaar front/back + last four digits. The full 12-digit number is never asked
 * for, stored or shown: only the masked form "XXXX XXXX 1234".
 */
export function AadhaarFields({
  front,
  back,
  last4,
  onFrontChange,
  onBackChange,
  onLast4Change,
  frontError,
  last4Error,
}: AadhaarFieldsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <DocumentUpload label={t('aadhaar.front')} value={front} onChange={onFrontChange} error={frontError} />
      <DocumentUpload label={t('aadhaar.back')} value={back} onChange={onBackChange} optional />
      <TextField
        label={t('aadhaar.last4')}
        hint={t('aadhaar.last4Hint')}
        value={last4}
        onChangeText={(text) => onLast4Change(text.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        error={last4Error}
        secureTextEntry={false}
      />
      {last4.length === 4 ? (
        <Text variant="bodyStrong" latin color="textMuted" accessibilityLabel={t('aadhaar.masked', { masked: maskAadhaar(last4) })}>
          {maskAadhaar(last4)}
        </Text>
      ) : null}
      <View style={styles.note}>
        <ShieldCheck size={sizes.iconSm + 2} color={colors.success} strokeWidth={2} />
        <Text variant="caption" color="textMuted" style={styles.noteText}>
          {t('aadhaar.privacyNote')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noteText: { flex: 1 },
});
