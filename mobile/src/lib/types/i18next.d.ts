import 'i18next';

import type { en } from '../i18n/locales/en';

// Makes `t('some.key')` type-checked: a typo or a missing key is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
