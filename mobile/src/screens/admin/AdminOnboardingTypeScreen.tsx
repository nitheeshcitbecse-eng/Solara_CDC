import { Building2, Check, House, UsersRound, LogOut, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Button } from '../../Components/ui/Button';
import { IconButton } from '../../Components/ui/IconButton';
import { StepProgress } from '../../Components/ui/StepProgress';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useMe, useUpdateHirerProfile } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { useResumeSteps } from '../../lib/hooks/useResumeSteps';
import { ADMIN_ONBOARDING_STEPS } from '../../navigation/onboardingSteps';
import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import { HIRER_TYPES, type HirerType } from '../../lib/types/profile';

const ICONS: Record<HirerType, LucideIcon> = { individual: House, business: Building2, agency: UsersRound };

/** Hirer onboarding 1/3: who is hiring — a household, a business or an agency. */
export function AdminOnboardingTypeScreen({ navigation }: RootScreenProps<'AdminOnboardingType'>) {
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const hirer = me.data?.hirer ?? null;
  const save = useUpdateHirerProfile();
  const [choice, setChoice] = useState<HirerType | null>(null);
  const selected = choice ?? hirer?.hirerType ?? null;

  useResumeSteps(ADMIN_ONBOARDING_STEPS, hirer?.onboardingStep ?? null);

  const header = <Header back={false} right={<IconButton icon={LogOut} onPress={() => void signOut()} accessibilityLabel={t('common.signOut')} />} />;

  if (me.isPending || me.isError) {
    return <Screen header={header}>{me.isPending ? <ScreenSkeleton /> : <ErrorState error={me.error} onRetry={() => void me.refetch()} />}</Screen>;
  }

  const onContinue = () => {
    if (!selected) return;
    save.mutate(
      { hirerType: selected, onboardingStep: Math.max(2, hirer?.onboardingStep ?? 1) as 2 | 3 | 4 },
      { onSuccess: () => navigation.navigate('AdminOnboardingDetails') },
    );
  };

  return (
    <Screen
      header={header}
      footer={<Button label={t('common.continue')} onPress={onContinue} loading={save.isPending} disabled={!selected} />}
    >
      <StepProgress current={1} total={3} title={t('hirer.stepType')} />
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {t('hirer.typeTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('hirer.typeSubtitle')}
        </Text>
      </View>
      <View style={styles.options} accessibilityRole="radiogroup">
        {HIRER_TYPES.map((type) => {
          const Icon = ICONS[type];
          const isSelected = selected === type;
          return (
            <Pressable
              key={type}
              onPress={() => setChoice(type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [styles.option, isSelected ? styles.optionSelected : null, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconTile}>
                <Icon size={sizes.iconLg} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.flex}>
                <Text variant="heading">{t(`enums.hirerType.${type}`)}</Text>
                <Text variant="body" color="textMuted">
                  {t(`enums.hirerTypeHint.${type}`)}
                </Text>
              </View>
              {isSelected ? <Check size={sizes.icon} color={colors.primary} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
      {save.error ? <InlineAlert tone="danger" message={errorMessage(save.error)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titles: { gap: spacing.xs },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, borderWidth: sizes.focusRing, backgroundColor: colors.surfaceSelected },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconTile: {
    width: sizes.iconTile + spacing.xs,
    height: sizes.iconTile + spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
