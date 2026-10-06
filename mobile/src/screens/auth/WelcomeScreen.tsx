import { Image } from 'expo-image';
import { BriefcaseBusiness, HeartHandshake, Languages, Search, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import sunrise from '../../../assets/images/sunrise.jpg';
import { Screen } from '../../Components/layout/Screen';
import { Button } from '../../Components/ui/Button';
import { IconButton } from '../../Components/ui/IconButton';
import { Logo } from '../../Components/ui/Logo';
import { Text } from '../../Components/ui/Text';
import { useLightStatusBar } from '../../lib/hooks/useLightStatusBar';
import { colors, MIN_TOUCH, overlays, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';

function TrustPoint({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={styles.trust}>
      <View style={styles.trustIcon}>
        <Icon size={sizes.iconSm + 2} color={colors.gold} strokeWidth={2} />
      </View>
      <Text variant="bodyStrong" color="textOnDark" style={styles.trustLabel}>
        {label}
      </Text>
    </View>
  );
}

export function WelcomeScreen({ navigation }: RootScreenProps<'Welcome'>) {
  const { t } = useTranslation();
  useLightStatusBar();

  return (
    <View style={styles.root}>
      <Image source={sunrise} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />
      {/* Darkens the lower half so white text stays readable over any photo. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.plumDeep} stopOpacity={0.35} />
            <Stop offset="0.45" stopColor={colors.plumDeep} stopOpacity={0.1} />
            <Stop offset="1" stopColor={colors.plumDeep} stopOpacity={0.92} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
      </Svg>

      <Screen background="transparent" contentStyle={styles.content}>
        <View style={styles.topRow}>
          <Logo tone="light" />
          <IconButton
            icon={Languages}
            variant="onDark"
            onPress={() => navigation.navigate('Language', { mode: 'change' })}
            accessibilityLabel={t('welcome.language')}
          />
        </View>

        <View style={styles.spacer} />

        <View style={styles.copy}>
          <Text variant="display" color="textOnDark" accessibilityRole="header">
            {t('common.tagline')}
          </Text>
          <View style={styles.trustList}>
            <TrustPoint icon={ShieldCheck} label={t('welcome.trustVerified')} />
            <TrustPoint icon={Wallet} label={t('welcome.trustFree')} />
            <TrustPoint icon={HeartHandshake} label={t('welcome.trustLanguage')} />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('welcome.findWork')}
            icon={Search}
            variant="light"
            onPress={() => navigation.navigate('SignIn', { role: 'user' })}
          />
          <Button
            label={t('welcome.hire')}
            icon={BriefcaseBusiness}
            variant="outlineLight"
            onPress={() => navigation.navigate('SignIn', { role: 'admin' })}
          />
          <Pressable
            onPress={() => navigation.navigate('SuperAdminLogin')}
            accessibilityRole="link"
            style={styles.ownerLink}
            hitSlop={spacing.xs}
          >
            <Text variant="label" color="textOnDarkMuted">
              {t('welcome.ownerLogin')}
            </Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.plumDeep },
  content: { paddingBottom: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { flex: 1, minHeight: spacing.xxxl },
  copy: { gap: spacing.lg },
  trustList: { gap: spacing.sm },
  trust: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trustIcon: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.pill,
    backgroundColor: overlays.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: { flex: 1 },
  actions: { gap: spacing.sm },
  ownerLink: { alignSelf: 'center', minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md },
});
