import { MOVE_EXPECTED_CHARGE_USD } from '../ai/config';
import { memoryLedger, storeLedger } from '../planner/llm/costCap';
import { memoryStore } from '../storage/kv';
import {
  createAllowance,
  modeFor,
  PER_QUESTION,
  routeCall,
  storeQuestionLedger,
} from './allowance';
import {
  DEEP_REASONS,
  LIGHT_REASONS,
  tierOf,
  type ActOut,
  type Reason,
} from './conductor/types';

const out = (reason: Reason): ActOut => ({
  tier: tierOf(reason),
  reason,
  reply: [],
  advanced: false,
});

/** An allowance whose day already spent `usd` of the default $0.10. */
const withDay = (usd: number) => {
  const ledger = memoryLedger();
  ledger.add(usd);
  return { ledger, allowance: createAllowance({ ledger }) };
};

describe('allowance: modes from the day', () => {
  it('is full under 60%, essential from 60% to 90%, prepared only above', () => {
    expect(modeFor(0, 0.1)).toBe('full');
    expect(modeFor(0.059, 0.1)).toBe('full');
    expect(modeFor(0.06, 0.1)).toBe('essential');
    expect(modeFor(0.09, 0.1)).toBe('essential');
    expect(modeFor(0.0901, 0.1)).toBe('prepared_only');
    expect(modeFor(5, 0.1)).toBe('prepared_only');
  });

  it('leaves the prepared path only when the spend or the allowance makes no sense', () => {
    expect(modeFor(Number.NaN, 0.1)).toBe('prepared_only');
    expect(modeFor(0, 0)).toBe('prepared_only');
  });

  it('reads the day from the ledger, so another question changes the mode', () => {
    const ledger = memoryLedger();
    const first = createAllowance({ ledger });
    const second = createAllowance({ ledger });
    expect(second.mode()).toBe('full');
    first.add('deep', 0.035);
    first.add('deep', 0.03);
    expect(ledger.get()).toBeCloseTo(0.065);
    expect(second.mode()).toBe('essential');
  });

  it('starts a new day full again (storeLedger keys the spend by day)', () => {
    const store = memoryStore();
    let day = '2026-10-30';
    const ledger = storeLedger(store, 'ai.spend', () => day);
    createAllowance({ ledger }).add('deep', 0.095);
    expect(createAllowance({ ledger }).mode()).toBe('prepared_only');
    day = '2026-10-31';
    expect(createAllowance({ ledger }).mode()).toBe('full');
  });
});

describe('allowance: what each mode permits', () => {
  it('full: every light and deep reason, never an instant one, never a light reason deep', () => {
    const { allowance } = withDay(0);
    for (const r of LIGHT_REASONS) {
      expect(allowance.permits('light', r)).toBe(true);
      expect(allowance.permits('deep', r)).toBe(false);
    }
    for (const r of DEEP_REASONS) {
      expect(allowance.permits('deep', r)).toBe(true);
      expect(allowance.permits('light', r)).toBe(true);
    }
    expect(allowance.permits('light', 'credit')).toBe(false);
  });

  it('essential: no remarks, deep only at the hardest moments', () => {
    const { allowance } = withDay(0.07);
    expect(allowance.mode()).toBe('essential');
    const light = LIGHT_REASONS.filter(r => allowance.permits('light', r));
    expect(light).toEqual([
      'free_text',
      'slip_no_reply',
      'pick_again',
      'similar_other',
    ]);
    const deep = DEEP_REASONS.filter(r => allowance.permits('deep', r));
    expect(deep).toEqual(['stuck_again', 'slip_third']);
    expect(DEEP_REASONS.some(r => allowance.permits('light', r))).toBe(false);
  });

  it('prepared only: no call at all', () => {
    const { allowance } = withDay(0.095);
    expect(allowance.mode()).toBe('prepared_only');
    expect(LIGHT_REASONS.some(r => allowance.permits('light', r))).toBe(false);
    expect(DEEP_REASONS.some(r => allowance.permits('deep', r))).toBe(false);
  });
});

