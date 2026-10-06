import { Camera, MapPin, Mic, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes } from '../../lib/theme/tokens';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

export type PermissionKind = 'microphone' | 'camera' | 'location';

const ICONS: Record<PermissionKind, LucideIcon> = { microphone: Mic, camera: Camera, location: MapPin };

type PermissionSheetProps = {
  kind: PermissionKind;
  mode: 'explain' | 'denied' | null;
  onAllow: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
};

/** Explains WHY we need a permission before the OS dialog appears (or how to re-enable it). */
export function PermissionSheet({ kind, mode, onAllow, onOpenSettings, onDismiss }: PermissionSheetProps) {
  const { t } = useTranslation();
  const Icon = ICONS[kind];
  const denied = mode === 'denied';

  return (
    <BottomSheet
      visible={mode !== null}
      onClose={onDismiss}
      footer={
        <>
          <Button
            label={denied ? t('common.openSettings') : t('common.allow')}
            onPress={denied ? onOpenSettings : onAllow}
          />
          <Button label={t('common.notNow')} variant="secondary" onPress={onDismiss} />
        </>
      }
    >
      <View style={styles.iconTile}>
        <Icon size={sizes.iconLg} color={colors.primary} strokeWidth={2} />
      </View>
      <Text variant="heading">{denied ? t('permissions.deniedTitle') : t(`permissions.${kind}.title`)}</Text>
      <Text variant="body" color="textMuted">
        {denied ? t('permissions.deniedBody') : t(`permissions.${kind}.body`)}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
