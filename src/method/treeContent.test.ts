/**
 * The authored content of the probability-tree exercise (Bac 2022, session
 * principale, Sciences expérimentales, exercice 2; docs/exercises/
 * BAC2022P_SC_EX2.md) against the engine: the exercise, its figure, its
 * similar questions, its small examples, its trips, its prepared replies and
 * the slip library. Only the three numbers the exam prints are written here;
 * every other value is computed.
 */
import fs from 'node:fs';
import path from 'node:path';

import { bannedIn } from '../ai/prompt/lexicon';
import { PreparedCaseFileSchema } from '../ai/move/prepared';
import { ProbabilityTreePropsSchema } from '../components/probability2/schemas';
import { resolveSpec } from '../components/registry';
import casesRaw from '../content/cases.bac2022p-sc-ex2.json';
import exRaw from '../content/exercises/bac2022p-sc-ex2.json';
import exMisconceptions from '../content/exercises/bac2022p-sc-ex2.misconceptions.json';
import { loadExercise, stepKey } from '../content/loader';
import treeLibraryRaw from '../content/methodMutations.tree.misconceptions.json';
import repliesRaw from '../content/replyTemplates.bac2022p-sc-ex2.json';
import {
  ExerciseSchema,
  MisconceptionLibrarySchema,
  type Figure,
  type MethodFrameStep,
  type MethodStep,
  type Rich,
} from '../content/schema';
import { SKILLS } from '../content/skills';
import tripsRaw from '../content/trips.bac2022p-sc-ex2.json';
import { frac, type Fraction } from '../engine/rational';
import { parseRat, sameRat } from '../engine/rationalFormat';
import {
  TREE_QUANTITIES,
  solveTwoEventTree,
  type TreeQuantity,
  type TwoEventTree,
} from '../engine/tree';
import { ReplyTemplateFileSchema } from '../hybrid/replies/schema';
import { TripFileSchema } from '../hybrid/tour/schema';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import { findRunIssues } from '../lesson/rich/runs';
import { checkWalkthroughs } from '../lesson/walkthroughCheck';
import { HIS_BLANK } from './findings';
import type { Graph } from './graph';
import { mutationLibrary } from './library';
import { mutationsFor } from './mutations';
import { buildGraphFor, templateOf } from './templates';
import { TREE_TEMPLATE_IDS } from './templatesTree';
import { studentFacingIssues } from './words';

/** The three numbers the exam prints: p(A), p(F / A) on the tree, p(F) in the text. */
const EXAM = { pA: [2, 3], pFgA: [1, 4], pF: [5, 12] };
const T = solveTwoEventTree({
  pA: frac(2, 3),
  pFgA: frac(1, 4),
  pF: frac(5, 12),
});
const STATEMENT: Fraction[] = [T.a, T.f_given_a, T.f];

const CONTENT = path.join(__dirname, '..', 'content');
const FILES = [
  path.join(CONTENT, 'exercises', 'bac2022p-sc-ex2.json'),
  path.join(CONTENT, 'exercises', 'bac2022p-sc-ex2.misconceptions.json'),
  path.join(CONTENT, 'methodMutations.tree.misconceptions.json'),
  path.join(CONTENT, 'trips.bac2022p-sc-ex2.json'),
  path.join(CONTENT, 'replyTemplates.bac2022p-sc-ex2.json'),
  path.join(CONTENT, 'cases.bac2022p-sc-ex2.json'),
];

