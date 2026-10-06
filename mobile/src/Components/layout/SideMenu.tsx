import { X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, durations, overlays, shadows, sizes, spacing } from '../../lib/theme/tokens';
import { IconButton } from '../ui/IconButton';
import { ListRow } from './ListRow';

export type SideMenuItem = { key: string; icon: LucideIcon; label: string; onPress: () => void; tone?: 'default' | 'danger' };

type SideMenuProps = {
  visible: boolean;
  onClose: () => void;
  header: ReactNode;
  items: readonly SideMenuItem[];
};

/** Panel that slides in from the end edge (hamburger menu). */
export function SideMenu({ visible, onClose, header, items }: SideMenuProps) {
  const { t } = useTranslation();
  const [offset] = useState(() => new Animated.Value(sizes.sideSheetWidth));

  useEffect(() => {
    if (!visible) return;
    offset.setValue(sizes.sideSheetWidth);
    Animated.timing(offset, { toValue: 0, duration: durations.normal, useNativeDriver: true }).start();
  }, [visible, offset]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('a11y.closeSheet')} />
        <Animated.View style={[styles.panel, { transform: [{ translateX: offset }] }]} accessibilityViewIsModal>
          <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            <View style={styles.close}>
              <IconButton icon={X} onPress={onClose} accessibilityLabel={t('a11y.closeSheet')} />
            </View>
            <View style={styles.header}>{header}</View>
            <View style={styles.items}>
              {items.map((item) => (
                <ListRow
                  key={item.key}
                  icon={item.icon}
                  title={item.label}
                  tone={item.tone}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: overlays.scrim },
  panel: { width: sizes.sideSheetWidth, maxWidth: '85%', backgroundColor: colors.background, ...shadows.sheet },
  safe: { flex: 1, paddingHorizontal: spacing.md },
  close: { alignItems: 'flex-end' },
  header: { paddingHorizontal: spacing.xs, paddingBottom: spacing.lg, gap: spacing.xs },
  items: { gap: spacing.xxs },
});
