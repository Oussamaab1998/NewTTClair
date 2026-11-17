/**
 * verifyAsk on a probability TREE question (the pack's domain 'tree'): a
 * fraction is ONE value for provenance and for the leak guard, and the
 * calculation of a step he has not earned is refused whatever its value
 * (several values of the exam's tree are equal: the printed 1/4 is also the
 * result of two steps). The same pack with no domain keeps today's reading
 * (message.test.ts is the urn's own suite).
 */
import '../../method/library';
import { lineLatex } from '../../method/lineChain';
import { mutationsFor } from '../../method/mutations';
import { buildGraphFor } from '../../method/templates';
import { autoCheck } from '../checks/autoCheck';
import { plain, type GraphRuntime } from '../checks/lines';
import type { QuestionPack } from '../packs/build';
import { newSession } from '../session/state';
import { COMPUTE } from '../tools/compute';
import type { AskStudent } from '../tools/schemas';
import { forbiddenValues, fractionNumbers, verifyAsk } from './message';

const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
/** What the statement and its figure give. */
const GIVEN = ['2/3', '1/4', '5/12'];

function mainOf(template: string): GraphRuntime {
  const graph = buildGraphFor(
    { template, args: EXAM as never },
    { inputs: {} },
  );
  return { id: 'main', graph, table: mutationsFor(graph), extra: [] };
}

function packOf(main: GraphRuntime, domain: 'tree' | null): QuestionPack {
  return {
    questionId: 't',
    label: 't',
    wording: '',
    main,
    domain,
    plan: [],
    read: [],
    recipe: null,
    notes: null,
    given: GIVEN,
  };
}

function ctx(template: string, domain: 'tree' | null = 'tree') {
  const main = mainOf(template);
  const pack = packOf(main, domain);
  return {
    rt: newSession('synthetic-tree', 't', main, pack.given),
    pack,
    experiment: null,
  };
}

/** His line on a step of the question, judged by the engine (credited when right). */
function writes(c: ReturnType<typeof ctx>, raw: string, node: string): void {
  autoCheck(
    { kind: 'line', raw },
    { kind: 'line', expect: { kind: 'node', graph: 'main', node } },
    c.rt,
    c.pack,
  );
}

const say = (...message: AskStudent['message']): AskStudent => ({
  message,
  input: { kind: 'free' },
  intent: 'other',
});
const math = (latex: string) => say({ type: 'math', latex });
const reasons = (r: ReturnType<typeof verifyAsk>): string =>
  r.ok ? '' : r.reasons.join(' | ');

describe('fractionNumbers', () => {
  it('reads each fraction as one value and a minus as an operator', () => {
    expect(
      fractionNumbers('\\frac{5}{12} - \\dfrac{1}{6} + 3/4 - 2').map(plain),
    ).toEqual(['5/12', '1/6', '3/4', '2']);
    expect(fractionNumbers('\\frac{3}{12} = 0{,}25').map(plain)).toEqual([
      '1/4',
      '1/4',
    ]);
    expect(fractionNumbers('p(F/\\overline{A})')).toEqual([]);
  });
});

