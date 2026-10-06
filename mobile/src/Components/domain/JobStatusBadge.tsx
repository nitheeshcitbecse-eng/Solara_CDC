import { useTranslation } from 'react-i18next';

import type { JobStatus } from '../../lib/types/jobs';
import { Badge, type BadgeTone } from '../ui/Badge';

const TONES: Record<JobStatus, BadgeTone> = {
  draft: 'neutral',
  analysing: 'brand',
  pending_review: 'warning',
  active: 'success',
  closed: 'neutral',
  rejected: 'danger',
  taken_down: 'danger',
};

/** A posted job's lifecycle state (hirer and superadmin views). */
export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`enums.jobStatus.${status}`)} tone={TONES[status]} />;
}
