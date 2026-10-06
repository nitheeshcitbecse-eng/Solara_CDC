import { MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { JobCard } from '../../Components/domain/JobCard';
import { StatusPill } from '../../Components/domain/StatusPill';
import { StatusTimeline } from '../../Components/domain/StatusTimeline';
import { InlineAlert, type AlertTone } from '../../Components/feedback/InlineAlert';
import { ErrorState } from '../../Components/layout/ErrorState';
import { Header } from '../../Components/layout/Header';
import { Screen } from '../../Components/layout/Screen';
import { ScreenSkeleton } from '../../Components/layout/ScreenSkeleton';
import { Section } from '../../Components/layout/Section';
import { AudioPlayer } from '../../Components/media/AudioPlayer';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Text } from '../../Components/ui/Text';
import { useLanguage } from '../../context/LanguageContext';
import { useMyApplication, useOpenConversation } from '../../api/queries/applications';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { spacing } from '../../lib/theme/tokens';
import type { ApplicationStatus } from '../../lib/types/applications';
import type { RootScreenProps } from '../../lib/types/navigation';
import { formatDate, formatRupees } from '../../utils/format';

const STATUS_TONE: Record<ApplicationStatus, AlertTone> = {
  applied: 'info',
  shortlisted: 'warning',
  hired: 'success',
  rejected: 'danger',
};

export function ApplicationDetailsScreen({ navigation, route }: RootScreenProps<'ApplicationDetails'>) {
  const { applicationId } = route.params;
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const errorMessage = useErrorMessage();
  const application = useMyApplication(applicationId);
  const openConversation = useOpenConversation();

  if (application.isPending || application.isError) {
    return (
      <Screen header={<Header title={t('applied.detailsTitle')} />}>
        {application.isPending ? (
          <ScreenSkeleton variant="detail" />
        ) : (
          <ErrorState error={application.error} onRetry={() => void application.refetch()} />
        )}
      </Screen>
    );
  }

  const data = application.data;
  const hirerName = data.job.hirer.displayName;

  const messageHirer = () => {
    if (data.conversationId) {
      navigation.navigate('Chat', { conversationId: data.conversationId, title: hirerName });
      return;
    }
    openConversation.mutate(applicationId, {
      onSuccess: (conversation) => navigation.navigate('Chat', { conversationId: conversation.id, title: conversation.participant.name }),
    });
  };

  return (
    <Screen
      header={<Header title={t('applied.detailsTitle')} />}
      footer={
        <Button label={t('applied.messageHirer')} icon={MessageSquare} onPress={messageHirer} loading={openConversation.isPending} />
      }
    >
      <JobCard job={data.job} onPress={(jobId) => navigation.navigate('JobDetails', { jobId })} badge={<StatusPill status={data.status} />} />

      <InlineAlert tone={STATUS_TONE[data.status]} message={t(`applied.statusMessage.${data.status}`)} />
      {openConversation.error ? <InlineAlert tone="danger" message={errorMessage(openConversation.error)} /> : null}

      <Card>
        <Text variant="caption" color="textMuted">
          {t('applied.salary')}
        </Text>
        <Text variant="heading" color="primary" latin>
          {`${formatRupees(data.job.salary.amount)}${t(`enums.salaryPer.${data.job.salary.type}`)}`}
        </Text>
      </Card>

      {/* An exact snapshot of what was sent — applications can't be edited after submitting. */}
      <Section title={t('applied.whatYouSent')}>
        <Card>
          <Text variant="body">{data.message}</Text>
        </Card>
        <Card>
          <AudioPlayer uri={data.voiceIntro.url} durationSec={data.voiceIntro.durationSec} label={t('apply.voice')} />
        </Card>
        <View style={styles.facts}>
          <Text variant="body">
            {`${t('apply.expectedSalary')}: ${data.expectedSalary ? formatRupees(data.expectedSalary) : t('apply.notSpecified')}`}
          </Text>
          <Text variant="body">
            {`${t('apply.availableFrom')}: ${data.availableFrom ? formatDate(data.availableFrom, activeLanguage) : t('apply.notSpecified')}`}
          </Text>
          <Text variant="body">{data.sharePhone ? t('apply.phoneShared') : t('apply.phoneHidden')}</Text>
        </View>
      </Section>

      <Section title={t('applied.timeline')}>
        <StatusTimeline events={data.timeline} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  facts: { gap: spacing.xxs },
});
