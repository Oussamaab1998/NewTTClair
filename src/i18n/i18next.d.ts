import 'i18next';

import type fr from './fr.json';
import type formulas from './formulas/fr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr; formulas: typeof formulas };
  }
}
