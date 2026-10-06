import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { en } from '../i18n/locales/en';
import type { AppNotification } from '../types/messages';

type ApplicationStatusKey = keyof typeof en.enums.applicationStatus;
type JobStatusKey = keyof typeof en.enums.jobStatus;
type SystemTopic = keyof typeof en.notifications.system;

const isApplicationStatus = (value: string | undefined): value is ApplicationStatusKey =>
  value !== undefined && value in en.enums.applicationStatus;
const isJobStatus = (value: string | undefined): value is JobStatusKey => value !== undefined && value in en.enums.jobStatus;
const isSystemTopic = (value: string | undefined): value is SystemTopic => value !== undefined && value in en.notifications.system;

/**
 * Notifications arrive as `type` + `params` (never pre-written text), so they are
 * always rendered in the user's current language.
 */
export function useNotificationCopy(): (notification: AppNotification) => { title: string; body: string } {
  const { t } = useTranslation();
  return useCallback(
    (notification: AppNotification) => {
      const { params } = notification;
      switch (notification.type) {
        case 'application_status': {
          const status = isApplicationStatus(params.status) ? t(`enums.applicationStatus.${params.status}`) : '';
          return {
            title: t('notifications.applicationStatus.title'),
            body: t('notifications.applicationStatus.body', { jobTitle: params.jobTitle ?? '', status }),
          };
        }
        case 'new_applicant':
          return {
            title: t('notifications.newApplicant.title'),
            body: t('notifications.newApplicant.body', { name: params.name ?? '', jobTitle: params.jobTitle ?? '' }),
          };
        case 'message':
          return { title: t('notifications.message.title'), body: t('notifications.message.body', { name: params.name ?? '' }) };
        case 'verification':
          return {
            title: t('notifications.verification.title'),
            body: params.status === 'verified' ? t('notifications.verification.verified') : t('notifications.verification.rejected'),
          };
        case 'job_review': {
          const status = isJobStatus(params.status) ? t(`enums.jobStatus.${params.status}`) : '';
          return {
            title: t('notifications.jobReview.title'),
            body: t('notifications.jobReview.body', { jobTitle: params.jobTitle ?? '', status }),
          };
        }
        case 'system': {
          const topic = isSystemTopic(params.topic) ? params.topic : 'welcome';
          return { title: t(`notifications.system.${topic}.title`), body: t(`notifications.system.${topic}.body`) };
        }
      }
    },
    [t],
  );
}