const r = loadExercise(exRaw, exMisconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const loaded = r.loaded;
/** The exercise as authored (method blocks not expanded, `\val` not replaced). */
const authored = ExerciseSchema.parse(exRaw);
const treeLibrary = MisconceptionLibrarySchema.parse(treeLibraryRaw);
const trips = TripFileSchema.parse(tripsRaw);
const replies = ReplyTemplateFileSchema.parse(repliesRaw);
const cases = PreparedCaseFileSchema.parse(casesRaw);

const TEMPLATE: Record<string, string> = {
  t1: 'tree_other_path',
  t2: 'tree_conditional',
  t3: 'tree_complete',
  t4: 'tree_reverse',
};
const PART_IDS = Object.keys(TEMPLATE);

interface Question {
  id: string;
  m: MethodStep;
  graph: Graph;
  frames: MethodFrameStep[];
}

const graphOf = (g: { template: string; args: object }): Graph =>
  buildGraphFor(
    { template: g.template, args: g.args as never },
    { inputs: {} },
  );

const questions: Question[] = authored.parts.map(p => {
  const m = p.groups
    .flatMap(g => g.steps)
    .find((s): s is MethodStep => s.kind === 'method');
  if (!m) {
    throw new Error(`${p.id}: no method block`);
  }
  const frames = (loaded.exercise.parts.find(x => x.id === p.id)?.groups ?? [])
    .flatMap(g => g.steps)
    .filter((s): s is MethodFrameStep => s.kind === 'mframe');
  return { id: p.id, m, graph: graphOf(m.graph), frames };
});
const question = (id: string): Question => {
  const q = questions.find(x => x.id === id);
  if (!q) {
    throw new Error(`no question ${id}`);
  }
  return q;
};

/** The exam's answers: every value a step of the four questions asks for. */
const ANSWERS: Fraction[] = questions.flatMap(q =>
  q.graph.nodes.filter(n => n.main).map(n => n.value),
);
const among = (v: Fraction, set: readonly Fraction[]): boolean =>
  set.some(x => sameRat(x, v));

/** The engine tree of a graph's arguments (probabilities or whole counts). */
function treeOfArgs(args: Readonly<Record<string, unknown>>): TwoEventTree {
  const f = (key: string): Fraction | null => {
    const v = args[key];
    return Array.isArray(v) ? frac(Number(v[0]), Number(v[1])) : null;
  };
  const pA = f('pA');
  const pFgA = f('pFgA');
  const pF = f('pF');
  const pFgNotA = f('pFgNotA');
  if (!pA || !pFgA) {
    throw new Error('a slot needs pA and pFgA');
  }
  if (pF) {
    return solveTwoEventTree({ pA, pFgA, pF });
  }
  if (!pFgNotA) {
    throw new Error('a slot needs pF or pFgNotA');
  }
  return solveTwoEventTree({ pA, pFgA, pFgNotA });
}

/** The quantity each branch of the picture carries; with `swap` the two sides exchange their names. */
const BRANCH: Record<string, TreeQuantity> = {
  a: 'a',
  'a.f': 'f_given_a',
  'a.nf': 'nf_given_a',
  na: 'not_a',
  'na.f': 'f_given_na',
  'na.nf': 'nf_given_na',
};
const SWAPPED: Record<string, TreeQuantity> = {
  na: 'a',
  'na.f': 'f_given_a',
  'na.nf': 'nf_given_a',
  a: 'not_a',
  'a.f': 'f_given_na',
  'a.nf': 'nf_given_na',
};

function edgesOf(figure: Figure) {
  const props = ProbabilityTreePropsSchema.parse(figure.spec.props);
  return props.branches.flatMap(b => [b, ...(b.children ?? [])]);
}

/** Every string of a JSON value with the key it sits under. */
function strings(node: unknown, key = ''): { key: string; text: string }[] {
  if (typeof node === 'string') {
    return [{ key, text: node }];
  }
  if (Array.isArray(node)) {
    return node.flatMap(x => strings(x, key));
  }
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => strings(v, k));
  }
  return [];
}

/** Every object held under `key`, at any depth. */
function objectsAt(node: unknown, key: string): unknown[] {
  if (Array.isArray(node)) {
    return node.flatMap(x => objectsAt(x, key));
  }
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => [
      ...(k === key ? [v] : []),
      ...objectsAt(v, key),
    ]);
  }
  return [];
}

/** The fractions written by hand in a text: `2/3`, `\frac{2}{3}`. */
function literalFractions(text: string): Fraction[] {
  return [
    ...text.matchAll(/(\d+)\s*\/\s*(\d+)/g),
    ...text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g),
  ].map(m => frac(Number(m[1]), Number(m[2])));
}

const DIGIT = /[0-9٠-٩۰-۹]/;
const hasDigit = (rich: Rich): boolean => DIGIT.test(JSON.stringify(rich));

const slipIds = (g: Graph): string[] => {
  const t = mutationsFor(g);
  return [...t.kept, ...t.dropped, ...(t.traps ?? [])].map(c => c.id);
};

const slots = questions.flatMap(q =>
  (q.m.similar ?? []).map(slot => ({
    q,
    slot,
    where: `${q.id}/${slot.id}`,
    graph: graphOf(slot.graph),
    tree: treeOfArgs(slot.graph.args),
  })),
);

const examples = Object.entries(cases.questions).flatMap(([id, list]) =>
  list.map((c, i) => ({
    q: question(id),
    c,
    where: `${id}/S${i + 1}`,
    graph: graphOf({
      template: c.spec.template,
      args: {
        counts: {
          n: c.spec.n,
          a: c.spec.a,
          af: c.spec.af,
          naf: c.spec.naf,
        },
      },
    }),
  })),
);

