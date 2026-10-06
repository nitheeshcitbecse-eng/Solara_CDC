import { Image } from 'expo-image';
import { Camera, Images, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useImagePicker } from '../../lib/hooks/useImagePicker';
import { colors, overlays, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import { deleteTempFiles, validateUpload } from '../../utils/files';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import { Text } from '../ui/Text';

type PhotoPickerProps = {
  value: LocalFile[];
  onChange: (photos: LocalFile[]) => void;
  min: number;
  max: number;
  error?: string;
};

/**
 * Workplace photos: take or pick up to `max`, shown as a removable grid. Every photo
 * is resized and re-encoded before it is accepted (see utils/files).
 */
export function PhotoPicker({ value, onChange, min, max, error }: PhotoPickerProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { takePhoto, pickFromLibrary, permissionSheet } = useImagePicker();
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const remaining = max - value.length;

  const accept = (files: LocalFile[]) => {
    const valid: LocalFile[] = [];
    for (const file of files) {
      const problem = validateUpload(file, 'image');
      if (problem) {
        deleteTempFiles([file.uri]);
        setPickError(errorMessage(problem));
      } else {
        valid.push(file);
      }
    }
    if (valid.length > 0) {
      setPickError(null);
      onChange([...value, ...valid].slice(0, max));
    }
  };

  const run = async (pick: () => Promise<{ files: LocalFile[] }>) => {
    setBusy(true);
    try {
      accept((await pick()).files);
    } finally {
      setBusy(false);
    }
  };

  const remove = (uri: string) => {
    deleteTempFiles([uri]);
    onChange(value.filter((photo) => photo.uri !== uri));
  };

  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">
        {t('addWork.photosCount', { count: value.length, min, max })}
      </Text>
      <View style={styles.grid}>
        {value.map((photo, index) => (
          <View key={photo.uri} style={styles.cell}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel={t('job.photoLabel', { index: index + 1, total: value.length })}
            />
            <Pressable
              onPress={() => remove(photo.uri)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.removeItem', { item: t('job.photoLabel', { index: index + 1, total: value.length }) })}
              style={styles.remove}
              hitSlop={spacing.xs}
            >
              <X size={sizes.iconSm} color={colors.textOnDark} strokeWidth={2} />
            </Pressable>
          </View>
        ))}
      </View>
      {remaining > 0 ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label={t('addWork.takePhoto')} icon={Camera} variant="secondary" onPress={() => void run(takePhoto)} disabled={busy} />
          </View>
          <View style={styles.action}>
            <Button
              label={t('addWork.choosePhotos')}
              icon={Images}
              variant="secondary"
              onPress={() => void run(() => pickFromLibrary(remaining))}
              loading={busy}
            />
          </View>
        </View>
      ) : null}
      <FieldError message={error} />
      {pickError ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {pickError}
        </Text>
      ) : null}
      {permissionSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cell: { width: sizes.photoThumb, height: sizes.photoThumb },
  photo: { width: '100%', height: '100%', borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  remove: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    width: sizes.icon + spacing.xxs,
    height: sizes.icon + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: overlays.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