describe('allowance: one question', () => {
  it('stops light after 10 calls and deep after 2', () => {
    const { allowance } = withDay(0);
    for (let i = 0; i < 10; i++) {
      expect(allowance.permits('light', 'free_text')).toBe(true);
      allowance.add('light', 0.0001);
    }
    expect(allowance.permits('light', 'free_text')).toBe(false);
    expect(allowance.permits('deep', 'undiagnosed')).toBe(true);
    allowance.add('deep', 0.001);
    allowance.add('deep', 0.001);
    expect(allowance.permits('deep', 'undiagnosed')).toBe(false);
  });

  it('stops every call once the question spent its $0.04', () => {
    const { allowance, ledger } = withDay(0);
    allowance.add('deep', 0.04);
    expect(allowance.permits('light', 'free_text')).toBe(false);
    expect(allowance.permits('deep', 'stuck_again')).toBe(false);
    // The day still has room: a new question may call.
    expect(createAllowance({ ledger }).permits('light', 'free_text')).toBe(
      true,
    );
  });

  it('adds the real cost to the ledger, a cost that is not a number as nothing', () => {
    const { allowance, ledger } = withDay(0);
    allowance.add('light', 0.002);
    allowance.add('light', Number.NaN);
    allowance.add('light', -1);
    expect(ledger.get()).toBeCloseTo(0.002);
  });

  it('takes its own limits', () => {
    const allowance = createAllowance({
      ledger: memoryLedger(),
      dailyUsd: 1,
      perQuestion: { light: 1, deep: 0, usd: 1 },
    });
    expect(allowance.permits('deep', 'claim')).toBe(false);
    allowance.add('light', 0);
    expect(allowance.permits('light', 'free_text')).toBe(false);
  });
});

describe('allowance: the expected charge of the next move', () => {
  it("refuses a call that would pass the question's $0.04, not only one made after it", () => {
    const { allowance } = withDay(0);
    allowance.add('deep', 0.03);
    // 0.03 + 0.0148 > 0.04: the deep move would pass; a light one still fits.
    expect(allowance.permits('deep', 'stuck_again')).toBe(false);
    expect(allowance.permits('light', 'free_text')).toBe(true);
    allowance.add('light', 0.0088);
    // 0.0388 + 0.0015 > 0.04.
    expect(allowance.permits('light', 'free_text')).toBe(false);
  });

  it('still leaves the question its 2 deep moves, with light calls around them', () => {
    const { allowance } = withDay(0);
    for (let i = 0; i < 6; i++) {
      expect(allowance.permits('light', 'free_text')).toBe(true);
      allowance.add('light', MOVE_EXPECTED_CHARGE_USD.light);
    }
    for (let i = 0; i < PER_QUESTION.deep; i++) {
      expect(allowance.permits('deep', 'stuck_again')).toBe(true);
      allowance.add('deep', MOVE_EXPECTED_CHARGE_USD.deep);
    }
    expect(allowance.permits('deep', 'stuck_again')).toBe(false);
  });

  it('takes its own estimates; one that is not a number refuses the call', () => {
    const allowance = createAllowance({
      ledger: memoryLedger(),
      expectedUsd: { light: 0.05, deep: Number.NaN },
    });
    expect(allowance.permits('light', 'free_text')).toBe(false);
    expect(allowance.permits('deep', 'stuck_again')).toBe(false);
  });
});

describe('allowance: the hand-over from light to deep', () => {
  it('full: every light reason may be handed over, while never sent deep directly', () => {
    const { allowance } = withDay(0);
    for (const r of LIGHT_REASONS) {
      expect(allowance.permitsHandover(r)).toBe(true);
      expect(allowance.permits('deep', r)).toBe(false);
    }
    expect(allowance.permitsHandover('credit')).toBe(false);
  });

  it('essential: only for a reason the student needs answered', () => {
    const { allowance } = withDay(0.07);
    expect(LIGHT_REASONS.filter(r => allowance.permitsHandover(r))).toEqual([
      'free_text',
      'slip_no_reply',
      'pick_again',
      'similar_other',
    ]);
    expect(DEEP_REASONS.filter(r => allowance.permitsHandover(r))).toEqual([
      'stuck_again',
      'slip_third',
    ]);
  });

  it('prepared only: never', () => {
    const { allowance } = withDay(0.095);
    expect(LIGHT_REASONS.some(r => allowance.permitsHandover(r))).toBe(false);
  });

  it("uses up the deep calls and the question's dollars like a deep call", () => {
    const { allowance } = withDay(0);
    allowance.add('deep', 0.001);
    expect(allowance.permitsHandover('free_text')).toBe(true);
    allowance.add('deep', 0.001);
    expect(allowance.permitsHandover('free_text')).toBe(false);
    const other = withDay(0).allowance;
    other.add('light', 0.03);
    expect(other.permitsHandover('free_text')).toBe(false);
    expect(other.permits('light', 'free_text')).toBe(true);
  });
});