describe('verifyAsk on a tree question: a fraction is one value', () => {
  it('allows a given fraction whose denominator is no number of the statement', () => {
    const c = ctx('tree_other_path');
    expect(verifyAsk(math('p(F) = \\frac{5}{12}'), c).ok).toBe(true);
    expect(verifyAsk(math('p(A) = \\dfrac{2}{3}'), c).ok).toBe(true);
    expect(
      verifyAsk(say({ type: 'ar', text: 'الاحتمال الكل هو 5/12.' }), c).ok,
    ).toBe(true);
    expect(
      verifyAsk(say({ type: 'fr', text: 'On sait que p(F) = 5/12.' }), c).ok,
    ).toBe(true);
    // The same value, not simplified: 3/12 is the given 1/4.
    expect(verifyAsk(math('\\frac{3}{12}'), c).ok).toBe(true);
  });

  it('keeps the urn reading when the pack has no domain', () => {
    // A formula of digits only is read number by number there: 5, then 12.
    const c = ctx('tree_other_path', null);
    expect(reasons(verifyAsk(math('\\frac{5}{12}'), c))).toMatch(
      /12 is not from the statement/,
    );
    expect(verifyAsk(math('\\frac{5}{12}'), ctx('tree_other_path')).ok).toBe(
      true,
    );
  });

  it('refuses a fraction nobody gave or computed, and its parts alone', () => {
    const c = ctx('tree_other_path');
    expect(reasons(verifyAsk(math('\\frac{7}{9}'), c))).toMatch(
      /7\/9 is not from the statement/,
    );
    // 12 alone is not a number of the statement: only 5/12 is.
    expect(reasons(verifyAsk(math('12'), c))).toMatch(
      /12 is not from the statement/,
    );
  });

  it('refuses the unearned value a product ends on', () => {
    const c = ctx('tree_conditional');
    const r = verifyAsk(math('\\frac{1}{4} \\times 3 = \\frac{3}{4}'), c);
    expect(reasons(r)).toMatch(/3\/4 is the value of "f_given_na"/);
    // Read as 3 and 4, the leak goes unseen: the urn reading lets it through.
    expect(
      verifyAsk(
        math('\\frac{1}{4} \\times 3 = \\frac{3}{4}'),
        ctx('tree_conditional', null),
      ).ok,
    ).toBe(true);
  });

  it('refuses a false "=" written with a division sign', () => {
    const c = ctx('tree_conditional');
    writes(c, '1-2/3=1/3', 'not_a');
    expect(
      reasons(
        verifyAsk(math('\\frac{1}{4} \\div \\frac{1}{3} = \\frac{2}{3}'), c),
      ),
    ).toMatch(/is false/);
  });

  it('gives a tree reason when a formula does not parse', () => {
    const r = verifyAsk(
      math('p(F \\mid \\overline{A})'),
      ctx('tree_conditional'),
    );
    expect(reasons(r)).toMatch(/p\(F\/\\overline\{A\}\), never \\mid/);
    expect(
      verifyAsk(math('p(F/\\overline{A})'), ctx('tree_conditional')).ok,
    ).toBe(true);
    expect(
      verifyAsk(math('p(\\overline{A} \\cap F)'), ctx('tree_conditional')).ok,
    ).toBe(true);
  });
});

