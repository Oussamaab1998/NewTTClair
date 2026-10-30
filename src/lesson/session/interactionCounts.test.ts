/**
 * Interaction counts of the method lessons (D38, D49): the unit is the
 * reducer act; the tap column counts finger touches (keypad keys are not
 * taps). Prints the table the owner asked for and pins the acts.
 */
import type { Event } from '../../telemetry/events';
import { readback } from '../../method/factorForm';
import { loadSc2, MethodSession } from './methodTestkit';

const loaded = loadSc2();

/** Taps of one act, from the value the reducer received. */
function tapsOf(value: Record<string, unknown>): number {
  if ('plan' in value) return (value.plan as string[]).length + 1;
  if ('recipe' in value) return (value.recipe as string[]).length + 1;
  if ('list' in value) {
    const groups = value.list as string[][];
    return groups.reduce((n, g) => n + g.length + 1, 0) + 1;
  }
  if ('mline' in value || 'sline' in value) {
    const raw = String(value.mline ?? value.sline);
    return 1 + (readback(raw) && !('readback' in value) ? 1 : 0);
  }
  return 1;
}

function acts(events: readonly Event[]): { value: Record<string, unknown> }[] {
  return events.flatMap(e => {
    if (e.t === 'answer' && e.kind === 'method') {
      return [{ value: e.value as Record<string, unknown> }];
    }
    if (
      e.t === 'component_event' &&
      e.component === 'Method' &&
      e.name === 'act'
    ) {
      return [{ value: e.payload.value as Record<string, unknown> }];
    }
    return [];
  });
}

const FAST: [string, string, string, number][] = [
  ['Q1', '1', 'm1.sim_same', 9],
  ['Q2', '2', 'm2.sim_same', 8],
  ['Q3a', '3a', 'm3a.sim_same', 9],
  ['Q3b', '3b', 'm3b.sim_same', 8],
];

describe('fast paths: acts and taps', () => {
  it.each(FAST)(
    '%s (part %s) plays to %s in the budgeted acts',
    (name, part, stop, expected) => {
      const s = new MethodSession(loaded, part);
      s.until(stop);
      const list = acts(s.events);
      const taps = list.reduce((n, a) => n + tapsOf(a.value), 0);
      console.log(`${name}: ${list.length} acts, ${taps} taps`);
      expect(list).toHaveLength(expected);
    },
  );
});

const PLANS: Record<string, string[]> = {
  '1': ['c_total', 'c_fav', 'c_ratio'],
  '2': ['c_total', 'c_fav', 'c_ratio'],
  '3a': ['c_type', 'c_seq', 'c_count', 'c_law'],
  '3b': ['c_mean1', 'c_meann', 'c_var1', 'c_varn'],
};
/** [repair, part, the frame it opens from, the slip that opens it]. */
const REPAIRS: [string, string, string, string | null][] = [
  ['rep-1-plan', '1', 'm1.plan', null],
  ['rep-1-box', '1', 'm1.c_fav', '6*5 = 30'],
  ['rep-1-claim', '1', 'm1.c_total', '10*9*8/3 = 240'],
  ['rep-1-combine', '1', 'm1.c_fav', '4+15 = 19'],
  ['rep-1-above-one', '1', 'm1.c_ratio', '120/60 = 2'],
  ['rep-1-units', '1', 'm1.c_ratio', '60/720 = 1/12'],
  ['rep-1-one-ball', '1', 'm1.c_fav', '1 = 1'],
  ['rep-2-plan', '2', 'm2.plan', null],
  ['rep-2-box', '2', 'm2.c_fav', '4*3*2/(3*2*1) = 4'],
  ['rep-2-claim', '2', 'm2.c_ratio', '1-60/120 = 1/2'],
  ['rep-2-units', '2', 'm2.c_ratio', '20/720 = 1/36'],
  ['rep-2-above-one', '2', 'm2.c_ratio', '120/20 = 6'],
  ['rep-3a-plan', '3a', 'm3a.plan', null],
  ['rep-3a-box', '3a', 'm3a.c_count', '7/2'],
  ['rep-3a-bridge', '3a', 'm3a.c_count', '7*2 = 14'],
  ['rep-3a-independence', '3a', 'm3a.c_seq', '7*1/2 = 7/2'],
  ['rep-3a-law', '3a', 'm3a.c_law', '1/128'],
  ['rep-3b-spread', '3b', 'm3b.c_var1', '1/2'],
  ['rep-3b-runs', '3b', 'm3b.c_meann', '7'],
  ['rep-3b-independence', '3b', 'm3b.c_varn', '1/4'],
];

describe('repairs: acts (the accepting tap included) and taps', () => {
  it.each(REPAIRS)('%s (part %s, from %s)', (id, part, frame, slip) => {
    const s = new MethodSession(loaded, part);
    if (slip === null) {
      s.act({ type: 'not_sure' });
      s.act({ type: 'not_sure' });
    } else {
      s.act({ type: 'answer', value: { plan: PLANS[part]! } });
      s.until(frame);
      s.line(slip);
    }
    if (s.offer) {
      s.acceptOffer();
    }
    expect(s.openId).toBe(id);
    const before = acts(s.events).length;
    for (let g = 0; g < 30 && s.openId === id; g++) {
      s.right();
    }
    const list = acts(s.events).slice(before);
    const taps = 1 + list.reduce((n, a) => n + tapsOf(a.value), 0);
    console.log(`${id}: ${list.length + 1} acts, ${taps} taps`);
    expect(list.length + 1).toBeLessThanOrEqual(10);
  });
});
