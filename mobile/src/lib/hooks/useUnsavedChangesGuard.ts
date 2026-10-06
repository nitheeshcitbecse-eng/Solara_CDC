import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

/**
 * Asks before leaving a screen with unsaved edits — covers the header back button,
 * Android's hardware back and the iOS swipe gesture, because all of them remove
 * the screen through the same navigation action.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean): void {
  const { t } = useTranslation();
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert(t('common.unsavedTitle'), t('common.unsavedBody'), [
      { text: t('common.keepEditing'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
}