describe('verifyAsk on a tree question: what he has not earned', () => {
  it('forbids by value only what the statement does not give', () => {
    // The result of question 1 (1/4) is the printed branch: its value cannot be told apart.
    const c = ctx('tree_other_path');
    expect(forbiddenValues(c).map(f => f.node)).toEqual(['a_and_f']);
    expect(reasons(verifyAsk(math('\\frac{1}{6}'), c))).toMatch(
      /1\/6 is the value of "a_and_f"/,
    );
    writes(c, '2/3*1/4=1/6', 'a_and_f');
    expect(forbiddenValues(c)).toEqual([]);
    expect(verifyAsk(math('\\frac{1}{6}'), c).ok).toBe(true);
  });

  it('refuses the calculation of an unearned step made of allowed numbers', () => {
    const c = ctx('tree_other_path');
    writes(c, '2/3*1/4=1/6', 'a_and_f');
    // 5/12 is given, 1/6 is his, 1/4 is given: every number is allowed.
    const how = math('\\frac{5}{12} - \\frac{1}{6} = \\frac{1}{4}');
    expect(reasons(verifyAsk(how, c))).toMatch(
      /is the calculation of "na_and_f", which he has not found yet/,
    );
    expect(
      reasons(
        verifyAsk(
          say({ type: 'ar', text: 'نحسبو 5/12 - 1/6 = 1/4 وكمّلنا.' }),
          c,
        ),
      ),
    ).toMatch(/calculation of "na_and_f"/);
    expect(
      reasons(
        verifyAsk(say({ type: 'fr', text: 'Donc p = 5/12 - 1/6 = 1/4.' }), c),
      ),
    ).toMatch(/calculation of "na_and_f"/);
    // Once the step is his, the same formula is his line read back.
    writes(c, '5/12-1/6=3/12=1/4', 'na_and_f');
    expect(verifyAsk(how, c).ok).toBe(true);
  });

  it('reads the calculation behind a label and a division sign', () => {
    const c = ctx('tree_conditional');
    expect(
      reasons(verifyAsk(math('p(\\overline{A}) = 1 - \\frac{2}{3}'), c)),
    ).toMatch(/calculation of "not_a"/);
    writes(c, '1-2/3=1/3', 'not_a');
    expect(verifyAsk(math('p(\\overline{A}) = 1 - \\frac{2}{3}'), c).ok).toBe(
      true,
    );
    // He wrote 3/4 himself (the trap): the value is his, the right road is not.
    writes(c, '1-1/4=3/4', 'f_given_na');
    expect(c.rt.state.lines[1]!.match).toMatchObject({
      verdict: 'slip',
      slip: 'complement_across_nodes',
    });
    expect(verifyAsk(math('\\frac{3}{4}'), c).ok).toBe(true);
    for (const how of [
      '\\frac{1}{4} \\div \\frac{1}{3}',
      '\\frac{1}{4} : \\frac{1}{3} = \\frac{3}{4}',
      '\\frac{\\frac{1}{4}}{\\frac{1}{3}}',
      '\\frac{1}{4} \\times 3',
    ]) {
      expect(reasons(verifyAsk(math(how), c))).toMatch(
        /calculation of "f_given_na"/,
      );
    }
  });

  it('lets his own wrong road and a value alone through', () => {
    const c = ctx('tree_conditional');
    writes(c, '1-2/3=1/3', 'not_a');
    writes(c, '1-1/4=3/4', 'f_given_na');
    // His road (a slip of this step, not a road to it) may be shown back.
    expect(verifyAsk(math('1 - \\frac{1}{4} = \\frac{3}{4}'), c).ok).toBe(true);
    // A value alone says nothing of the road.
    expect(verifyAsk(math('\\frac{1}{3}'), c).ok).toBe(true);
    expect(verifyAsk(math('p(F/A) = \\frac{1}{4}'), c).ok).toBe(true);
  });

  it('allows the calculation after three tries at the step, as the value is', () => {
    const c = ctx('tree_conditional');
    writes(c, '1-2/3=1/3', 'not_a');
    const how = math('\\frac{1}{4} \\div \\frac{1}{3}');
    for (const raw of ['(1/4)/(5/12)=3/5', '(1/3)/(1/4)=4/3', '1/4*1/3=1/12']) {
      expect(verifyAsk(how, c).ok).toBe(false);
      writes(c, raw, 'f_given_na');
    }
    expect(verifyAsk(how, c).ok).toBe(true);
  });

  it('takes his results of the earlier questions from the session', () => {
    // Question 4: the first lower branch (1/3) is a value of its graph.
    const c = ctx('tree_reverse');
    expect(reasons(verifyAsk(math('\\frac{1}{3}'), c))).toMatch(
      /1\/3 is the value of "not_a"/,
    );
    // The mover adds what he found in question 2 to the session's given numbers.
    c.rt.state.given.push('1/3');
    expect(verifyAsk(math('p(\\overline{A}) = \\frac{1}{3}'), c).ok).toBe(true);
    expect(forbiddenValues(c).map(f => f.node)).not.toContain('not_a');
    // An urn question never reads the session's list.
    const urn = ctx('tree_reverse', null);
    urn.rt.state.given.push('1/3');
    expect(forbiddenValues(urn).map(f => f.node)).toContain('not_a');
  });

  it('knows a prepared tree case: its counts and its values', () => {
    const c = ctx('tree_conditional');
    const made = COMPUTE.make_case!(c, {
      case: {
        kind: 'tree',
        template: 'tree_conditional',
        node: 'f_given_na',
        n: 25,
        a: 16,
        af: 3,
        naf: 4,
      },
      purpose: 'smaller',
    } as never);
    expect(made.ok).toBe(true);
    expect(
      verifyAsk(
        say(
          { type: 'ar', text: 'في القسم 25 تلميذ، و 16 منهم في النادي.' },
          { type: 'math', latex: '\\frac{4}{9}' },
        ),
        c,
      ).ok,
    ).toBe(true);
    expect(verifyAsk(math('\\frac{4}{11}'), c).ok).toBe(false);
  });
});

describe('reply templates on a tree question (src/hybrid/replies/fill.ts)', () => {
  it('passes a given value and his own value as the templates write them', () => {
    const c = ctx('tree_other_path');
    writes(c, '2/3*1/4=2/12', 'a_and_f');
    // A "given" segment and a "value" segment become lineLatex blocks.
    for (const value of ['5/12', '2/12', '1/6']) {
      const r = verifyAsk(
        {
          message: [{ type: 'math', latex: lineLatex(value) }],
          input: { kind: 'continue' },
          intent: 'other',
        },
        c,
      );
      expect(r.ok).toBe(true);
    }
  });
});