describe("allowance: the question's counts in the store", () => {
  const KEY = 'hybrid.questions.v1';
  let day = '2026-11-10';
  const today = () => day;
  const open = (store: ReturnType<typeof memoryStore>, question = 'ex/1') =>
    createAllowance({
      ledger: storeLedger(store, 'ai.spend', today),
      question: storeQuestionLedger(store, KEY, question, today),
    });
  beforeEach(() => {
    day = '2026-11-10';
  });

  it('keeps the limits when he leaves the question and opens it again', () => {
    const store = memoryStore();
    const first = open(store);
    first.add('deep', 0.001);
    first.add('deep', 0.001);
    for (let i = 0; i < 10; i++) {
      first.add('light', 0.0001);
    }
    const again = open(store);
    expect(again.permits('deep', 'stuck_again')).toBe(false);
    expect(again.permitsHandover('free_text')).toBe(false);
    expect(again.permits('light', 'free_text')).toBe(false);
  });

  it("keeps the question's dollars too", () => {
    const store = memoryStore();
    open(store).add('deep', 0.03);
    expect(open(store).permits('deep', 'stuck_again')).toBe(false);
    expect(open(store).permits('light', 'free_text')).toBe(true);
  });

  it('counts each question apart, under one key', () => {
    const store = memoryStore();
    const q1 = open(store, 'ex/1');
    q1.add('deep', 0.001);
    q1.add('deep', 0.001);
    open(store, 'ex/2').add('light', 0.0005);
    expect(open(store, 'ex/1').permits('deep', 'stuck_again')).toBe(false);
    expect(open(store, 'ex/2').permits('deep', 'stuck_again')).toBe(true);
    expect(JSON.parse(store.getString(KEY)!)).toEqual({
      day: '2026-11-10',
      questions: {
        'ex/1': { light: 0, deep: 2, usd: 0.002 },
        'ex/2': { light: 1, deep: 0, usd: 0.0005 },
      },
    });
  });

  it('starts a new day with fresh limits and drops the old day', () => {
    const store = memoryStore();
    const q = open(store);
    q.add('deep', 0.001);
    q.add('deep', 0.001);
    day = '2026-11-11';
    const next = open(store);
    expect(next.permits('deep', 'stuck_again')).toBe(true);
    open(store, 'ex/2').add('light', 0.0005);
    expect(Object.keys(JSON.parse(store.getString(KEY)!).questions)).toEqual([
      'ex/2',
    ]);
  });

  it('reads a record it cannot read as nothing', () => {
    const store = memoryStore();
    store.set(KEY, '{not json');
    expect(open(store).permits('deep', 'stuck_again')).toBe(true);
    store.set(
      KEY,
      JSON.stringify({
        day: '2026-11-10',
        questions: { 'ex/1': { light: 'x', deep: -3, usd: null } },
      }),
    );
    const a = open(store);
    expect(a.permits('deep', 'stuck_again')).toBe(true);
    a.add('light', 0.001);
    expect(JSON.parse(store.getString(KEY)!).questions['ex/1']).toEqual({
      light: 1,
      deep: 0,
      usd: 0.001,
    });
  });
});

describe('routeCall', () => {
  it('never calls for an instant act', () => {
    expect(routeCall(out('credit'), withDay(0).allowance)).toBeNull();
  });

  it('calls the own tier of the act when permitted', () => {
    const { allowance } = withDay(0);
    expect(routeCall(out('free_text'), allowance)).toBe('light');
    expect(routeCall(out('undiagnosed'), allowance)).toBe('deep');
  });

  it('answers a deep reason light once deep is used up', () => {
    const { allowance } = withDay(0);
    allowance.add('deep', 0.01);
    allowance.add('deep', 0.01);
    expect(routeCall(out('claim'), allowance)).toBe('light');
  });

  it('in essential mode, calls only for what the student needs answered', () => {
    const { allowance } = withDay(0.07);
    expect(routeCall(out('slip_again'), allowance)).toBeNull();
    expect(routeCall(out('component_result'), allowance)).toBeNull();
    expect(routeCall(out('free_text'), allowance)).toBe('light');
    expect(routeCall(out('undiagnosed'), allowance)).toBeNull();
    expect(routeCall(out('stuck_again'), allowance)).toBe('deep');
  });

  it('shows the prepared reply when nothing is left', () => {
    const { allowance } = withDay(0.095);
    expect(routeCall(out('slip_third'), allowance)).toBeNull();
    expect(routeCall(out('free_text'), allowance)).toBeNull();
  });
});
