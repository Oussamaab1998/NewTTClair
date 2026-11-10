import { memoryLedger, storeLedger } from '../planner/llm/costCap';
import { memoryStore } from '../storage/kv';
import { createAllowance, modeFor, routeCall } from './allowance';
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
