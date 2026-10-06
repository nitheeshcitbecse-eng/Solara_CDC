import { BadgeCheck, BriefcaseBusiness, Handshake, MessageSquare, Phone, Star, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { StatusPill } from '../../Components/domain/StatusPill';
import { StatusTimeline } from '../../Components/domain/StatusTimeline';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { AudioPlayer } from '../../Components/media/AudioPlayer';
import { Avatar } from '../../Components/ui/Avatar';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Chip } from '../../Components/ui/Chip';
import { Text } from '../../Components/ui/Text';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useApplicant, useDecideApplication, useOpenConversation } from '../../api/queries/applications';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { getLanguage } from '../../lib/i18n/languages';
import { colors, sizes, spacing } from '../../lib/theme/tokens';
import type { HirerDecision } from '../../lib/types/applications';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatDate, formatMonth, formatPhone, formatRupees } from '../../utils/format';

/** One applicant for the hirer: profile, message, voice intro and the hire decision. */
export function ApplicantDetailScreen({ navigation, route }: RootScreenProps<'ApplicantDetail'>) {
  const { applicationId } = route.params;
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const applicant = useApplicant(applicationId);
  const decide = useDecideApplication(applicationId);
  const openConversation = useOpenConversation();

  if (applicant.isPending || applicant.isError) {
    return (
      <Screen header={<Header title={t('applicants.detailTitle')} />}>
        {applicant.isPending ? <ScreenSkeleton variant="detail" /> : <ErrorState error={applicant.error} onRetry={() => void applicant.refetch()} />}
      </Screen>
    );
  }

  const data = applicant.data;
  const person = data.applicant;

  const runDecision = (status: HirerDecision) =>
    decide.mutate(status, {
      onSuccess: () => showToast(t(`applicants.decided.${status}`), 'success'),
      onError: (error) => showToast(errorMessage(error), 'error'),
    });

  // Hiring and rejecting notify the applicant immediately, so we confirm first.
  const confirm = (status: 'hired' | 'rejected') =>
    Alert.alert(t(`applicants.confirm.${status}.title`), t(`applicants.confirm.${status}.body`, { name: person.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t(`applicants.confirm.${status}.action`), style: status === 'rejected' ? 'destructive' : 'default', onPress: () => runDecision(status) },
    ]);

  const message = () => {
    if (data.conversationId) {
      navigation.navigate('Chat', { conversationId: data.conversationId, title: person.name });
      return;
    }
    openConversation.mutate(applicationId, {
      onSuccess: (conversation) => navigation.navigate('Chat', { conversationId: conversation.id, title: person.name }),
    });
  };

  const canShortlist = data.status === 'applied';
  const canDecide = data.status === 'applied' || data.status === 'shortlisted';

  return (
    <Screen
      header={<Header title={t('applicants.detailTitle')} subtitle={data.jobTitle} />}
      footer={
        <>
          {canDecide ? (
            <View style={styles.decisionRow}>
              {canShortlist ? (
                <View style={styles.flex}>
                  <Button label={t('applicants.shortlist')} icon={Star} variant="secondary" onPress={() => runDecision('shortlisted')} loading={decide.isPending} />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Button label={t('applicants.hire')} icon={Handshake} onPress={() => confirm('hired')} disabled={decide.isPending} />
              </View>
            </View>
          ) : null}
          <View style={styles.decisionRow}>
            <View style={styles.flex}>
              <Button label={t('applicants.message')} icon={MessageSquare} variant="secondary" onPress={message} loading={openConversation.isPending} />
            </View>
            {canDecide ? (
              <View style={styles.flex}>
                <Button label={t('applicants.reject')} icon={X} variant="secondary" onPress={() => confirm('rejected')} disabled={decide.isPending} />
              </View>
            ) : null}
          </View>
        </>
      }
    >
      <View style={styles.identity}>
        <Avatar name={person.name} size="lg" />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text variant="title" style={styles.shrink}>
              {person.name}
            </Text>
            {person.verified ? <BadgeCheck size={sizes.icon} color={colors.success} strokeWidth={2} accessibilityLabel={t('common.verified')} /> : null}
          </View>
          <Text variant="body" color="textMuted">
            {[data.profile.age ? t('profile.age', { count: data.profile.age }) : null, person.city].filter(Boolean).join(' · ')}
          </Text>
          <StatusPill status={data.status} />
        </View>
      </View>

      {openConversation.error ? <InlineAlert tone="danger" message={errorMessage(openConversation.error)} /> : null}

      <Section title={t('applicants.theirMessage')}>
        <Card>
          <Text variant="body">{data.message}</Text>
        </Card>
        <Card>
          <AudioPlayer uri={data.voiceIntro.url} durationSec={data.voiceIntro.durationSec} label={t('apply.voice')} />
        </Card>
      </Section>

      <Section title={t('apply.details')}>
        <Text variant="body">{`${t('apply.expectedSalary')}: ${data.expectedSalary ? formatRupees(data.expectedSalary) : t('apply.notSpecified')}`}</Text>
        <Text variant="body">
          {`${t('apply.availableFrom')}: ${data.availableFrom ? formatDate(data.availableFrom, activeLanguage) : t('apply.notSpecified')}`}
        </Text>
        {data.phone ? (
          <ListRow
            icon={Phone}
            title={formatPhone(data.phone)}
            subtitle={t('applicants.call')}
            onPress={() => void Linking.openURL(`tel:${data.phone ?? ''}`)}
          />
        ) : (
          <Text variant="caption" color="textMuted">
            {t('applicants.phoneHidden')}
          </Text>
        )}
      </Section>

      <Section title={t('applicants.profile')}>
        <Text variant="body">
          {`${t('onboarding.qualification')}: ${data.profile.qualification ? t(`enums.qualification.${data.profile.qualification}`) : t('profile.notSet')}`}
        </Text>
        <Text variant="body">
          {`${t('onboarding.languages')}: ${data.profile.languagesKnown.map((code) => getLanguage(code).nativeName).join(' · ') || t('profile.notSet')}`}
        </Text>
        {data.profile.currentWork ? <Text variant="body">{`${t('onboarding.currentWork')}: ${data.profile.currentWork}`}</Text> : null}
        <View style={styles.chips}>
          {person.skills.map((skill) => (
            <Chip key={skill} label={skill} role="button" />
          ))}
        </View>
        {data.profile.workHistory.map((entry) => (
          <View key={entry.id} style={styles.work}>
            <BriefcaseBusiness size={sizes.iconSm} color={colors.primary} strokeWidth={2} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{entry.title}</Text>
              <Text variant="caption" color="textMuted">
                {`${entry.employer} · ${formatMonth(entry.from, activeLanguage)} – ${entry.to ? formatMonth(entry.to, activeLanguage) : t('common.present')}`}
              </Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title={t('applied.timeline')}>
        <StatusTimeline events={data.timeline} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  decisionRow: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  work: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
});
