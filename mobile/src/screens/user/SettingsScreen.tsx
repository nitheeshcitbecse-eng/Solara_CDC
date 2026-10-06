import Constants from 'expo-constants';
import { Bell, Info, Languages, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { BottomSheet } from '../../Components/ui/BottomSheet';
import { Button } from '../../Components/ui/Button';
import { Text } from '../../Components/ui/Text';
import { useAuthActions, useSessionUser } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useMe, useRequestAccountDeletion, useUpdateSettings } from '../../api/queries/profile';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { getLanguage } from '../../lib/i18n/languages';
import { getPushStatus } from '../../lib/push';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { Settings } from '../../lib/types/profile';
import { env } from '../../utils/env';
import { formatDate } from '../../utils/format';

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text variant="body">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Settings for job seekers and hirers (privacy options apply to job seekers only). */
export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const { t } = useTranslation();
  const user = useSessionUser();
  const { activeLanguage } = useLanguage();
  const { signOut } = useAuthActions();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const me = useMe();
  const update = useUpdateSettings();
  const deletion = useRequestAccountDeletion();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSeeker = user.role === 'user';
  const push = getPushStatus();

  const change = (patch: { notifications?: Partial<Settings['notifications']>; privacy?: Partial<Settings['privacy']> }) =>
    update.mutate(patch, { onError: (error) => showToast(errorMessage(error), 'error') });

  const requestDeletion = () => {
    deletion.mutate(undefined, {
      onSuccess: ({ scheduledFor }) => {
        setConfirmDelete(false);
        showToast(t('settings.deleteScheduled', { date: formatDate(scheduledFor, activeLanguage) }), 'info');
        void signOut();
      },
    });
  };

  if (me.isPending || me.isError) {
    return (
      <Screen header={<Header title={t('menu.settings')} />}>
        {me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : <ScreenSkeleton />}
      </Screen>
    );
  }

  const { settings } = me.data;

  return (
    <Screen header={<Header title={t('menu.settings')} />}>
      <Section title={t('settings.language')}>
        <ListRow
          icon={Languages}
          title={getLanguage(activeLanguage).nativeName}
          subtitle={t('settings.languageHint')}
          onPress={() => navigation.navigate('Language', { mode: 'change' })}
        />
      </Section>

      <Section title={t('settings.notifications')}>
        <SwitchRow
          label={isSeeker ? t('settings.notifyApplications') : t('settings.notifyApplicants')}
          value={settings.notifications.applications}
          onChange={(value) => change({ notifications: { applications: value } })}
        />
        <SwitchRow
          label={t('settings.notifyMessages')}
          value={settings.notifications.messages}
          onChange={(value) => change({ notifications: { messages: value } })}
        />
        {isSeeker ? (
          <SwitchRow
            label={t('settings.notifyJobAlerts')}
            hint={t('settings.notifyJobAlertsHint')}
            value={settings.notifications.jobAlerts}
            onChange={(value) => change({ notifications: { jobAlerts: value } })}
          />
        ) : null}
        <View style={styles.pushNote}>
          <Bell size={sizes.iconSm} color={colors.textMuted} strokeWidth={2} />
          <Text variant="caption" color="textMuted" style={styles.flex}>
            {push.state === 'disabled' ? t('settings.pushInApp') : t('settings.pushUnavailable')}
          </Text>
        </View>
      </Section>

      {isSeeker ? (
        <Section title={t('settings.privacy')}>
          <SwitchRow
            label={t('settings.profileVisible')}
            hint={t('settings.profileVisibleHint')}
            value={settings.privacy.profileVisibleToVerifiedHirers}
            onChange={(value) => change({ privacy: { profileVisibleToVerifiedHirers: value } })}
          />
          <SwitchRow
            label={t('settings.sharePhoneDefault')}
            hint={t('settings.sharePhoneDefaultHint')}
            value={settings.privacy.sharePhoneByDefault}
            onChange={(value) => change({ privacy: { sharePhoneByDefault: value } })}
          />
        </Section>
      ) : null}

      <Section title={t('settings.account')}>
        {me.data.deletionRequestedAt ? <InlineAlert tone="warning" message={t('settings.deletionPending')} /> : null}
        <ListRow icon={Trash2} title={t('settings.deleteAccount')} subtitle={t('settings.deleteHint')} tone="danger" onPress={() => setConfirmDelete(true)} />
      </Section>

      <Section title={t('settings.about')}>
        <ListRow
          icon={Info}
          title={t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          subtitle={env.useMockApi ? t('settings.demoMode') : undefined}
        />
      </Section>

      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('settings.deleteTitle')}
        description={t('settings.deleteBody')}
        footer={
          <>
            <Button label={t('settings.deleteConfirm')} variant="danger" onPress={requestDeletion} loading={deletion.isPending} />
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirmDelete(false)} />
          </>
        }
      >
        {deletion.error ? <InlineAlert tone="danger" message={errorMessage(deletion.error)} /> : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  pushNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
});
