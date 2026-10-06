import { CircleHelp, LogOut, MessageSquare, Pencil, Settings, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AadhaarStatusCard } from '../../Components/domain/AadhaarStatusCard';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Avatar } from '../../Components/ui/Avatar';
import { Card } from '../../Components/ui/Card';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useMe } from '../../api/queries/profile';
import { spacing } from '../../lib/theme/tokens';
import type { AdminTabScreenProps } from '../../lib/types/navigation';
import { formatPhone } from '../../utils/format';

export function AdminProfileScreen({ navigation }: AdminTabScreenProps<'AdminProfile'>) {
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const me = useMe();

  const confirmSignOut = () =>
    Alert.alert(t('menu.signOutTitle'), t('menu.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  const header = <Header back={false} title={t('profile.title')} />;

  if (me.isPending || me.isError || !me.data.hirer) {
    return (
      <Screen edges={['top']} header={header}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton variant="detail" />}
      </Screen>
    );
  }

  const hirer = me.data.hirer;
  const address = hirer.address;

  return (
    <Screen edges={['top']} header={header}>
      <View style={styles.identity}>
        <Avatar name={hirer.name} size="lg" />
        <View style={styles.flex}>
          <Text variant="title">{hirer.name ?? ''}</Text>
          {hirer.businessName ? (
            <Text variant="bodyStrong" color="textMuted">
              {hirer.businessName}
            </Text>
          ) : null}
          <Text variant="body" color="textMuted" latin>
            {formatPhone(me.data.user.phone)}
          </Text>
        </View>
      </View>

      <AadhaarStatusCard aadhaar={hirer.aadhaar} />
      <ListRow icon={ShieldCheck} title={t('hirer.verificationTitle')} onPress={() => navigation.navigate('VerificationStatus')} />

      <Card>
        <View style={styles.cardHeader}>
          <Text variant="heading" style={styles.flex} accessibilityRole="header">
            {t('hirer.detailsTitle')}
          </Text>
          <IconButton icon={Pencil} onPress={() => navigation.navigate('AdminProfileEdit')} accessibilityLabel={t('common.edit')} />
        </View>
        <Text variant="body">{hirer.hirerType ? t(`enums.hirerType.${hirer.hirerType}`) : t('profile.notSet')}</Text>
        <Text variant="body" color="textMuted">
          {address ? `${address.line1}, ${address.city}, ${address.state} ${address.pincode}` : t('profile.notSet')}
        </Text>
        {hirer.gstin ? (
          <Text variant="caption" color="textMuted" latin>
            {t('hirer.gstinValue', { gstin: hirer.gstin })}
          </Text>
        ) : null}
      </Card>

      <View>
        <ListRow icon={MessageSquare} title={t('messages.title')} onPress={() => navigation.navigate('Messages')} />
        <ListRow icon={Settings} title={t('menu.settings')} onPress={() => navigation.navigate('Settings')} />
        <ListRow icon={CircleHelp} title={t('menu.help')} onPress={() => navigation.navigate('Help')} />
        <ListRow icon={LogOut} title={t('common.signOut')} tone="danger" onPress={confirmSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
