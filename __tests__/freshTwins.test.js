// Plain JS so app code does not get Node typings (it reads docs/exercises/EX_URN_RN.md).
// The hand-authored twin urns of the exercise doc are the ground truth for the fresh-variant rule that
// `freshCandidateOk` now holds for the loader and for the generator (docs/COMPONENTS_PROBABILITY_V2.md E10).
const fs = require('node:fs');
const path = require('node:path');

const { freshCandidateOk, proposeUrnVariants } = require('../src/engine/urnVariants');
const { frac } = require('../src/engine/rational');
const { loadExercise } = require('../src/content/loader');
const { parseNumeric } = require('../src/engine/format');
const exSc2 = require('../src/content/exercises/bac2022c-sc-ex2.json');
const misconceptions = require('../src/content/exercises/bac2022c-sc-ex2.misconceptions.json');

const md = fs.readFileSync(path.resolve(__dirname, '..', 'docs/exercises/EX_URN_RN.md'), 'utf8');

/** The rows of the "Twin and variant urns" table: { reds, blacks, k, a: [num, den], b: [num, den] }. */
function twins() {
  const rows = [];
  const re = /\|\s*(\d+)R (\d+)N, k = (\d+)\s*\|\s*(\d+)\s*\|\s*(\d+) → (\d+)\/(\d+)\s*\|\s*(\d+) → (\d+)\/(\d+)\s*\|/g;
  for (const m of md.matchAll(re)) {
    rows.push({
      reds: Number(m[1]),
      blacks: Number(m[2]),
      k: Number(m[3]),
      total: Number(m[4]),
      a: frac(Number(m[6]), Number(m[7])),
      b: frac(Number(m[9]), Number(m[10])),
    });
  }
  return rows;
}

const loaded = (() => {
  const r = loadExercise(exSc2, misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
})();

/** What the loader knows about the parent step s8 (P(A) = 1/2): its answer and every wrong value. */
function parentOfS8() {
  const answer = loaded.answers.get('1/s8');
  const step = exSc2.parts[0].groups[0].steps.find(s => s.id === 's8');
  const wrong = [
    ...(step.wrongAnswers || []).map(w => parseNumeric(w.value).value),
    ...(answer.procedures || []).flatMap(p => p.values),
  ];
  return { answer: answer.value, wrong };
}

/** The doc's facts about P(B) (part 2, not authored yet): the answer 1/6, and its known wrong values 1/2 and 3/5. */
const parentB = { answer: frac(1, 6), wrong: [frac(1, 2), frac(3, 5)] };

describe('the hand-authored twins of EX_URN_RN.md against the fresh-variant rule', () => {
  it('the table has its four twins (2R2N, 3R2N, 5R5N, 3R5N)', () => {
    expect(twins().map(t => `${t.reds}R${t.blacks}N k${t.k}`)).toEqual([
      '2R2N k2',
      '3R2N k2',
      '5R5N k2',
      '3R5N k3',
    ]);
  });

  it('every twin passes as a variant of P(A) (step s8: 1/2): its "exactly one red" is none of the parent\'s values', () => {
    const parent = parentOfS8();
    for (const t of twins()) {
      expect({ twin: `${t.reds}R${t.blacks}N`, verdict: freshCandidateOk(parent, t.a) }).toEqual({
        twin: `${t.reds}R${t.blacks}N`,
        verdict: { ok: true },
      });
    }
  });

  it('as variants of P(B): all pass except 2R2N (its P(no red) is the parent\'s 1/6), as the doc says', () => {
    const verdicts = twins().map(t => [`${t.reds}R${t.blacks}N`, freshCandidateOk(parentB, t.b).ok]);
    expect(verdicts).toEqual([
      ['2R2N', false],
      ['3R2N', true],
      ['5R5N', true],
      ['3R5N', true],
    ]);
  });

  it('and 3R2N\'s "exactly one red" 3/5 is a known wrong value of P(B): not a twin for P(B) checks, as the doc says', () => {
    const t = twins().find(x => x.reds === 3 && x.blacks === 2);
    expect(freshCandidateOk(parentB, t.a)).toEqual({ ok: false, reason: 'equals_wrong' });
  });

  it('the authored transfer twin of the exercise (tr-1-p-5r5n, 5/9) passes too', () => {
    const v = loaded.answers.get('var:tr-1-p-5r5n');
    expect(v.kind).toBe('number');
    expect(freshCandidateOk(parentOfS8(), v.value)).toEqual({ ok: true });
  });
});

describe('the loader and the generator share the rule', () => {
  const clone = x => JSON.parse(JSON.stringify(x));

  /** The exercise with one extra fresh variant of s8 on the given urn, asking "exactly j reds". */
  function withFresh(reds, blacks, k, j) {
    const raw = clone(exSc2);
    // a copy of the authored transfer twin with every id renamed (block ids are unique)
    const base = JSON.parse(
      JSON.stringify(raw.variants.find(v => v.id === 'tr-1-p-5r5n')).split('tr-1-p-5r5n').join('fresh-test'),
    );
    base.afterReveal = true;
    base.experiment = {
      urn: [
        ...Array.from({ length: reds }, (_, i) => ({ id: `r${i + 1}`, value: 1, color: 'red' })),
        ...Array.from({ length: blacks }, (_, i) => ({ id: `n${i + 1}`, value: 0, color: 'black' })),
      ],
      draw: 'simultaneous',
      k,
    };
    base.step.answer.compute.args.event.args.value = j;
    delete base.step.wrongAnswers;
    delete base.step.procedures;
    raw.variants.push(base);
    return loadExercise(raw, misconceptions);
  }

  it('a candidate that gives the parent\'s answer is refused by the loader (1 red and 1 black, 1 drawn: 1/2)', () => {
    const r = withFresh(1, 1, 1, 1);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toMatch(/equals the answer of 1\/s8/);
  });

  it('the candidates the generator proposes are all accepted by the loader', () => {
    const parent = parentOfS8();
    const list = proposeUrnVariants('urn_exactly_j', parent, 6);
    expect(list.length).toBe(6);
    for (const v of list) {
      const r = withFresh(v.urn.reds, v.urn.blacks, v.urn.k, v.j);
      expect({ urn: v.urn, j: v.j, errors: r.ok ? [] : r.errors }).toEqual({ urn: v.urn, j: v.j, errors: [] });
    }
  });
});
