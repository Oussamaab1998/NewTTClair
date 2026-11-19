import '../../../i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { toString } from '../../../engine/expression';
import { pickCheck } from '../../../formulas/check';
import { drillItem, type CalcItem, type DrillItem } from '../../../formulas/drills/drills';
import { emptyFormulas, loadFormulas } from '../../../formulas/log';
import { rulePlan } from '../../../formulas/session';
import { ruleById, THEMES } from '../../../formulas/themes';
import { visibleRules } from '../../../formulas/visible';
import { memoryStore } from '../../../storage/kv';
import { FormulasFlow, type FormulaEventDraft } from './FormulasFlow';

// The worksheet is driven by its keys in FormulasCalc.test.tsx; here a
// stand-in sends whole lines, so a test can write any expression.
let mockLine = '';
jest.mock('../../../lesson/worksheet/Worksheet', () => {
  const { Pressable } = require('react-native');
  return {
    Worksheet: (props: { onSubmit: (raw: string, info: object) => void }) => (
      <Pressable
        testID="mock-sheet-submit"
        onPress={() => props.onSubmit(mockLine, { nodes: [], fixes: null, keys: [] })}
      />
    ),
  };
});

const NOW = new Date(2026, 10, 19, 10).getTime();
const SEED = 7;
const bac = visibleRules(THEMES, '4s', 'mathematiques');
const pool = bac.map(v => v.rule);

async function open(year: '4s' | '3s' = '4s') {
  const store = memoryStore();
  const events: FormulaEventDraft[] = [];
  const onClose = jest.fn();
  await render(
    <FormulasFlow
      store={store}
      year={year}
      section="mathematiques"
      now={() => NOW}
      newSeed={() => SEED}
      onClose={onClose}
      onEvent={e => events.push(e)}
    />,
  );
  return { store, events, onClose };
}

/** Taps the right answer of a tap drill. */
async function answerRight(item: DrillItem) {
  if (item.kind === 'complete') {
    await fireEvent.press(screen.getByTestId(`drill-tile-${item.tiles.findIndex(t => t.right)}`));
  } else if (item.kind === 'true_false') {
    await fireEvent.press(screen.getByTestId(item.isTrue ? 'drill-true' : 'drill-false'));
  } else if (item.kind === 'recognise') {
    await fireEvent.press(screen.getByTestId(`drill-option-${item.ruleId}`));
  }
}

async function submitLine(raw: string) {
  mockLine = raw;
  await fireEvent.press(screen.getByTestId('mock-sheet-submit'));
}

describe('the list', () => {
  it('a new Bac student: the Vérif card (the 3ème reminders are due), the Bac chapters, then the reminders', async () => {
    await open();
    expect(screen.getByTestId('formulas-check-card')).toBeTruthy();
    expect(screen.getByText('9 formules à revoir · environ 2 min')).toBeTruthy();
    expect(screen.getByText('Bac · Dérivabilité')).toBeTruthy();
    expect(screen.getByText('Rappel de 3ème · Fonction dérivée')).toBeTruthy();
    expect(screen.getByTestId('formula-row-deriv.quotient')).toBeTruthy();
    expect(screen.getAllByTestId('formula-status-nouvelle')).toHaveLength(12);
  });

  it('a 3ème student: nothing due, no reminder', async () => {
    await open('3s');
    expect(screen.queryByTestId('formulas-check-card')).toBeNull();
    expect(screen.queryByText(/Rappel/)).toBeNull();
    expect(screen.getByText('3ème · Fonction dérivée')).toBeTruthy();
  });

  it('a filter with nothing in it keeps the filters', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('formulas-filter-retenue'));
    expect(screen.queryByTestId('formula-row-deriv.quotient')).toBeNull();
    expect(screen.getByTestId('formulas-filter-all')).toBeTruthy();
  });
});

