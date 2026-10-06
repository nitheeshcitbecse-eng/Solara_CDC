import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessageKey, toAppError } from '../../utils/errors';

/** Turns any thrown value into user-facing, translated copy (never server text). */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown) => {
      const appError = toAppError(error);
      if (appError.code === 'RATE_LIMITED' && appError.retryAfter) {
        return t('errors.retryIn', { seconds: appError.retryAfter });
      }
      return t(errorMessageKey(appError));
    },
    [t],
  );
}
