import { BriefcaseBusiness, CircleHelp, History, LogOut, Pencil, Settings } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AadhaarStatusCard } from '../../Components/domain/AadhaarStatusCard';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Avatar } from '../../Components/ui/Avatar';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Chip } from '../../Components/ui/Chip';
import { IconButton } from '../../Components/ui/IconButton';
import { Text } from '../../Components/ui/Text';
import { useAuthActions } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useMe } from '../../api/queries/profile';
import { useSectors } from '../../api/queries/sectors';
import { sectorLabel } from '../../lib/i18n/labels';
import { getLanguage } from '../../lib/i18n/languages';
import { spacing } from '../../lib/theme/tokens';
import type { UserTabScreenProps } from '../../lib/types/navigation';
import { ageFrom, formatDate, formatPhone, formatRupees } from '../../utils/format';

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function EditableSection({ title, onEdit, editLabel, children }: { title: string; onEdit: () => void; editLabel: string; children: ReactNode }) {
  return (
    <Card>
      <View style={styles.sectionHeader}>
        <Text variant="heading" style={styles.flex} accessibilityRole="header">
          {title}
        </Text>
        <IconButton icon={Pencil} onPress={onEdit} accessibilityLabel={`${editLabel}: ${title}`} />
      </View>
      {children}
    </Card>
  );
}

export function ProfileScreen({ navigation }: UserTabScreenProps<'Profile'>) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { signOut } = useAuthActions();
  const me = useMe();
  const sectors = useSectors();

  const confirmSignOut = () =>
    Alert.alert(t('menu.signOutTitle'), t('menu.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);

  const header = (
    <Header
      back={false}
      title={t('profile.title')}
      right={<IconButton icon={Settings} onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('menu.settings')} />}
    />
  );

  if (me.isPending || me.isError || !me.data.seeker) {
    return (
      <Screen edges={['top']} header={header}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton variant="detail" />}
      </Screen>
    );
  }

  const { user } = me.data;
  const seeker = me.data.seeker;
  const notSet = t('profile.notSet');
  const sectorNames = (sectors.data ?? []).filter((sector) => seeker.preferredSectorIds.includes(sector.id));

  return (
    <Screen edges={['top']} header={header}>
      <View style={styles.identity}>
        <Avatar name={seeker.fullName} size="lg" />
        <View style={styles.flex}>
          <Text variant="title">{seeker.fullName ?? ''}</Text>
          <Text variant="body" color="textMuted" latin>
            {formatPhone(user.phone)}
          </Text>
        </View>
      </View>

      <AadhaarStatusCard aadhaar={seeker.aadhaar} />
      {seeker.aadhaar.status === 'none' || seeker.aadhaar.status === 'rejected' ? (
        <Button
          label={seeker.aadhaar.status === 'none' ? t('profile.verifyNow') : t('profile.reupload')}
          variant="secondary"
          onPress={() => navigation.navigate('AadhaarUpload')}
        />
      ) : null}

      <EditableSection title={t('onboarding.stepAbout')} editLabel={t('common.edit')} onEdit={() => navigation.navigate('ProfileEdit', { section: 'about' })}>
        <Info label={t('onboarding.gender')} value={seeker.gender ? t(`enums.gender.${seeker.gender}`) : notSet} />
        <Info
          label={t('onboarding.dob')}
          value={
            seeker.dateOfBirth
              ? `${formatDate(seeker.dateOfBirth, activeLanguage)} · ${t('profile.age', { count: ageFrom(seeker.dateOfBirth) })}`
              : notSet
          }
        />
        <Info label={t('onboarding.email')} value={seeker.email ?? notSet} />
        <Info
          label={t('onboarding.languages')}
          value={seeker.languagesKnown.map((code) => getLanguage(code).nativeName).join(' · ') || notSet}
        />
      </EditableSection>

      <EditableSection
        title={t('onboarding.stepEducation')}
        editLabel={t('common.edit')}
        onEdit={() => navigation.navigate('ProfileEdit', { section: 'education' })}
      >
        <Info label={t('onboarding.qualification')} value={seeker.qualification ? t(`enums.qualification.${seeker.qualification}`) : notSet} />
        <Info label={t('profile.location')} value={[seeker.city, seeker.district, seeker.state].filter(Boolean).join(', ') || notSet} />
        <Info label={t('onboarding.pincode')} value={seeker.pincode ?? notSet} />
      </EditableSection>

      <EditableSection title={t('profile.workSection')} editLabel={t('common.edit')} onEdit={() => navigation.navigate('ProfileEdit', { section: 'work' })}>
        <Info label={t('onboarding.currentWork')} value={seeker.currentWork ?? notSet} />
        <Info label={t('onboarding.previousWork')} value={t('profile.workCount', { count: seeker.workHistory.length })} />
        <Info
          label={t('onboarding.salary')}
          value={seeker.expectedSalary ? `${formatRupees(seeker.expectedSalary)}${t('enums.salaryPer.monthly')}` : notSet}
        />
        <Info label={t('onboarding.availability')} value={seeker.availability ? t(`enums.availability.${seeker.availability}`) : notSet} />
        <Text variant="caption" color="textMuted">
          {t('onboarding.skills')}
        </Text>
        <View style={styles.chips}>
          {seeker.skills.map((skill) => (
            <Chip key={skill} label={skill} role="button" />
          ))}
        </View>
        <Text variant="caption" color="textMuted">
          {t('onboarding.sectors')}
        </Text>
        <View style={styles.chips}>
          {sectorNames.map((sector) => (
            <Chip key={sector.id} label={sectorLabel(t, sector)} role="button" />
          ))}
        </View>
      </EditableSection>

      <View>
        <ListRow icon={BriefcaseBusiness} title={t('menu.myJobs')} onPress={() => navigation.navigate('MyJobs')} />
        <ListRow icon={History} title={t('menu.jobHistory')} onPress={() => navigation.navigate('JobHistory')} />
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  info: { gap: 2, paddingVertical: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
