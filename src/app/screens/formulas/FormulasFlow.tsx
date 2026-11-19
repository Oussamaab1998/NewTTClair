/**
 * «Formules» (docs/FORMULAS_PLAN.md, stage 4): the list, the hide mode, the
 * rule card, «S’entraîner», the Vérif rapide and its result, over one record
 * (`formulas.v1`). The rules are those of his year and the year before
 * (decision 8). Every answer is saved at once.
 *
 * Not wired into the app yet (stage 5): it opens from the dev tab
 * «Formules» (FormulasDemoScreen). `onEvent` receives the «Formules» events
 * (src/formulas/events.ts) until they join the app's event log.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import type { z } from 'zod';

import { CURRICULUM, type SectionId, type Year } from '../../../content/curriculum';
import { pickCheck, dueRules } from '../../../formulas/check';
import type {
  FormulaCheckFields,
  FormulaDrillFields,
  FormulaViewFields,
} from '../../../formulas/events';
import {
  loadFormulas,
  noteAnswer,
  ruleState,
  saveFormulas,
  type FormulaLog,
} from '../../../formulas/log';
import {
  listGroups,
  placeOf,
  rulePlan,
  themePlan,
  RULE_SESSION,
  type ListFilter,
  type PlannedItem,
} from '../../../formulas/session';
import { THEMES } from '../../../formulas/themes';
import { visibleRules } from '../../../formulas/visible';
import type { KeyValueStore } from '../../../storage/kv';
import { CheckResult, type ResultRow } from './CheckResult';
import { DrillSession, type Recorded, type SessionResult } from './DrillSession';
import { FormulaList, HideMode, usePlaceLabel } from './FormulaList';
import { Bar, Button, FormulasHeader, styles } from './parts';
import { RuleCard } from './RuleCard';

export type FormulaEventDraft =
  | z.infer<typeof FormulaViewFields>
  | z.infer<typeof FormulaDrillFields>
  | z.infer<typeof FormulaCheckFields>;

type Screen =
  | { kind: 'list' }
  | { kind: 'hide' }
  | { kind: 'card'; ruleId: string }
  | { kind: 'train'; plan: PlannedItem[]; name: string; back: Screen }
  | { kind: 'trainEnd'; back: Screen }
  | { kind: 'check'; plan: PlannedItem[] }
  | { kind: 'result'; results: SessionResult[] };

/** "Bac Mathématiques", "3ème Sciences expérimentales", "1ère". */
export function useClassLabel(): (year: Year, section: SectionId | null) => string {
  const { t } = useTranslation('formulas');
  return (year, section) => {
    const name = CURRICULUM.sections.find(s => s.id === section)?.fr;
    return name ? `${t(`years.${year}`)} ${name}` : t(`years.${year}`);
  };
}

