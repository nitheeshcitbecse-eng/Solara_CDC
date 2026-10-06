import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../../context/LanguageContext';
import type { Engagement } from '../../lib/types/jobs';
import { formatDate } from '../../utils/format';
import { Text } from '../ui/Text';
import { JobCard } from './JobCard';

type EngagementCardProps = { engagement: Engagement; onPress: (engagement: Engagement) => void };

/** A job the seeker was hired for — current ("since …") or past ("… – …"). */
function EngagementCardBase({ engagement, onPress }: EngagementCardProps) {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  const open = useCallback(() => onPress(engagement), [onPress, engagement]);
  const started = formatDate(engagement.startedOn, activeLanguage);
  const period = engagement.endedOn
    ? t('myJobs.period', { from: started, to: formatDate(engagement.endedOn, activeLanguage) })
    : t('myJobs.since', { date: started });

  return (
    <JobCard
      job={engagement.job}
      onPress={open}
      footer={
        <Text variant="caption" color="textSubtle">
          {period}
        </Text>
      }
    />
  );
}

export const EngagementCard = memo(EngagementCardBase);
