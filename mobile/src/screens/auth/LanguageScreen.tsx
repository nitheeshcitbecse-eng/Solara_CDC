import { Check } from 'lucide-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { Logo } from '../../Components/ui/Logo';
import { Text } from '../../Components/ui/Text';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, useLanguageActions } from '../../context/LanguageContext';
import { useUpdateSettings } from '../../api/queries/profile';
import { detectDeviceLanguage } from '../../lib/i18n';
import { LANGUAGES, type LanguageCode, type LanguageInfo } from '../../lib/i18n/languages';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';

type TileProps = { language: LanguageInfo; selected: boolean; onSelect: (code: LanguageCode) => void; fallbackNote: string };

const LanguageTile = memo(function LanguageTile({ language, selected, onSelect, fallbackNote }: TileProps) {
  return (
    <Pressable
      onPress={() => onSelect(language.code)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${language.nativeName}, ${language.englishName}`}
      style={({ pressed }) => [styles.tile, selected ? styles.tileSelected : null, pressed ? styles.tilePressed : null]}
    >
      <View style={styles.tileText}>
        {/* Native names are deliberately never translated, so everyone can find their language. */}
        <Text variant="heading">{language.nativeName}</Text>
        <Text variant="caption" color="textMuted" latin>
          {language.englishName}
        </Text>
        {language.hasTranslations ? null : (
          <Text variant="caption" color="textSubtle">
            {fallbackNote}
          </Text>
        )}
      </View>
      {selected ? (
        <View style={styles.check}>
          <Check size={sizes.iconSm} color={colors.textOnDark} strokeWidth={2} />
        </View>
      ) : null}
    </Pressable>
  );
});

export function LanguageScreen({ navigation, route }: RootScreenProps<'Language'>) {
  const mode = route.params?.mode ?? 'initial';
  const { t } = useTranslation();
  const { savedLanguage } = useLanguage();
  const { previewLanguage, confirmLanguage, cancelPreview } = useLanguageActions();
  const { status } = useAuth();
  const updateSettings = useUpdateSettings();
  const [initial] = useState<LanguageCode>(() => savedLanguage ?? detectDeviceLanguage());
  const [selected, setSelected] = useState<LanguageCode>(initial);
  const [saving, setSaving] = useState(false);
  const confirmed = useRef(false);

  // First launch: show the UI in the phone's language straight away.
  useEffect(() => {
    previewLanguage(initial);
  }, [initial, previewLanguage]);

  // Leaving "change language" without pressing Continue restores the saved language.
  useEffect(
    () => () => {
      if (!confirmed.current) cancelPreview();
    },
    [cancelPreview],
  );

  const handleSelect = useCallback(
    (code: LanguageCode) => {
      setSelected(code);
      previewLanguage(code); // live preview of the whole UI
    },
    [previewLanguage],
  );

  const handleContinue = async () => {
    setSaving(true);
    confirmed.current = true;
    await confirmLanguage(selected);
    // Signed-in users also store the choice on the server (used for SMS/notifications).
    if (status === 'signedIn') updateSettings.mutate({ language: selected });
    setSaving(false);
    // On first launch the navigator moves on by itself once a language is saved.
    if (mode === 'change' && navigation.canGoBack()) navigation.goBack();
  };

  return (
    <Screen
      scroll={false}
      header={mode === 'change' ? <Header title={t('language.title')} /> : null}
      footer={<Button label={t('common.continue')} onPress={() => void handleContinue()} loading={saving} />}
    >
      <FlatList
        data={LANGUAGES}
        keyExtractor={(language) => language.code}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          mode === 'initial' ? (
            <View style={styles.intro}>
              <Logo size="lg" />
              <Text variant="title">{t('language.title')}</Text>
              <Text variant="body" color="textMuted">
                {t('language.subtitle')}
              </Text>
            </View>
          ) : (
            <Text variant="body" color="textMuted" style={styles.subtitle}>
              {t('language.subtitle')}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <LanguageTile
            language={item}
            selected={item.code === selected}
            onSelect={handleSelect}
            fallbackNote={t('language.fallbackNote')}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  column: { gap: spacing.sm },
  intro: { gap: spacing.sm, marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xs },
  tile: {
    flex: 1,
    minHeight: sizes.listRow + spacing.xl,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  tileSelected: { borderColor: colors.primary, borderWidth: sizes.focusRing, backgroundColor: colors.surfaceSelected },
  tilePressed: { backgroundColor: colors.surfaceMuted },
  tileText: { flex: 1, gap: 2 },
  check: {
    width: sizes.icon + spacing.xxs,
    height: sizes.icon + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
