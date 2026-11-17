/**
 * The bridge from a finished small box back to the question (U4). He found
 * the box's groups (a complete list, or a line the box credits): the
 * prepared reply says so, shows with the box's own numbers how the ordered
 * count gives the groups (n × (n − 1) × … then divided by the orderings of
 * one group), then the question's data (the trip's "what we have" lines) and
 * «write your line on the paper». Every number comes from the engine.
 *
 * It never shows a value of the question he has not found (CLAUDE.md rule 6:
 * not its count, not a step of its hint ladder): when one of the box's
 * numbers equals such a value, the calculations are left out.
 *
 * A small tree (a prepared example counted whole) has its own bridge: his
 * own case line, one sentence on what he just did (a path, what is left of a
 * total, a complement, a branch, the tree read backwards), then the same
 * two closing parts. Its line is shown only when none of its values is one
 * the question still hides.
 *
 * The words are derja whatever the UI language, as the content's own
 * explanations, so they are read from the ar-TN file (hybrid.bridge.*).
 */
import type { CaseSpec, SessionRuntime } from '../../ai/session/state';
import { forbiddenValues } from '../../ai/verify/message';
import { arrangements, factorial } from '../../engine/combinatorics';
import { fractionToLatex } from '../../engine/format';
import { choose, frac, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import type { Rich } from '../../content/schema';
import arTN from '../../i18n/ar-TN.json';
import { evalChain, lineLatex } from '../../method/lineChain';
import type { ReplyPart } from '../../method/replies';
import type { QuestionCtx } from './conductor';

const WORDS = arTN.hybrid.bridge;

const part = (tone: 'success' | 'info', rich: Rich): ReplyPart => ({
  kind: 'feedback',
  tone,
  rich,
});

const times = (factors: readonly number[]): string =>
  factors.map(String).join(' \\times ');

/** The question's data as he saw it on the map (not the results carried from earlier questions). */
function questionData(ctx: QuestionCtx): string | null {
  const lines = (ctx.tour?.question.have ?? []).flatMap(l =>
    l.fr !== undefined && !l.carried ? [l.fr] : [],
  );
  return lines.length > 0 ? lines.join(' ; ') : null;
}

export function caseBridge(
  ctx: QuestionCtx,
  rt: SessionRuntime,
  spec: Extract<CaseSpec, { kind: 'box' }>,
): ReplyPart[] {
  const { n, k } = spec;
  const ordered = frac(arrangements(n, k));
  const orderings = frac(factorial(k));
  const groups = frac(choose(n, k));
  const unearned = forbiddenValues(
    { rt, pack: ctx.pack, experiment: null },
    Infinity,
  );
  const leaks = (v: Fraction) => unearned.some(f => sameRat(f.value, v));
  const calculations =
    k >= 2 && ![ordered, orderings, groups].some(leaks)
      ? [
          part('info', {
            ar: [{ ar: WORDS.ordered }],
            math: `${times(
              Array.from({ length: k }, (_, i) => n - i),
            )} = ${fractionToLatex(ordered)}`,
          }),
          part('info', {
            ar: [{ ar: WORDS.perGroup }],
            math: `\\dfrac{${times(
              Array.from({ length: k }, (_, i) => n - i),
            )}}{${times(
              Array.from({ length: k }, (_, i) => k - i),
            )}} = ${fractionToLatex(groups)}`,
          }),
        ]
      : [];
  const data = questionData(ctx);
  return [
    part('success', { ar: [{ ar: WORDS.done }] }),
    ...calculations,
    part('info', {
      ar: [{ ar: WORDS.question }],
      ...(data !== null && { fr: data }),
    }),
    part('info', { ar: [{ ar: WORDS.write }] }),
  ];
}

/** The reply that opens a prepared small tree by itself, before any AI call (S1). */
export const treeOpening = (): ReplyPart =>
  part('info', { ar: [{ ar: arTN.hybrid.case.treeOpen }] });

type TreeIdea = 'path' | 'rest' | 'complement' | 'branch' | 'reverse';

/** What finding each quantity on a small tree showed him. */
const TREE_IDEA: Readonly<Record<string, TreeIdea>> = {
  a_and_f: 'path',
  na_and_nf: 'path',
  na_and_f: 'rest',
  not_a: 'complement',
  nf_given_a: 'complement',
  nf_given_na: 'complement',
  not_f: 'complement',
  f_given_na: 'branch',
  na_given_nf: 'reverse',
};

/**
 * The bridge from a small tree he just solved back to the question. Call it
 * BEFORE his line joins the session: a value he writes is his from then on,
 * and the guard would see nothing left to hide.
 */
export function treeBridge(
  ctx: QuestionCtx,
  rt: SessionRuntime,
  spec: Extract<CaseSpec, { kind: 'tree' }>,
  raw: string,
): ReplyPart[] {
  const chain = evalChain(raw);
  const values =
    chain.kind === 'unreadable'
      ? []
      : chain.kind === 'chain'
      ? chain.sides.map(side => side.value)
      : [chain.value];
  const unearned = forbiddenValues(
    { rt, pack: ctx.pack, experiment: null },
    Infinity,
  );
  const shown =
    values.length > 0 &&
    !values.some(v => unearned.some(f => sameRat(f.value, v)));
  const idea = TREE_IDEA[spec.node];
  const data = questionData(ctx);
  return [
    shown
      ? part('success', {
          ar: [{ ar: WORDS.tree.done }],
          math: lineLatex(raw),
        })
      : part('success', { ar: [{ ar: WORDS.tree.doneAlone }] }),
    ...(idea ? [part('info', { ar: [{ ar: WORDS.tree[idea] }] })] : []),
    part('info', {
      ar: [{ ar: WORDS.question }],
      ...(data !== null && { fr: data }),
    }),
    part('info', { ar: [{ ar: WORDS.write }] }),
  ];
}