export function FormulasFlow({
  store,
  year,
  section,
  themeId = 'derivees',
  now = Date.now,
  newSeed = () => Math.floor(Math.random() * 1_000_000),
  onClose,
  onEvent,
}: {
  store: KeyValueStore;
  year: Year;
  section: SectionId | null;
  themeId?: string;
  now?: () => number;
  newSeed?: () => number;
  onClose: () => void;
  onEvent?: (e: FormulaEventDraft) => void;
}) {
  const { t } = useTranslation('formulas');
  const placeLabel = usePlaceLabel();
  const classLabel = useClassLabel();
  const theme = THEMES.find(th => th.theme === themeId) ?? THEMES[0]!;
  const visible = useMemo(() => visibleRules([theme], year, section), [theme, year, section]);
  const pool = useMemo(() => visible.map(v => v.rule), [visible]);
  const rules = useMemo(() => new Map(pool.map(r => [r.id, r])), [pool]);
  const reminderOf = (id: string) => visible.find(v => v.rule.id === id)?.reminder ?? false;

  const [log, setLog] = useState<FormulaLog>(() => loadFormulas(store));
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [filter, setFilter] = useState<ListFilter>('all');
  const [didnt, setDidnt] = useState<ReadonlySet<string>>(new Set());
  const emit = (e: FormulaEventDraft) => onEvent?.(e);

  const save = (ruleId: string, mode: 'drill' | 'check', answer: Recorded) => {
    setLog(prev => {
      const next = noteAnswer(prev, ruleId, { ...answer, at: now(), mode });
      saveFormulas(store, next);
      return next;
    });
  };

  const time = now();
  const open = (s: Screen) => setScreen(s);

  switch (screen.kind) {
    case 'list': {
      const due = dueRules(log, visible, time);
      return (
        <FormulaList
          themeTitle={theme.title}
          who={classLabel(year, section)}
          groups={listGroups(visible, log, time, year, section, filter)}
          filter={filter}
          onFilter={setFilter}
          now={time}
          dueCount={due.length}
          onCheck={() => {
            const plan = pickCheck(log, visible, time, newSeed()).map((p, i) => ({
              ...p,
              seed: newSeed() + i,
            }));
            emit({ t: 'formula_check', action: 'start', items: plan.length });
            open({ kind: 'check', plan });
          }}
          onOpen={ruleId => {
            emit({ t: 'formula_view', what: 'card', ruleId });
            open({ kind: 'card', ruleId });
          }}
          onTrain={() =>
            open({
              kind: 'train',
              plan: themePlan(visible, log, time, newSeed()),
              name: theme.title,
              back: { kind: 'list' },
            })
          }
          onHide={() => {
            emit({ t: 'formula_view', what: 'hide_mode' });
            open({ kind: 'hide' });
          }}
          onBack={onClose}
        />
      );
    }
    case 'hide':
      return (
        <HideMode
          groups={listGroups(visible, log, time, year, section, 'all')}
          firstIds={didnt}
          onSaid={(ruleId, knew) =>
            setDidnt(s => {
              const n = new Set(s);
              if (knew) {
                n.delete(ruleId);
              } else {
                n.add(ruleId);
              }
              return n;
            })
          }
          onBack={() => open({ kind: 'list' })}
        />
      );
    case 'card': {
      const rule = rules.get(screen.ruleId);
      const place = rule ? placeOf(rule, year, section) : null;
      if (!rule || !place) {
        return null;
      }
      return (
        <RuleCard
          rule={rule}
          placeLabel={placeLabel(place)}
          questions={RULE_SESSION}
          onTrain={() =>
            open({
              kind: 'train',
              plan: rulePlan(rule, pool, newSeed()),
              name: rule.name,
              back: screen,
            })
          }
          onBack={() => open({ kind: 'list' })}
        />
      );
    }
    case 'train':
      return (
        <DrillSession
          key={`train-${screen.plan[0]?.seed ?? 0}`}
          mode="drill"
          title={t('drill.title')}
          name={screen.name}
          plan={screen.plan}
          rules={rules}
          pool={pool}
          onAnswer={(ruleId, r) => {
            save(ruleId, 'drill', r);
            emit({ t: 'formula_drill', ruleId, ...r });
          }}
          onEnd={() => open({ kind: 'trainEnd', back: screen.back })}
          onClose={() => open(screen.back)}
        />
      );
    case 'trainEnd':
      return (
        <View style={styles.root} testID="formulas-train-end">
          <FormulasHeader title={t('drill.endTitle')} onBack={() => open(screen.back)} />
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.text}>{t('drill.endText')}</Text>
          </ScrollView>
          <Bar>
            <Button
              label={t('drill.endBack')}
              onPress={() => open({ kind: 'list' })}
              grow
              testID="train-end-back"
            />
          </Bar>
        </View>
      );
    case 'check':
      return (
        <DrillSession
          key={`check-${screen.plan[0]?.seed ?? 0}`}
          mode="check"
          title={t('check.title')}
          name={t('check.subtitle')}
          plan={screen.plan}
          rules={rules}
          pool={pool}
          onAnswer={(ruleId, r) => {
            save(ruleId, 'check', r);
            if (r.kind !== 'calc' && r.verdict !== 'dont_know') {
              emit({
                t: 'formula_check',
                action: 'answer',
                ruleId,
                kind: r.kind,
                verdict: r.verdict,
                ...(r.trapId !== undefined ? { trapId: r.trapId } : {}),
              });
            }
          }}
          onEnd={results => {
            emit({ t: 'formula_check', action: 'end', items: results.length });
            open({ kind: 'result', results });
          }}
          onClose={() => open({ kind: 'list' })}
        />
      );
    case 'result': {
      const rows: ResultRow[] = screen.results.flatMap(r => {
        const rule = rules.get(r.ruleId);
        return rule
          ? [{ rule, verdict: r.verdict, state: ruleState(log.entries[r.ruleId], time, reminderOf(r.ruleId)) }]
          : [];
      });
      return (
        <CheckResult
          rows={rows}
          now={time}
          onReview={ruleId => open({ kind: 'card', ruleId })}
          onFinish={() => open({ kind: 'list' })}
        />
      );
    }
  }
}
