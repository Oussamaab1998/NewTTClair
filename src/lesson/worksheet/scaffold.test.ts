import {
  apply,
  diagnoseLine,
  serialize,
  toLine,
  type Key,
} from '../lines/editor';
import {
  blanks,
  buildScaffold,
  ownNodes,
  scaffoldLevel,
  shapeOf,
  sourceFor,
} from './scaffold';
import { newDraft } from './model';
import { studentLine } from './sampleLines';

/** His small-case line (5 balls, 3 drawn): the only source a scaffold has. */
const SMALL = studentLine('L2', '5*4*3/(3*2*1)=10', 'credit');
const digitsOf = (s: string) => new Set(s.match(/[0-9]/g) ?? []);

describe('scaffoldLevel', () => {
  it('from the profile: weak 3, shaky 2, ok 1, solid 0 (never seen: the chip)', () => {
    expect(scaffoldLevel('weak', 0)).toBe(3);
    expect(scaffoldLevel('shaky', 0)).toBe(2);
    expect(scaffoldLevel('ok', 0)).toBe(1);
    expect(scaffoldLevel('solid', 0)).toBe(0);
    expect(scaffoldLevel('unknown', 0)).toBe(1);
  });
  it('one more per «ما نعرفش» on the step, capped at 3', () => {
    expect(scaffoldLevel('solid', 1)).toBe(1);
    expect(scaffoldLevel('solid', 2)).toBe(2);
    expect(scaffoldLevel('ok', 5)).toBe(3);
    expect(scaffoldLevel('shaky', -1)).toBe(2);
  });
});

describe('buildScaffold: only from his own credited line', () => {
  it('level 3: the same shape as his line, every number a blank, nothing else', () => {
    const s = buildScaffold(SMALL, 3);
    expect(s?.level).toBe(3);
    if (s?.level !== 3) {
      return;
    }
    expect(serialize(s.template)).not.toMatch(/[0-9]/);
    expect(shapeOf(s.template)).toBe(shapeOf(ownNodes(SMALL.raw)!));
    expect(s.template[0]).toMatchObject({ k: 'frac', lock: true });
    expect(s.from.id).toBe('L2');
  });
  it('levels 2 and 1 show his line and only his line', () => {
    for (const level of [2, 1] as const) {
      const s = buildScaffold(SMALL, level)!;
      expect(s.level).toBe(level);
      expect(s.from.nodes).toEqual(ownNodes(SMALL.raw));
      const shown = digitsOf(serialize(s.from.nodes));
      expect([...shown].every(d => digitsOf(SMALL.raw).has(d))).toBe(true);
    }
  });
  it('never carries a value he has not written (the expected 120 of the main case)', () => {
    for (const level of [1, 2, 3] as const) {
      expect(JSON.stringify(buildScaffold(SMALL, level))).not.toContain('120');
    }
  });
  it('level 0, a wrong line or an unchecked line: no scaffold', () => {
    expect(buildScaffold(SMALL, 0)).toBeNull();
    expect(buildScaffold(studentLine('L3', '5*4*3=60', 'slip'), 3)).toBeNull();
    expect(buildScaffold(studentLine('L4', '5*4*3=60', null), 2)).toBeNull();
  });
  it('the type takes a StudentLine and nothing else (an answer cannot get in)', () => {
    // @ts-expect-error a scaffold is never built from a string (an expected line)
    expect(buildScaffold('10*9*8/(3*2*1)=120', 3)).toBeNull();
    // @ts-expect-error nor from a bare value
    expect(buildScaffold({ raw: '120' }, 3)).toBeNull();
  });
  it('his label, × written as x and counting notation are read', () => {
    expect(serialize(ownNodes('P(A) = 6/10')!)).toBe('((6)/(10))');
    expect(serialize(ownNodes('11x10x9=990')!)).toBe('11*10*9=990');
    expect(serialize(blanks(ownNodes('C(5,2)=10')!))).toBe('C((()),(()))=()');
  });
});

describe('sourceFor: his latest credited line on the same plan node', () => {
  it('skips slips, other nodes and lines it cannot read', () => {
    const lines = [
      studentLine('L1', '4*3=12', 'credit', 'ordered'),
      SMALL,
      studentLine('L3', '5*4*3/6=11', 'slip'),
      studentLine('L4', '6*5*4/(3*2*1)=20', 'credit'),
      studentLine('L5', '120', 'credit', 'other'),
    ];
    expect(sourceFor(lines, 'total')?.id).toBe('L4');
    expect(sourceFor(lines, 'ordered')?.id).toBe('L1');
    expect(sourceFor(lines, 'missing')).toBeNull();
  });
});

describe('a level-3 scaffold typed over', () => {
  it('his small-case shape becomes the main line: 10×9×8 ÷ 3×2×1 = 120', () => {
    const s = buildScaffold(SMALL, 3);
    if (s?.level !== 3) {
      throw new Error('level 3');
    }
    const keys: Key[] = [
      ...(['1', '0', '*', '9', '*', '8', 'div'] as Key[]),
      ...(['3', '*', '2', '*', '1', '='] as Key[]),
      ...(['1', '2', '0'] as Key[]),
    ];
    const { root } = keys.reduce(apply, newDraft(s.template).editor);
    expect(diagnoseLine(root)).toBeNull();
    expect(toLine(root)).toBe('10*9*8/(3*2*1)=120');
  });
});