describe('the rule card and its training', () => {
  it('opens the card, then 6 questions recorded one by one', async () => {
    const { store, events } = await open();
    await fireEvent.press(screen.getByTestId('formula-row-deriv.quotient'));
    expect(screen.getByTestId('formula-card')).toBeTruthy();
    expect(screen.getByText('Dérivée d’un quotient')).toBeTruthy();
    expect(screen.getByText('Inverser l’ordre au numérateur')).toBeTruthy();
    expect(events).toContainEqual({ t: 'formula_view', what: 'card', ruleId: 'deriv.quotient' });

    await fireEvent.press(screen.getByTestId('formula-card-train'));
    const rule = ruleById('deriv.quotient')!;
    const plan = rulePlan(rule, pool, SEED);
    const items = plan.map(p => drillItem(rule, p.kind, pool, p.seed));
    expect(items.map(i => i.kind)).toEqual([
      'complete',
      'true_false',
      'calc',
      'true_false',
      'recognise',
      'calc',
    ]);

    // 1. «Complète», right.
    await answerRight(items[0]!);
    expect(screen.getByTestId('drill-feedback')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('drill-continue'));
    // 2. «Vrai ou faux», right.
    await answerRight(items[1]!);
    await fireEvent.press(screen.getByTestId('drill-continue'));
    // 3. «Calcule»: the swapped order first (named), then the right line.
    const calc = items[2] as CalcItem;
    const swapped = calc.traps.find(t => t.id === 'order_swapped')!;
    expect(screen.queryByTestId('drill-continue')).toBeNull();
    await submitLine(toString(swapped.d));
    expect(screen.getByText('✗ Inverser l’ordre au numérateur')).toBeTruthy();
    expect(screen.getByText('L’ordre compte : u′v d’abord, puis moins uv′.')).toBeTruthy();
    await submitLine(toString(calc.expected));
    expect(screen.getByText('✓ Juste.')).toBeTruthy();

    const answers = loadFormulas(store).entries['deriv.quotient']!.answers;
    expect(answers.map(a => [a.mode, a.kind, a.verdict, a.trapId])).toEqual([
      ['drill', 'complete', 'right', undefined],
      ['drill', 'true_false', 'right', undefined],
      ['drill', 'calc', 'trap', 'order_swapped'],
    ]);
    expect(events.filter(e => e.t === 'formula_drill')).toHaveLength(3);
  });

  it('«ما نعرفش» in «Calcule»: three levels, recorded once, then he can go on', async () => {
    const { store } = await open();
    await fireEvent.press(screen.getByTestId('formula-row-deriv.quotient'));
    await fireEvent.press(screen.getByTestId('formula-card-train'));
    const rule = ruleById('deriv.quotient')!;
    const items = rulePlan(rule, pool, SEED).map(p => drillItem(rule, p.kind, pool, p.seed));
    await answerRight(items[0]!);
    await fireEvent.press(screen.getByTestId('drill-continue'));
    await answerRight(items[1]!);
    await fireEvent.press(screen.getByTestId('drill-continue'));
    for (const level of [1, 2, 3]) {
      await fireEvent.press(screen.getByTestId('drill-help'));
      expect(screen.getByTestId(`drill-help-${level}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('drill-help')).toBeNull();
    expect(screen.getByTestId('drill-continue')).toBeTruthy();
    const answers = loadFormulas(store).entries['deriv.quotient']!.answers;
    expect(answers.at(-1)).toMatchObject({ kind: 'calc', verdict: 'dont_know' });
    expect(answers).toHaveLength(3);
  });
});

describe('the Vérif rapide', () => {
  it('5 items, no help, then the result; every answer saved as a check', async () => {
    const { store, events } = await open();
    await fireEvent.press(screen.getByTestId('formulas-check-start'));
    expect(screen.getByTestId('formulas-check')).toBeTruthy();
    expect(screen.getByText('Pas d’indice ici. Ce que tu rates revient demain.')).toBeTruthy();
    const plan = pickCheck(emptyFormulas(), bac, NOW, SEED);
    expect(plan).toHaveLength(5);
    for (const [i, p] of plan.entries()) {
      expect(screen.queryByTestId('drill-help')).toBeNull();
      const item = drillItem(ruleById(p.ruleId)!, p.kind, pool, SEED + i);
      if (i === 0) {
        // The first one wrong: tap a wrong answer.
        if (item.kind === 'true_false') {
          await fireEvent.press(screen.getByTestId(item.isTrue ? 'drill-false' : 'drill-true'));
        } else if (item.kind === 'complete') {
          await fireEvent.press(screen.getByTestId(`drill-tile-${item.tiles.findIndex(t => !t.right)}`));
        } else if (item.kind === 'recognise') {
          const wrong = item.options.find(o => !o.right)!;
          await fireEvent.press(screen.getByTestId(`drill-option-${wrong.ruleId}`));
        }
      } else {
        await answerRight(item);
      }
      expect(screen.getByTestId('check-mark')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('drill-continue'));
    }
    expect(screen.getByTestId('formulas-result')).toBeTruthy();
    for (const p of plan) {
      expect(screen.getByTestId(`result-row-${p.ruleId}`)).toBeTruthy();
    }
    expect(screen.getByText('Revient demain')).toBeTruthy();
    expect(screen.getAllByText('Revient dans 3 jours')).toHaveLength(4);
    expect(screen.getByTestId('result-review')).toBeTruthy();

    const log = loadFormulas(store);
    const checks = Object.values(log.entries).flatMap(e => e.answers).filter(a => a.mode === 'check');
    expect(checks).toHaveLength(5);
    expect(events.filter(e => e.t === 'formula_check').map(e => 'action' in e && e.action)).toEqual([
      'start',
      'answer',
      'answer',
      'answer',
      'answer',
      'answer',
      'end',
    ]);

    // The missed rule opens its card.
    await fireEvent.press(screen.getByTestId('result-review'));
    expect(screen.getByTestId('formula-card')).toBeTruthy();
  });
});

describe('the hide mode', () => {
  it('covers each formula; a tap shows it with «Je savais» / «Je ne savais pas»', async () => {
    const { store } = await open();
    await fireEvent.press(screen.getByTestId('formulas-hide'));
    expect(screen.getByTestId('formulas-hide-mode')).toBeTruthy();
    expect(screen.getAllByText('Touche pour voir')).toHaveLength(12);
    await fireEvent.press(screen.getByTestId('hide-cover-deriv.product'));
    await fireEvent.press(screen.getByTestId('hide-didnt-deriv.product'));
    expect(screen.getAllByText('Touche pour voir')).toHaveLength(11);
    await fireEvent.press(screen.getByTestId('hide-show-all'));
    expect(screen.queryByText('Touche pour voir')).toBeNull();
    // His own word never changes a status.
    expect(loadFormulas(store)).toEqual(emptyFormulas());
  });
});
