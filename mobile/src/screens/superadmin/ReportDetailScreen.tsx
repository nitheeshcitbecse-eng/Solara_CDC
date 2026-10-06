import { BriefcaseBusiness, Check, UserRound, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ReasonSheet } from '../../Components/domain/ReasonSheet';
import { InlineAlert } from '../../Components/feedback/InlineAlert';
import { Header } from '../../Components/layout/Header';
import { ListRow } from '../../Components/layout/ListRow';
import { Screen } from '../../Components/layout/Screen';
import { Section } from '../../Components/layout/Section';
import { Badge } from '../../Components/ui/Badge';
import { Button } from '../../Components/ui/Button';
import { Card } from '../../Components/ui/Card';
import { Text } from '../../Components/ui/Text';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useDecideReport } from '../../api/queries/superadmin';
import { useErrorMessage } from '../../lib/hooks/useErrorMessage';
import { spacing } from '../../lib/theme/tokens';
import type { RootScreenProps } from '../../lib/types/navigation';
import type { Report } from '../../lib/types/superadmin';
import { formatDate, formatTime } from '../../utils/format';

export function ReportDetailScreen({ navigation, route }: RootScreenProps<'ReportDetail'>) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const { showToast } = useToast();
  const errorMessage = useErrorMessage();
  const [report, setReport] = useState<Report>(route.params.report);
  const decide = useDecideReport(report.id);
  const [pending, setPending] = useState<'resolved' | 'dismissed' | null>(null);

  const confirm = (note: string) => {
    if (!pending) return;
    decide.mutate(
      { status: pending, note },
      {
        onSuccess: (updated) => {
          setReport(updated);
          setPending(null);
          showToast(t(`superadmin.reportDecided.${pending}`), 'success');
        },
      },
    );
  };

  const openTarget = () => {
    if (report.targetType === 'job') navigation.navigate('SuperJobDetail', { jobId: report.targetId });
    if (report.targetType === 'user') navigation.navigate('UserDetail', { userId: report.targetId });
  };

  return (
    <Screen
      header={<Header title={t('superadmin.reportTitle')} />}
      footer={
        report.status === 'open' ? (
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label={t('superadmin.dismiss')} icon={X} variant="secondary" onPress={() => setPending('dismissed')} />
            </View>
            <View style={styles.flex}>
              <Button label={t('superadmin.resolve')} icon={Check} onPress={() => setPending('resolved')} />
            </View>
          </View>
        ) : null
      }
    >
      <View style={styles.badges}>
        <Badge label={t(`superadmin.reportStatus.${report.status}`)} tone={report.status === 'open' ? 'warning' : 'neutral'} />
        <Badge label={t(`enums.reportReason.${report.reason}`)} tone="danger" />
      </View>
      <ListRow
        icon={report.targetType === 'user' ? UserRound : BriefcaseBusiness}
        title={report.targetLabel}
        subtitle={t(`superadmin.targetType.${report.targetType}`)}
        onPress={report.targetType === 'message' ? undefined : openTarget}
      />
      <Section title={t('report.details')}>
        <Card>
          <Text variant="body">{report.details || t('superadmin.noDetails')}</Text>
        </Card>
        <Text variant="caption" color="textMuted">
          {t('superadmin.reportedBy', {
            name: report.reporter.name,
            date: `${formatDate(report.createdAt, activeLanguage)} ${formatTime(report.createdAt, activeLanguage)}`,
          })}
        </Text>
      </Section>
      {report.resolutionNote ? (
        <InlineAlert tone={report.status === 'resolved' ? 'success' : 'info'} title={t('superadmin.resolutionNote')} message={report.resolutionNote} />
      ) : null}

      <ReasonSheet
        visible={pending !== null}
        title={pending === 'resolved' ? t('superadmin.resolveTitle') : t('superadmin.dismissTitle')}
        description={pending === 'resolved' ? t('superadmin.resolveBody') : t('superadmin.dismissBody')}
        confirmLabel={pending === 'resolved' ? t('superadmin.resolve') : t('superadmin.dismiss')}
        tone={pending === 'resolved' ? 'primary' : 'danger'}
        loading={decide.isPending}
        error={decide.error ? errorMessage(decide.error) : null}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
});
