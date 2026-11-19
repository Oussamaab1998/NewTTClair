/**
 * Dev tab «Formules» (`-devTab formulas`): the whole flow on the app's
 * store, for one class picked here (it starts from the saved class, else
 * Bac Mathématiques). Stage 5 of docs/FORMULAS_PLAN.md replaces this with
 * the home card, the chapter link and the card before a question.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SectionId, Year } from '../../../content/curriculum';
import { FORMULAS_KEY } from '../../../formulas/log';
import { appStore } from '../../../storage/appStore';
import { theme } from '../../../theme';
import { loadStudentClass } from '../chapters/studentClass';
import { FormulasFlow, useClassLabel } from './FormulasFlow';

const CLASSES: readonly { year: Year; section: SectionId | null }[] = [
  { year: '4s', section: 'mathematiques' },
  { year: '4s', section: 'sciences-experimentales' },
  { year: '3s', section: 'mathematiques' },
];

export function FormulasDemoScreen() {
  const { t } = useTranslation('formulas');
  const classLabel = useClassLabel();
  const store = useMemo(() => appStore(), []);
  const [cls, setCls] = useState(() => loadStudentClass(store) ?? CLASSES[0]!);
  const [run, setRun] = useState(0);
  return (
    <View style={local.root}>
      <View style={local.bar}>
        {CLASSES.map(c => {
          const on = c.year === cls.year && c.section === cls.section;
          return (
            <Pressable
              key={`${c.year}-${c.section}`}
              style={[local.chip, on && local.chipOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setCls(c)}
            >
              <Text style={[local.chipText, on && local.chipTextOn]}>
                {classLabel(c.year, c.section)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={local.chip}
          accessibilityRole="button"
          testID="formulas-demo-reset"
          onPress={() => {
            store.remove(FORMULAS_KEY);
            setRun(r => r + 1);
          }}
        >
          <Text style={local.chipText}>{t('demo.reset')}</Text>
        </Pressable>
      </View>
      <FormulasFlow
        key={`${cls.year}-${cls.section}-${run}`}
        store={store}
        year={cls.year}
        section={cls.section}
        onClose={() => setRun(r => r + 1)}
      />
    </View>
  );
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundApp },
  bar: {
    flexDirection: theme.mathSide.row,
    flexWrap: 'wrap',
    gap: theme.space.xxs,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xxs,
    borderBottomColor: theme.color.borderDefault,
    borderBottomWidth: theme.border.hairline,
  },
  chip: {
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  chipOn: { backgroundColor: theme.color.ink, borderColor: theme.color.ink },
  chipText: { ...theme.font.small, color: theme.color.textPrimary },
  chipTextOn: { color: theme.color.textOnAccent },
});
