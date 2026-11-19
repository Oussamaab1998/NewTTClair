import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import arTN from './ar-TN.json';
import fr from './fr.json';
import formulasArTN from './formulas/ar-TN.json';
import formulasFr from './formulas/fr.json';

export const LOCALES = ['ar-TN', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

/** «Formules» (docs/FORMULAS_PLAN.md) keeps its words in its own namespace. */
export const resources = {
  'ar-TN': { translation: arTN, formulas: formulasArTN },
  fr: { translation: fr, formulas: formulasFr },
} as const;

export function isRtlLocale(locale: Locale): boolean {
  return locale === 'ar-TN';
}

// Resources are bundled, so init is synchronous (initAsync: false).
i18next.use(initReactI18next).init({
  resources,
  lng: 'ar-TN',
  fallbackLng: 'fr',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18next;
