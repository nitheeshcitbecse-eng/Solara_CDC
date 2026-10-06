import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useRelativeTime } from '../../lib/hooks/useRelativeTime';
import type { Application } from '../../lib/types/applications';
import { Text } from '../ui/Text';
import { JobCard } from './JobCard';
import { StatusPill } from './StatusPill';

type ApplicationCardProps = { application: Application; onPress: (applicationId: string) => void };

/** A JobCard showing the application's status pill and when it was sent. */
function ApplicationCardBase({ application, onPress }: ApplicationCardProps) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const open = useCallback(() => onPress(application.id), [onPress, application.id]);
  return (
    <JobCard
      job={application.job}
      onPress={open}
      badge={<StatusPill status={application.status} />}
      footer={
        <Text variant="caption" color="textSubtle">
          {t('applied.sentAt', { time: relativeTime(application.createdAt) })}
        </Text>
      }
    />
  );
}

export const ApplicationCard = memo(ApplicationCardBase);
