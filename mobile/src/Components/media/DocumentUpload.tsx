import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { Camera, FileText, Images, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useImagePicker } from '../../lib/hooks/useImagePicker';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { LocalFile } from '../../lib/types/common';
import { deleteTempFiles, mimeTypeFromName, validateUpload } from '../../utils/files';
import { formatFileSize } from '../../utils/format';
import { ListRow } from '../layout/ListRow';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import { Text } from '../ui/Text';

type DocumentUploadProps = {
  label: string;
  value: LocalFile | null;
  onChange: (file: LocalFile | null) => void;
  error?: string;
  optional?: boolean;
};

/**
 * Pick an identity document as a camera photo, a gallery photo or a PDF.
 * Files are validated (type + size) before they are accepted.
 */
export function DocumentUpload({ label, value, onChange, error, optional = false }: DocumentUploadProps) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const { takePhoto, pickFromLibrary, permissionSheet } = useImagePicker();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const accept = (file: LocalFile | undefined) => {
    if (!file) return;
    const problem = validateUpload(file, 'document');
    if (problem) {
      deleteTempFiles([file.uri]);
      setPickError(errorMessage(problem));
      return;
    }
    setPickError(null);
    if (value) deleteTempFiles([value.uri]);
    onChange(file);
  };

  const fromCamera = async () => {
    setSourceOpen(false);
    accept((await takePhoto()).files[0]);
  };

  const fromLibrary = async () => {
    setSourceOpen(false);
    accept((await pickFromLibrary(1)).files[0]);
  };

  const fromFiles = async () => {
    setSourceOpen(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    accept({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? mimeTypeFromName(asset.name),
      size: asset.size ?? 0,
    });
  };

  const remove = () => {
    if (value) deleteTempFiles([value.uri]);
    onChange(null);
  };

  const isPdf = value?.mimeType === 'application/pdf';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="label" color="textMuted">
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" color="textSubtle">
            {t('common.optional')}
          </Text>
        ) : null}
      </View>

      {value ? (
        <View style={styles.preview}>
          {isPdf ? (
            <View style={styles.pdfTile}>
              <FileText size={sizes.iconLg} color={colors.primary} strokeWidth={2} />
            </View>
          ) : (
            <Image source={{ uri: value.uri }} style={styles.thumb} contentFit="cover" accessible={false} />
          )}
          <View style={styles.previewText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {value.name}
            </Text>
            <Text variant="caption" color="textMuted" latin>
              {formatFileSize(value.size)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label={value ? t('aadhaar.replace') : t('aadhaar.pick')}
            icon={Upload}
            variant="secondary"
            onPress={() => setSourceOpen(true)}
          />
        </View>
        {value ? (
          <View style={styles.action}>
            <Button label={t('common.remove')} variant="secondary" onPress={remove} />
          </View>
        ) : null}
      </View>
      <FieldError message={error} />
      {pickError ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {pickError}
        </Text>
      ) : null}

      <BottomSheet visible={sourceOpen} onClose={() => setSourceOpen(false)} title={label}>
        <ListRow icon={Camera} title={t('aadhaar.takePhoto')} onPress={() => void fromCamera()} />
        <ListRow icon={Images} title={t('aadhaar.chooseFromGallery')} onPress={() => void fromLibrary()} />
        <ListRow icon={FileText} title={t('aadhaar.choosePdf')} onPress={() => void fromFiles()} />
      </BottomSheet>
      {permissionSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: { width: sizes.avatarLg, height: sizes.avatarMd, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  pdfTile: {
    width: sizes.avatarLg,
    height: sizes.avatarMd,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
