import { memoryStore } from '../storage/kv';
import {
  ANSWERS_MAX,
  addDays,
  dayStart,
  emptyFormulas,
  FORMULAS_KEY,
  isDue,
  loadFormulas,
  noteAnswer,
  ruleState,
  saveFormulas,
  type FormulaAnswer,
  type FormulaLog,
} from './log';

/** 10:00 on day n of a fixed month (local time, like his phone). */
const day = (n: number, hour = 10) => new Date(2026, 10, n, hour).getTime();
const midnight = (n: number) => dayStart(day(n));

const drill = (at: number, verdict: FormulaAnswer['verdict'] = 'right'): FormulaAnswer => ({
  at,
  mode: 'drill',
  kind: 'complete',
  verdict,
});
const check = (at: number, verdict: FormulaAnswer['verdict'] = 'right'): FormulaAnswer => ({
  at,
  mode: 'check',
  kind: 'true_false',
  verdict,
});

const play = (...answers: FormulaAnswer[]): FormulaLog =>
  answers.reduce((log, a) => noteAnswer(log, 'deriv.quotient', a), emptyFormulas());
const stateAfter = (now: number, ...answers: FormulaAnswer[]) =>
  ruleState(play(...answers).entries['deriv.quotient'], now, false);

describe('the status and the day a rule comes back', () => {
  it('a new rule of his year waits until he opens it', () => {
    expect(ruleState(undefined, day(1), false)).toEqual({ status: 'nouvelle', due: null });
  });

  it('a new rule of the year before is due at once (a reminder)', () => {
    expect(ruleState(undefined, day(1), true)).toEqual({
      status: 'nouvelle',
      due: midnight(1),
    });
  });

  it('trained once: En cours, back tomorrow', () => {
    expect(stateAfter(day(1), drill(day(1)), drill(day(1, 11), 'trap'))).toEqual({
      status: 'en_cours',
      due: midnight(2),
    });
  });

  it('right in a Vérif: back in 3 days; on a second day: Retenue, back in 7; then 21', () => {
    expect(stateAfter(day(2), drill(day(1)), check(day(2)))).toEqual({
      status: 'en_cours',
      due: midnight(5),
    });
    expect(stateAfter(day(5), drill(day(1)), check(day(2)), check(day(5)))).toEqual({
      status: 'retenue',
      due: midnight(12),
    });
    expect(
      stateAfter(day(12), drill(day(1)), check(day(2)), check(day(5)), check(day(12))),
    ).toEqual({ status: 'retenue', due: midnight(33) });
  });

  it('two right answers on the same day count as one day', () => {
    expect(stateAfter(day(2), check(day(2)), check(day(2, 18)))).toEqual({
      status: 'en_cours',
      due: midnight(5),
    });
  });

  it('a miss in a Vérif: back to En cours, due the next day; the count starts again', () => {
    const answers = [check(day(2)), check(day(5)), check(day(12), 'trap')];
    expect(stateAfter(day(12), ...answers)).toEqual({ status: 'en_cours', due: midnight(13) });
    expect(stateAfter(day(13), ...answers, check(day(13)))).toEqual({
      status: 'en_cours',
      due: midnight(16),
    });
  });

  it('drills never move a rule between En cours and Retenue', () => {
    expect(
      stateAfter(day(6), check(day(2)), check(day(5)), drill(day(6), 'wrong')),
    ).toEqual({ status: 'retenue', due: midnight(12) });
  });

  it('a reminder answered right in its first Vérif follows the same days', () => {
    const log = noteAnswer(emptyFormulas(), 'deriv.product', check(day(3)));
    expect(ruleState(log.entries['deriv.product'], day(3), true)).toEqual({
      status: 'en_cours',
      due: midnight(6),
    });
  });

  it('isDue from the start of its day', () => {
    const s = { status: 'en_cours' as const, due: midnight(4) };
    expect(isDue(s, day(3, 23))).toBe(false);
    expect(isDue(s, day(4, 0))).toBe(true);
    expect(isDue({ status: 'nouvelle', due: null }, day(30))).toBe(false);
  });

  it('days follow the calendar, not 24-hour blocks', () => {
    expect(addDays(day(30, 23), 1)).toBe(dayStart(new Date(2026, 11, 1).getTime()));
  });
});

describe('the record on the phone', () => {
  it('keeps the last answers only', () => {
    const many = Array.from({ length: ANSWERS_MAX + 7 }, (_, i) => drill(day(1) + i));
    const log = play(...many);
    expect(log.entries['deriv.quotient']!.answers).toHaveLength(ANSWERS_MAX);
    expect(log.entries['deriv.quotient']!.answers[0]!.at).toBe(day(1) + 7);
  });

  it('saves and loads; a broken record starts empty', () => {
    const store = memoryStore();
    const log = play(drill(day(1)), check(day(2), 'trap'));
    saveFormulas(store, log);
    expect(loadFormulas(store)).toEqual(log);
    store.set(FORMULAS_KEY, '{"v":2}');
    expect(loadFormulas(store)).toEqual(emptyFormulas());
    store.set(FORMULAS_KEY, 'not json');
    expect(loadFormulas(store)).toEqual(emptyFormulas());
  });

  it('noteAnswer does not change the log it is given', () => {
    const log = emptyFormulas();
    noteAnswer(log, 'deriv.sum', drill(day(1)));
    expect(log).toEqual(emptyFormulas());
  });
});
