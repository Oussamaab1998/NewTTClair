/**
 * Prepared small cases per question (S1..S4): chosen so their values do not
 * collide with the question's unearned values; their coincidences are listed
 * in the AI pack and a move is refused on a case where his own slip gives
 * the right number.
 *
 * Two sources. The urn exercise's cases are code (below, as they always
 * were: model-facing, English, opened only by an AI move). A newer exercise
 * authors them as content, one file per exercise
 * (src/content/cases.<exercise>.json): a case may then name the plan `card`
 * it rehearses, and the lesson opens it by itself on the second «ما نعرفش»
 * of that card, before any AI call (S1); it carries what he reads on its
 * card (the story, what the letters stand for, what is asked).
 */
import { z } from 'zod';

import treeCases from '../../content/cases.bac2022p-sc-ex2.json';
import { RichSchema, type Rich } from '../../content/schema';
import type { CaseSpec } from '../session/state';

/** The ids a pack gives its prepared cases, in order. */
export const PREPARED_CASE_IDS = ['S1', 'S2', 'S3', 'S4'] as const;

export interface PreparedEntry {
  id: string;
  spec: CaseSpec;
  /** What it is for (model-facing, English). */
  use: string;
  /** The plan-card key it rehearses: the lesson opens it on that card. */
  card?: string;
  /** What he reads on the case card. */
  story?: Rich;
  /** What each letter of the picture stands for in the story. */
  legend?: { latex: string; says: Rich }[];
  /** What he is asked to find on the case. */
  ask?: Rich;
  /** One hint on the case itself (a «ما نعرفش» while it is open): never a value. */
  hint?: Rich;
}

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);

const TreeCaseSchema = z.strictObject({
  kind: z.literal('tree'),
  template: Id,
  node: Id,
  n: z.number().int().min(2).max(200),
  a: z.number().int().min(1),
  af: z.number().int().min(0),
  naf: z.number().int().min(0),
});

const AuthoredCaseSchema = z.strictObject({
  card: Id.optional(),
  spec: TreeCaseSchema,
  use: z.string().min(1),
  story: RichSchema,
  legend: z
    .array(z.strictObject({ latex: z.string().min(1), says: RichSchema }))
    .max(4)
    .default([]),
  ask: RichSchema,
  hint: RichSchema.optional(),
});

/** One file per exercise: its questions' prepared cases, at most four each. */
export const PreparedCaseFileSchema = z.strictObject({
  exerciseId: z.string().min(1),
  contentVersion: z.string().min(1),
  reviewed: z.boolean(),
  questions: z.record(z.string(), z.array(AuthoredCaseSchema).min(1).max(4)),
});
export type PreparedCaseFile = z.infer<typeof PreparedCaseFileSchema>;

/** A prepared small case and what it is for (model-facing, English). */
interface PreparedSpec {
  spec: CaseSpec;
  use: string;
}

const CODED: Readonly<
  Record<string, Readonly<Record<string, readonly PreparedSpec[]>>>
> = {
  'bac2022c-sc-ex2': {
    '1': [
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'pairs: with order against together (the link between the two counts). Never to check a division by k (k = 2 hides it).',
      },
      {
        spec: { kind: 'box', n: 4, k: 3 },
        use: 'triples: his rule tested beyond pairs; one group is written in several orders.',
      },
      {
        spec: { kind: 'urn', reds: 2, blacks: 4, k: 3, j: 1 },
        use: 'the favourable count in small: one red with every black pair, listed by hand.',
      },
      {
        spec: { kind: 'box', n: 7, k: 3 },
        use: 'a bigger box when his rule must hold beyond what he can list (the engine counts, he predicts).',
      },
    ],
    '2': [
      {
        spec: { kind: 'urn', reds: 2, blacks: 3, k: 3, j: 0 },
        use: 'what a draw with no red ball is: he lists them by hand.',
      },
      {
        spec: { kind: 'urn', reds: 3, blacks: 4, k: 3, j: 0 },
        use: 'his claim «B is the opposite of A» tested on a new urn: he lists the no-red draws and compares with what the claim predicts.',
      },
      {
        spec: { kind: 'box', n: 5, k: 3 },
        use: 'groups of 3 among 5: each group is written in several orders (after a missing division at the favourable count).',
      },
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'pairs: with order against together.',
      },
    ],
    '3a': [
      {
        spec: { kind: 'box', n: 5, k: 3 },
        use: 'the places of 3 successes among 5 trials, as groups of 3 letters among 5 (his Question 1 rule).',
      },
      {
        spec: { kind: 'box', n: 4, k: 2 },
        use: 'the places of 2 successes among 4 trials (SSFF, SFSF...), listed by hand.',
      },
      {
        spec: { kind: 'box', n: 4, k: 3 },
        use: 'the places of 3 successes among 4 trials.',
      },
    ],
    '3b': [
      {
        spec: { kind: 'urn', reds: 1, blacks: 3, k: 1, j: 1 },
        use: 'one trial with p = 1/4 (success: the red ball): a twin law for the mean and the spread of one trial.',
      },
      {
        spec: { kind: 'urn', reds: 2, blacks: 3, k: 1, j: 1 },
        use: 'one trial with p = 2/5: a second twin, where p q and p p differ.',
      },
    ],
  },
};

/**
 * The authored case files (src/content/cases.<exercise>.json). A file that
 * does not parse gives no cases (the lesson goes on without small examples);
 * `CASE_FILE_ISSUES` names it and a test keeps it empty.
 */
const SOURCES: readonly unknown[] = [treeCases];
export const CASE_FILE_ISSUES: string[] = [];
const FILES: PreparedCaseFile[] = SOURCES.flatMap(raw => {
  const r = PreparedCaseFileSchema.safeParse(raw);
  if (!r.success) {
    CASE_FILE_ISSUES.push(r.error.message.slice(0, 300));
  }
  return r.success ? [r.data] : [];
});

/** Registers one more file of authored cases (a test fixture); throws when it is not valid. */
export function registerCaseFile(raw: unknown): void {
  const file = PreparedCaseFileSchema.parse(raw);
  if (!FILES.some(f => f.exerciseId === file.exerciseId)) {
    FILES.push(file);
  }
}

/** The prepared cases of a question, with their pack ids (S1..S4). */
export function preparedFor(
  exerciseId: string,
  questionId: string,
): PreparedEntry[] {
  const authored = FILES.find(f => f.exerciseId === exerciseId)?.questions[
    questionId
  ];
  if (authored) {
    return authored.slice(0, PREPARED_CASE_IDS.length).map((c, i) => ({
      id: PREPARED_CASE_IDS[i]!,
      spec: c.spec,
      use: c.use,
      story: c.story,
      legend: c.legend,
      ask: c.ask,
      ...(c.card !== undefined && { card: c.card }),
      ...(c.hint !== undefined && { hint: c.hint }),
    }));
  }
  return (CODED[exerciseId]?.[questionId] ?? [])
    .slice(0, PREPARED_CASE_IDS.length)
    .map((c, i) => ({ id: PREPARED_CASE_IDS[i]!, spec: c.spec, use: c.use }));
}

/** The prepared case that rehearses a plan card, or null. */
export const preparedForCard = (
  exerciseId: string,
  questionId: string,
  card: string,
): PreparedEntry | null =>
  preparedFor(exerciseId, questionId).find(c => c.card === card) ?? null;
