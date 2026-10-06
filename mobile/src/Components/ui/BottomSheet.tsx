import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, durations, overlays, radius, shadows, sizes, spacing } from '../../lib/theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set false when the content is its own scroller (e.g. a FlatList). */
  scrollable?: boolean;
};

const MAX_HEIGHT_RATIO = 0.88;

export function BottomSheet({ visible, onClose, title, description, children, footer, scrollable = true }: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [translate] = useState(() => new Animated.Value(height));

  useEffect(() => {
    if (!visible) return;
    translate.setValue(height);
    // A short ease-out slide; no spring/bounce, per the design system.
    Animated.timing(translate, { toValue: 0, duration: durations.normal, useNativeDriver: true }).start();
  }, [visible, height, translate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.closeSheet')}
        />
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: height * MAX_HEIGHT_RATIO, paddingBottom: Math.max(insets.bottom, spacing.md) },
            { transform: [{ translateY: translate }] },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text variant="heading" accessibilityRole="header">
                  {title}
                </Text>
                {description ? (
                  <Text variant="body" color="textMuted">
                    {description}
                  </Text>
                ) : null}
              </View>
              <IconButton icon={X} onPress={onClose} accessibilityLabel={t('a11y.closeSheet')} />
            </View>
          ) : null}
          {scrollable ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.flexibleContent}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: overlays.scrim },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xs,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: sizes.sheetHandleWidth,
    height: sizes.sheetHandleHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerText: { flex: 1, gap: spacing.xxs, paddingTop: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  flexibleContent: { flexShrink: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm },
});
