import { ShieldAlert, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../../lib/theme/tokens';
import type { JobAnalysisComplete } from '../../lib/types/jobs';
import { InlineAlert } from '../feedback/InlineAlert';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { WorkplaceRatingBadge } from './WorkplaceRatingBadge';

/** The AI's verdict on the workplace photos: difficulty, safety, hazards and a summary. */
export function AnalysisResult({ analysis }: { analysis: JobAnalysisComplete }) {
  const { t } = useTranslation();
  const confidence = Math.round(analysis.confidence * 100);

  return (
    <View style={styles.container}>
      {analysis.verdict === 'pass' ? (
        <InlineAlert tone="success" title={t('addWork.passTitle')} message={t('addWork.passBody')} />
      ) : null}
      {analysis.verdict === 'unsafe' ? (
        <View style={styles.danger} accessibilityRole="alert">
          <TriangleAlert size={sizes.iconLg} color={colors.textOnDark} strokeWidth={2} />
          <Text variant="heading" color="textOnDark">
            {t('addWork.unsafeTitle')}
          </Text>
          <Text variant="body" color="textOnDarkMuted">
            {t('addWork.unsafeBody')}
          </Text>
        </View>
      ) : null}
      {analysis.verdict === 'rejected' ? (
        <InlineAlert
          tone="danger"
          title={t('addWork.rejectedTitle')}
          message={analysis.rejectionReason === 'ai_generated' ? t('addWork.rejectedAi') : t('addWork.rejectedUnrelated')}
        />
      ) : null}

      {analysis.verdict !== 'rejected' ? (
        <Card>
          <Text variant="caption" color="textMuted">
            {t('job.workplaceRating')}
          </Text>
          <View style={styles.ratingRow}>
            <WorkplaceRatingBadge difficulty={analysis.difficulty} size="lg" />
            <View style={styles.safety}>
              {analysis.safety === 'safe' ? (
                <ShieldCheck size={sizes.icon} color={colors.success} strokeWidth={2} />
              ) : (
                <ShieldAlert size={sizes.icon} color={analysis.safety === 'unsafe' ? colors.danger : colors.warning} strokeWidth={2} />
              )}
              <Text variant="bodyStrong" color={analysis.safety === 'safe' ? 'success' : analysis.safety === 'unsafe' ? 'danger' : 'warning'}>
                {t(`enums.safety.${analysis.safety}`)}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {analysis.hazards.length > 0 ? (
        <Section title={t('addWork.hazards')}>
          {analysis.hazards.map((hazard) => (
            <View key={hazard} style={styles.hazard}>
              <View style={styles.hazardDot} />
              <Text variant="body">{t(`enums.hazard.${hazard}`)}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      <Card tone="muted">
        <View style={styles.summaryHeader}>
          <Sparkles size={sizes.iconSm} color={colors.primary} strokeWidth={2} />
          <Text variant="label" color="textMuted">
            {t('addWork.aiSummary')}
          </Text>
        </View>
        <Text variant="body">{analysis.summary}</Text>
        <Text variant="caption" color="textSubtle">
          {t('addWork.confidence', { percent: confidence })}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  danger: { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  safety: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hazard: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hazardDot: { width: sizes.badgeDot, height: sizes.badgeDot, borderRadius: radius.pill, backgroundColor: colors.warning },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
