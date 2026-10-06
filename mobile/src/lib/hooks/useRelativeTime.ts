import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../../context/LanguageContext';
import { formatDate, relativeTime } from '../../utils/format';

/** "5 min ago" / "2 days ago" / "3 Oct 2026", in the user's language. */
export function useRelativeTime(): (iso: string) => string {
  const { t } = useTranslation();
  const { activeLanguage } = useLanguage();
  return useCallback(
    (iso: string) => {
      const bucket = relativeTime(iso);
      if (bucket.unit === 'now') return t('time.now');
      if (bucket.unit === 'minutes') return t('time.minutes', { count: bucket.count });
      if (bucket.unit === 'hours') return t('time.hours', { count: bucket.count });
      if (bucket.unit === 'days') return t('time.days', { count: bucket.count });
      return formatDate(iso, activeLanguage);
    },
    [t, activeLanguage],
  );
}