describe('the exercise loads', () => {
  it('through the loader with the shared slip libraries, without an error', () => {
    expect(checkWalkthroughs(loaded)).toEqual([]);
    expect(loaded.exercise.id).toBe('bac2022p-sc-ex2');
    expect(loaded.exercise.reviewed).toBe(false);
    expect(loaded.exercise.experiment).toBeUndefined();
    expect(loaded.exercise.parts.map(p => p.id)).toEqual(PART_IDS);
    expect(exMisconceptions).toEqual([]);
  });

  it('each part is one text step and one method block on its template', () => {
    for (const p of authored.parts) {
      expect(p.groups.flatMap(g => g.steps).map(s => s.kind)).toEqual([
        'text',
        'method',
      ]);
    }
    for (const q of questions) {
      expect(q.m.graph.template).toBe(TEMPLATE[q.id]);
      expect(q.m.graph.args).toEqual(EXAM);
      expect(q.m.inputs).toBeUndefined();
    }
    expect(Object.values(TEMPLATE)).toEqual(TREE_TEMPLATE_IDS);
  });

  it('the four parts expand into their frames, in route order', () => {
    // Between the plan and the word, and the recipe and the two similar questions.
    const steps: Record<string, string[]> = {
      t1: ['c_path', 'c_split', 'c_rest'],
      t2: ['c_other', 'c_rule', 'c_branch'],
      t3: ['c_first', 'c_low', 'c_up', 'c_last', 'p_check'],
      t4: ['c_cond', 'c_path', 'c_back', 'p_order'],
    };
    for (const q of questions) {
      expect(q.frames.map(f => f.id)).toEqual(
        [
          'plan',
          'read',
          ...(steps[q.id] ?? []),
          'recipe',
          'sim_same',
          'sim_twist',
        ].map(x => `${q.m.id}.${x}`),
      );
    }
  });

  it('a card answered by a pick has no lines frame and a pick with its id', () => {
    const pickOnly = questions.flatMap(q =>
      q.m.plan.cards
        .filter(c => q.m.builtFrames && !q.m.builtFrames.includes(c.id))
        .map(c => ({ q, c })),
    );
    expect(pickOnly.map(x => `${x.q.id}/${x.c.id}:${x.c.key}`)).toEqual([
      't1/c_split:split',
      't2/c_rule:rule',
    ]);
    for (const { q, c } of pickOnly) {
      expect(q.graph.nodes.some(n => n.planCard === c.key)).toBe(false);
      const own = q.m.picks.find(p => p.id === c.id);
      expect(own?.after).toBe(c.id);
      // The pick asks what the card asks.
      expect(own?.prompt).toEqual(c.prompt);
      expect(own?.hints).toEqual(c.hints);
      expect(own?.header).toEqual(c.header);
    }
  });

  it("every lines frame resolves to its template's graph, and its node holds the engine value", () => {
    let seen = 0;
    for (const q of questions) {
      for (const f of q.frames) {
        if (f.frame.type !== 'lines') {
          continue;
        }
        const a = loaded.answers.get(stepKey.main(q.id, f.id));
        if (a?.kind !== 'method' || a.frame !== 'lines') {
          throw new Error(`${q.id}/${f.id}: no lines answer`);
        }
        expect(a.graph.template).toBe(TEMPLATE[q.id]);
        const key = f.frame.key;
        const node = a.graph.nodes.find(n => n.id === key && n.main);
        expect(node?.planCard).toBe(key);
        expect(node?.value).toEqual(T[key as TreeQuantity]);
        seen += 1;
      }
    }
    // 2 + 2 + 4 + 3 written steps.
    expect(seen).toBe(11);
  });

  it('every pick has exactly one right card and names slips the library holds', () => {
    for (const q of questions) {
      for (const p of q.m.picks) {
        expect(p.cards.filter(c => c.truth === 'true')).toHaveLength(1);
        for (const c of p.cards.filter(x => x.truth === 'false')) {
          expect(c.misconceptionId).toBeDefined();
          expect(c.feedback).toBeDefined();
          expect(loaded.misconceptionIds.has(c.misconceptionId ?? '')).toBe(
            true,
          );
        }
      }
    }
  });

  it('every named value is an engine call on the statement numbers, and every one is cited', () => {
    const source = JSON.stringify(exRaw);
    const values = Object.entries(authored.values ?? {});
    expect(values).toHaveLength(9);
    for (const [id, call] of values) {
      const { quantity, ...given } = call.args;
      expect(call.fn).toBe('tree');
      expect(given).toEqual(EXAM);
      expect(loaded.values.get(id)).toEqual(T[quantity as TreeQuantity]);
      expect(source).toContain(`\\\\val{${id}}`);
    }
  });

  it("each goal is the paper's wording, each result is asked by its part", () => {
    const paper = (loaded.exercise.paper?.parts ?? []).flatMap(
      p => p.questions,
    );
    expect(loaded.exercise.paper?.points).toBe(3.5);
    loaded.exercise.parts.forEach((p, i) => {
      expect(paper[i]?.id).toBe(p.id);
      expect(paper[i]?.label).toBe(String(i + 1));
      expect(paper[i]?.wording).toEqual([p.goal]);
      expect(p.expected).toBe(`r_${p.id}`);
      expect(p.uses).toEqual(i === 0 ? [] : [`r_t${i}`]);
    });
    // « Montrer que »: the only question whose result the exam prints.
    expect(questions.map(q => q.m.target !== undefined)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    const first = loaded.exercise.parts[0];
    expect(question('t1').frames[0]?.target?.math).toBe(first?.goal.math);
  });

  it('everything is unreviewed, on the content version, with skills of the map', () => {
    const trusts = objectsAt(exRaw, 'trust');
    expect(trusts.length).toBeGreaterThanOrEqual(8);
    for (const t of trusts) {
      expect(t).toEqual({
        reviewed: false,
        contentVersion: authored.contentVersion,
        source: 'authored',
        status: 'ok',
      });
    }
    expect(authored.contentVersion).toBe('p22sc2-0.1.0');
    for (const p of authored.parts) {
      for (const s of p.groups.flatMap(g => g.steps)) {
        expect(s.skills.length).toBeGreaterThan(0);
        for (const skill of s.skills) {
          expect(SKILLS.has(skill)).toBe(true);
        }
      }
    }
  });
});

describe('the figure', () => {
  const figure = authored.figure;
  if (!figure) {
    throw new Error('the exercise has no figure');
  }
  const edges = edgesOf(figure);

  it('is a tree the registry accepts', () => {
    expect(resolveSpec(figure.spec).ok).toBe(true);
    expect(edges.map(e => e.id)).toEqual(Object.keys(BRANCH));
  });

  it('prints the two branches of the exam, with the engine values', () => {
    const given = edges.filter(e => e.p !== undefined);
    expect(given.map(e => e.id)).toEqual(['a', 'a.f']);
    for (const e of given) {
      expect(e.show).toBe('given');
      expect(parseRat(e.p ?? '')).toEqual(T[BRANCH[e.id] ?? 'f']);
    }
    for (const e of edges.filter(x => x.p === undefined)) {
      expect(e.show).toBe('blank');
    }
  });

  it('every empty branch names the quantity it carries', () => {
    for (const e of edges.filter(x => x.p === undefined)) {
      expect(e.node).toBe(BRANCH[e.id]);
      expect(TREE_QUANTITIES).toContain(e.node);
      expect(T[e.node as TreeQuantity]).toBeDefined();
    }
  });

  it('marks branches of the picture, for every plan card of the exercise', () => {
    const templateKeys = TREE_TEMPLATE_IDS.flatMap(
      id => templateOf(id)?.cardKeys ?? [],
    );
    const ids = new Set(edges.map(e => e.id));
    for (const [key, marked] of Object.entries(figure.marks)) {
      expect(templateKeys).toContain(key);
      for (const id of marked) {
        expect(ids.has(id)).toBe(true);
      }
    }
    const cardKeys = questions.flatMap(q => q.m.plan.cards.map(c => c.key));
    expect(Object.keys(figure.marks).sort()).toEqual(
      [...new Set(cardKeys)].sort(),
    );
  });
});

describe('hints and the paper lines', () => {
  it('hints 1 and 2 of every card and pick hold no digit and no formula', () => {
    for (const q of questions) {
      const ladders = [
        ...q.m.plan.cards.map(c => ({ id: c.id, hints: c.hints })),
        ...q.m.picks.map(p => ({ id: `pick ${p.id}`, hints: p.hints })),
      ];
      for (const { id, hints } of ladders) {
        expect(hints.length).toBeGreaterThanOrEqual(2);
        for (const h of hints.slice(0, 2)) {
          expect({ where: `${q.id}/${id}`, digit: hasDigit(h) }).toEqual({
            where: `${q.id}/${id}`,
            digit: false,
          });
          expect(h.math).toBeUndefined();
        }
      }
    }
  });

  it('the third hint of a written step is its formula, with no value', () => {
    for (const q of questions) {
      const built = q.m.builtFrames ?? q.m.plan.cards.map(c => c.id);
      for (const c of q.m.plan.cards.filter(x => built.includes(x.id))) {
        expect(c.hints).toHaveLength(3);
        const node = q.graph.nodes.find(n => n.id === c.key);
        expect(c.hints[2]?.math?.startsWith(`${node?.label} = `)).toBe(true);
        expect(literalFractions(c.hints[2]?.math ?? '')).toEqual([]);
      }
    }
  });

  it('the plan, the word and the opening hold no digit', () => {
    for (const q of questions) {
      for (const rich of [
        ...q.m.opening.route,
        q.m.opening.help,
        q.m.plan.prompt,
        ...q.m.plan.hints,
        q.m.read.prompt,
        ...q.m.read.hints,
        q.m.read.notOrderWord,
      ]) {
        expect(hasDigit(rich)).toBe(false);
      }
    }
  });

  it('every blank of the paper lines names a node of its question', () => {
    for (const q of questions) {
      const ids = new Set(q.graph.nodes.map(n => n.id));
      const blanks = q.m.skeleton.flatMap(line => [
        ...[...line.fr.matchAll(/\{([a-z0-9_]+)\}/g)].map(m => m[1] ?? ''),
        ...[...(line.math ?? '').matchAll(HIS_BLANK)].map(m => m[1] ?? ''),
      ]);
      expect(blanks.length).toBeGreaterThan(0);
      for (const b of blanks) {
        expect({ q: q.id, node: b, known: ids.has(b) }).toEqual({
          q: q.id,
          node: b,
          known: true,
        });
      }
      // The answer of the question is one of his blanks.
      const result = q.graph.nodes.find(n => n.role === 'result');
      expect(blanks).toContain(result?.id);
    }
  });

  it('a number written by hand on the paper is a number of the statement', () => {
    let seen = 0;
    for (const p of authored.parts) {
      const q = question(p.id);
      const texts = [
        ...q.m.skeleton.flatMap(l => [l.fr, l.math ?? '']),
        ...p.writeup.modelFr,
      ];
      for (const text of texts) {
        // An earlier result is his blank or an engine value (`\val`), never typed.
        for (const v of literalFractions(text)) {
          expect({ text, ok: among(v, STATEMENT) }).toEqual({ text, ok: true });
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThanOrEqual(12);
  });

  it('every finding is about nodes of its question, through a pick that exists', () => {
    for (const q of questions) {
      const ids = new Set(q.graph.nodes.map(n => n.id));
      for (const f of q.m.findings) {
        for (const n of f.nodes) {
          expect(ids.has(n)).toBe(true);
          expect(f.reasons[n]).toBeDefined();
        }
        if (f.viaCard !== undefined) {
          expect(q.m.picks.map(p => p.id)).toContain(f.viaCard);
        }
      }
      // Every written step is in a finding.
      const found = q.m.findings.flatMap(f => f.nodes);
      const own = q.id === 't3' ? ['nf_given_a', 'nf_given_na'] : null;
      expect(found).toEqual(
        own ?? q.graph.nodes.filter(n => n.main).map(n => n.id),
      );
    }
  });
});

describe('the similar questions', () => {
  it('two per question: the same structure, then a twist, on the same template', () => {
    expect(slots).toHaveLength(8);
    for (const q of questions) {
      const own = slots.filter(s => s.q === q);
      expect(own.map(s => s.slot.kind)).toEqual(['same_structure', 'twist']);
      for (const s of own) {
        expect(s.slot.graph.template).toBe(TEMPLATE[q.id]);
        expect(s.slot.allow).toEqual([]);
      }
    }
  });

  it.each(slots.map(s => [s.where, s] as const))(
    '%s shows no number of the statement and no answer of the exercise',
    (_, s) => {
      const printed = s.slot.figure
        ? edgesOf(s.slot.figure).flatMap(e => {
            const v = e.p === undefined ? null : parseRat(e.p);
            return v ? [v] : [];
          })
        : [];
      const shown = [
        s.tree.a,
        s.tree.f_given_a,
        s.tree.f,
        s.tree.f_given_na,
        ...(s.graph.givens ?? []),
        ...s.graph.nodes.map(n => n.value),
        ...printed,
        ...literalFractions(s.slot.statement.fr ?? ''),
      ];
      const hits = shown.filter(v => among(v, [...STATEMENT, ...ANSWERS]));
      expect(hits).toEqual([]);
    },
  );

  it.each(slots.map(s => [s.where, s] as const))(
    '%s has no wrong road that reaches the right value',
    (_, s) => {
      const traps = (mutationsFor(s.graph).traps ?? []).filter(
        t => t.id !== 'uses_the_target',
      );
      expect(traps.map(t => `${t.nodeId}:${t.id}`)).toEqual([]);
    },
  );

  it.each(slots.map(s => [s.where, s] as const))(
    "%s: the picture agrees with the question's graph",
    (_, s) => {
      const figure = s.slot.figure;
      if (!figure) {
        // The story of question 4: he draws the tree himself.
        expect(s.where).toBe('t4/twist');
        return;
      }
      expect(resolveSpec(figure.spec).ok).toBe(true);
      const side = s.slot.graph.args.swap === true ? SWAPPED : BRANCH;
      const edges = edgesOf(figure);
      expect(edges.map(e => e.id)).toEqual(Object.keys(BRANCH));
      for (const e of edges) {
        if (e.p === undefined) {
          expect(e.show).toBe('blank');
        } else {
          expect(e.show).toBe('given');
          expect(parseRat(e.p)).toEqual(s.tree[side[e.id] ?? 'f']);
        }
      }
      // The first branch and the branch after it are always printed, on the side the question says.
      const printed = edges.filter(e => e.p !== undefined).map(e => e.id);
      expect(printed).toEqual(
        expect.arrayContaining(
          s.slot.graph.args.swap === true ? ['na', 'na.f'] : ['a', 'a.f'],
        ),
      );
    },
  );

  it.each(slots.map(s => [s.where, s] as const))(
    '%s: every number of its statement is a value of its own tree',
    (_, s) => {
      const text = s.slot.statement.fr ?? '';
      const own = TREE_QUANTITIES.map(k => s.tree[k]);
      const written = [
        ...literalFractions(text),
        ...[...text.matchAll(/(\d+)\s*%/g)].map(m => frac(Number(m[1]), 100)),
      ];
      for (const v of written) {
        expect({ text, ok: among(v, own) }).toEqual({ text, ok: true });
      }
    },
  );
});

describe('the small examples', () => {
  it('nine cases on one class: two, two, two and three', () => {
    expect(Object.keys(cases.questions)).toEqual(PART_IDS);
    expect(Object.values(cases.questions).map(l => l.length)).toEqual([
      2, 2, 2, 3,
    ]);
    const counts = examples.map(
      e => `${e.c.spec.n},${e.c.spec.a},${e.c.spec.af},${e.c.spec.naf}`,
    );
    expect(new Set(counts).size).toBe(1);
    expect(cases.exerciseId).toBe(authored.id);
    expect(cases.reviewed).toBe(false);
  });

  it.each(examples.map(e => [e.where, e] as const))(
    "%s rehearses a card of its question on the question's template",
    (_, e) => {
      const keys = e.q.m.plan.cards.map(c => c.key);
      expect(e.c.spec.template).toBe(TEMPLATE[e.q.id]);
      expect(keys).toContain(e.c.spec.node);
      expect(e.c.card).toBe(e.c.spec.node);
      expect(e.graph.nodes.some(n => n.id === e.c.spec.node && n.main)).toBe(
        true,
      );
    },
  );

  it.each(examples.map(e => [e.where, e] as const))(
    '%s shares no value with the exam tree',
    (_, e) => {
      const exam = TREE_QUANTITIES.map(k => T[k]);
      const hits = e.graph.nodes.filter(n => among(n.value, exam));
      expect(hits.map(n => n.id)).toEqual([]);
    },
  );

  it.each(examples.map(e => [e.where, e] as const))(
    '%s: no named slip gives the right value',
    (_, e) => {
      const lucky = mutationsFor(e.graph).dropped.filter(
        d => d.why === 'equals_right_value' && d.id !== 'uses_the_target',
      );
      expect(lucky.map(d => `${d.nodeId}:${d.id}`)).toEqual([]);
    },
  );

  it('one card per case in a question, and no number in what he reads', () => {
    for (const id of PART_IDS) {
      const cards = examples.filter(e => e.q.id === id).map(e => e.c.card);
      expect(new Set(cards).size).toBe(cards.length);
    }
    for (const e of examples) {
      const texts = [e.c.story, e.c.ask, ...e.c.legend.map(l => l.says)];
      for (const rich of e.c.hint ? [...texts, e.c.hint] : texts) {
        expect(hasDigit(rich)).toBe(false);
      }
      expect(e.c.legend.map(l => l.latex)).toEqual(['A', '\\overline{A}', 'F']);
    }
  });
});

describe('the trips', () => {
  it('one per question, with the plan cards in route order', () => {
    expect(trips.exerciseId).toBe(authored.id);
    expect(trips.reviewed).toBe(false);
    expect(trips.overview.questions.map(q => q.id)).toEqual(PART_IDS);
    expect(Object.keys(trips.questions)).toEqual(PART_IDS);
    for (const q of questions) {
      const trip = trips.questions[q.id];
      expect(trip?.steps.map(s => s.card)).toEqual(
        q.m.plan.cards.map(c => c.id),
      );
      expect(trip?.after.map(a => a.kind)).toEqual(['recipe', 'similar']);
      expect(trip?.changed === undefined).toBe(q.id === 't1');
    }
  });

  it('a carried or reused result names an earlier question and a node of its graph', () => {
    let seen = 0;
    for (const q of questions) {
      const trip = trips.questions[q.id];
      const refs = [
        ...(trip?.have ?? []).flatMap(l => (l.carried ? [l.carried] : [])),
        ...(trip?.steps ?? []).flatMap(s => (s.reuse ? [s.reuse] : [])),
      ];
      for (const ref of refs) {
        expect(PART_IDS.indexOf(ref.from)).toBeGreaterThanOrEqual(0);
        expect(PART_IDS.indexOf(ref.from)).toBeLessThan(PART_IDS.indexOf(q.id));
        const node = question(ref.from).graph.nodes.find(
          n => n.id === ref.node,
        );
        expect(node?.main).toBe(true);
        seen += 1;
      }
      // A reused step is reused for what its own card asks.
      for (const s of trip?.steps ?? []) {
        if (s.reuse) {
          const key = q.m.plan.cards.find(c => c.id === s.card)?.key;
          expect(s.reuse.node).toBe(key);
        }
      }
    }
    expect(seen).toBe(7);
  });

  it('a formula of the map is drawn by the math renderer and holds statement numbers only', () => {
    const formulas = strings(tripsRaw).filter(s => s.key === 'math');
    expect(formulas.length).toBeGreaterThan(5);
    for (const { text } of formulas) {
      expect(() => parseLatexSubset(text)).not.toThrow();
      for (const v of literalFractions(text)) {
        expect(among(v, STATEMENT)).toBe(true);
      }
    }
  });
});

describe('the prepared replies', () => {
  const cardKeys = new Set(
    questions.flatMap(q => q.m.plan.cards.map(c => c.key)),
  );
  const libraryIds = new Set(treeLibrary.map(m => m.id));

  it('four templates on cards and slips that exist', () => {
    expect(replies.exerciseId).toBe(authored.id);
    expect(replies.reviewed).toBe(false);
    expect(replies.templates.map(t => t.id)).toEqual([
      'bare_given',
      'unsimplified_target',
      'above_one_quotient',
      'trap_complement',
    ]);
    const frameIds = questions.flatMap(q => q.frames.map(f => f.id));
    for (const t of replies.templates) {
      if (t.when.card !== undefined) {
        expect(cardKeys.has(t.when.card)).toBe(true);
      }
      if (t.when.misconception !== undefined) {
        expect(libraryIds.has(t.when.misconception)).toBe(true);
      }
      if (t.when.frame !== undefined) {
        expect(frameIds).toContain(t.when.frame);
      }
    }
  });

  it('the result of the exam is shown only on a card whose question prints it', () => {
    const withTarget = replies.templates.filter(t =>
      t.say.some(s => 'target' in s),
    );
    expect(withTarget.map(t => t.id)).toEqual(['unsimplified_target']);
    for (const t of withTarget) {
      const asked = questions.filter(q =>
        q.m.plan.cards.some(c => c.key === t.when.card),
      );
      expect(asked.every(q => q.m.target !== undefined)).toBe(true);
    }
  });

  it('an Arabic line holds no Latin letter, digit or math sign', () => {
    for (const t of replies.templates) {
      for (const s of t.say) {
        if ('ar' in s) {
          expect(findRunIssues([{ ar: s.ar }])).toEqual([]);
        }
      }
    }
  });
});

describe('the slip library of the tree', () => {
  const ids = treeLibrary.map(m => m.id);
  const PICK_ONLY = ['mut.sums_a_column', 'mut.multiplies_paths'];
  const pickOptions = questions.flatMap(q =>
    q.m.picks.flatMap(p => p.cards.filter(c => c.misconceptionId)),
  );

  it('is registered once in the shared library', () => {
    const all = MisconceptionLibrarySchema.parse(mutationLibrary()).map(
      m => m.id,
    );
    expect(new Set(all).size).toBe(all.length);
    for (const id of ids) {
      expect(all).toContain(id);
    }
  });

  it('holds every slip the templates can name: exam, similar questions, small examples, picks', () => {
    const fromGraphs = [
      ...questions.map(q => q.graph),
      ...slots.map(s => s.graph),
      ...examples.map(e => e.graph),
    ].flatMap(slipIds);
    expect(fromGraphs.length).toBeGreaterThan(100);
    const used = new Set([
      ...fromGraphs.map(id => `mut.${id}`),
      ...pickOptions.map(c => c.misconceptionId ?? ''),
    ]);
    for (const id of used) {
      expect({ id, held: ids.includes(id) }).toEqual({ id, held: true });
    }
    // And nothing else: an entry no template and no pick names would never be shown.
    expect([...ids].sort()).toEqual([...used].sort());
  });

  it('each entry says what the line is, twice, with no digit and no banned word', () => {
    for (const m of treeLibrary) {
      expect(m.id.startsWith('mut.')).toBe(true);
      expect(SKILLS.has(m.skillId)).toBe(true);
      expect(m.category).toBe('math');
      expect(m.trust).toEqual({
        reviewed: false,
        contentVersion: 'mut-tree-0.1.0',
        source: 'authored',
        status: 'ok',
      });
      const texts = [m.feedback, m.feedbackConfirmed].filter(
        (x): x is Rich => x !== undefined,
      );
      expect(texts).toHaveLength(PICK_ONLY.includes(m.id) ? 1 : 2);
      expect(JSON.stringify(m.feedback)).not.toBe(
        JSON.stringify(m.feedbackConfirmed),
      );
      for (const rich of texts) {
        expect(studentFacingIssues(rich)).toEqual([]);
        expect(hasDigit(rich)).toBe(false);
        expect(rich.math).toBeUndefined();
      }
    }
  });

  it('a slip only a pick can name says what its pick says', () => {
    for (const id of PICK_ONLY) {
      const option = pickOptions.find(c => c.misconceptionId === id);
      expect(option?.feedback).toBeDefined();
      expect(treeLibrary.find(m => m.id === id)?.feedback).toEqual(
        option?.feedback,
      );
    }
  });
});

describe('the words of the new files', () => {
  it('no non-Tunisian word (lexicon)', () => {
    for (const file of FILES) {
      const found = bannedIn(fs.readFileSync(file, 'utf8')).map(b => b.phrase);
      expect({ file: path.basename(file), found }).toEqual({
        file: path.basename(file),
        found: [],
      });
    }
  });

  it('no word that hands out the method («جزء», «نجمعو», « partie », « combiner »)', () => {
    const ENGLISH = ['description', 'signature', 'use', 'about'];
    for (const file of FILES) {
      const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      const texts = strings(raw).filter(s => !ENGLISH.includes(s.key));
      for (const { text } of texts) {
        expect({ text, issues: studentFacingIssues({ fr: text }) }).toEqual({
          text,
          issues: [],
        });
      }
    }
  });

  it('never a Latin letter, a digit or a formula inside an Arabic run', () => {
    for (const file of FILES) {
      const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      const runs = strings(raw).filter(
        s => s.key === 'ar' && /[؀-ۿ]/.test(s.text),
      );
      for (const { text } of runs) {
        expect({ text, issues: findRunIssues([{ ar: text }]) }).toEqual({
          text,
          issues: [],
        });
      }
    }
  });

  it('every formula of the small examples and of the exercise is drawn by the math renderer', () => {
    const formulas = [
      ...strings(casesRaw),
      ...strings(loaded.exercise.figure),
      ...strings(questions.flatMap(q => q.m.similar ?? [])),
    ].filter(s => s.key === 'math' || s.key === 'latex');
    expect(formulas.length).toBeGreaterThan(30);
    for (const { text } of formulas) {
      expect(() => parseLatexSubset(text)).not.toThrow();
    }
  });
});
