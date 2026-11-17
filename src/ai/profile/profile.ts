/**
 * The student model the tutor reads at the start of every session and that
 * every finished question updates (owner, 2026-10-29: know his level, his
 * mistakes, and what he lost from earlier school years).
 *
 * Two kinds of knowledge, kept apart:
 * - skill counters: engine evidence only (credited nodes, named slips,
 *   «ما نعرفش», unsimplified results, ambiguous divisions);
 * - observations: the tutor's hypotheses (record_observation), each with the
 *   lines that support it. One is confirmed when the same slip shows up again
 *   in a later session; it is dropped after three clean credits on its skill.
 * Nothing personal is stored: no name, only skills and maths lines.
 * The skill state is a guess from counts (thresholds untuned) and is never
 * shown to the student.
 */
import { z } from 'zod';

import type { KeyValueStore } from '../../storage/kv';
import type { SessionState } from '../session/state';
import type { WarmupAnswer } from '../../warmup/warmup';

export const SKILL_STATES = [
  'unknown',
  'weak',
  'shaky',
  'ok',
  'solid',
] as const;
export type SkillLevel = (typeof SKILL_STATES)[number];

const SkillRecordSchema = z.object({
  attempts: z.number().int(),
  firstTry: z.number().int(),
  afterHelp: z.number().int(),
  slips: z.record(z.string(), z.number().int()),
  dontKnow: z.number().int(),
  lastSeenAt: z.number(),
  level: z.enum(SKILL_STATES),
});
export type SkillRecord = z.infer<typeof SkillRecordSchema>;

const ObservationSchema = z.object({
  id: z.string(),
  at: z.number(),
  exerciseId: z.string(),
  questionId: z.string(),
  kind: z.string(),
  skill: z.string().nullable(),
  slip: z.string().nullable(),
  note: z.string(),
  /** His own lines (raw text) that support it. */
  evidence: z.array(z.string()),
  confidence: z.string(),
  status: z.enum(['open', 'confirmed', 'dropped']),
});
export type ProfileObservation = z.infer<typeof ObservationSchema>;

const SessionSummarySchema = z.object({
  exerciseId: z.string(),
  questionId: z.string(),
  endedAt: z.number(),
  outcome: z.string(),
  studentTurns: z.number().int(),
  dontKnows: z.number().int(),
  credited: z.array(z.string()),
  slips: z.array(z.string()),
  summary: z.string(),
  nextTime: z.string(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const ProfileSchema = z.object({
  v: z.literal(1),
  createdAt: z.number(),
  section: z.string().nullable(),
  year: z.string().nullable(),
  diagnosticDone: z.boolean(),
  skills: z.record(z.string(), SkillRecordSchema),
  observations: z.array(ObservationSchema),
  sessions: z.array(SessionSummarySchema),
  componentRequests: z.array(
    z.object({ name: z.string(), studentDoes: z.string(), why: z.string() }),
  ),
  /** The warm-up of each exercise he did (asked once, before the exercise). */
  warmups: z
    .record(
      z.string(),
      z.object({
        at: z.number(),
        answers: z.array(
          z.object({
            id: z.string(),
            skill: z.string(),
            verdict: z.enum(['right', 'wrong', 'dont_know', 'skipped']),
            given: z.string().optional(),
            means: z.string().optional(),
          }),
        ),
      }),
    )
    .optional(),
});
export type StudentProfile = z.infer<typeof ProfileSchema>;

export const PROFILE_KEY = 'ai.profile.v1';
export const MAX_OBSERVATIONS = 200;
export const MAX_SESSIONS = 100;

export function emptyProfile(now: number): StudentProfile {
  return {
    v: 1,
    createdAt: now,
    section: null,
    year: null,
    diagnosticDone: false,
    skills: {},
    observations: [],
    sessions: [],
    componentRequests: [],
  };
}

export function loadProfile(store: KeyValueStore): StudentProfile | null {
  try {
    const raw = store.getString(PROFILE_KEY);
    if (!raw) {
      return null;
    }
    const p = ProfileSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

export function saveProfile(store: KeyValueStore, p: StudentProfile): void {
  store.set(PROFILE_KEY, JSON.stringify(p));
}

/** What each node of the urn, binomial and tree templates trains. */
export const NODE_SKILL: Readonly<Record<string, string>> = {
  ord: 'ordering-vs-choosing',
  orderings: 'ordering-vs-choosing',
  total: 'combinations-count',
  fav_red: 'combinations-count',
  fav_black: 'combinations-count',
  none: 'combinations-count',
  fav: 'multiplication-principle',
  result: 'probability-by-counting',
  value: 'fractions-simplify',
  // The two-event tree (src/method/templatesTree.ts): a path is its branches
  // multiplied; a total is its paths together; a sibling branch is a
  // complement at its node; a second-level branch is a path over a branch.
  a_and_f: 'probability-tree',
  a_and_nf: 'probability-tree',
  na_and_nf: 'probability-tree',
  na_and_f: 'total-probability',
  not_f: 'complement-event',
  not_a: 'complement-event',
  nf_given_a: 'complement-event',
  nf_given_na: 'complement-event',
  f_given_na: 'conditional-probability',
  na_given_nf: 'reverse-conditional',
  // Numbered balls (src/method/templatesLaw.ts); a value of X (p_m2, p_0...)
  // is found by `nodeSkill`.
  p_none: 'complement-event',
  sum: 'law-sum-one',
  mean: 'expectation',
  square: 'variance',
  var: 'variance',
  p_trial: 'binomial-law',
  law_k: 'binomial-law',
  mean_n: 'binomial-mean',
  bound: 'fractions-operations',
  smallest: 'binomial-mean',
  // Function analysis (src/method/templatesFunction.ts).
  parity_line: 'function-parity',
  limit_form: 'forme-indeterminee',
  limit: 'limit-at-infinity',
  inner_d: 'chain-rule-exp',
  deriv: 'quotient-rule',
  top: 'variation-table',
};

/** The skill a node trains: the table above, or a value of X (`p_m2`, `p_0`). */
export function nodeSkill(node: string): string | undefined {
  return (
    NODE_SKILL[node] ??
    (/^p_m?\d+$/.test(node) ? 'random-variable-law' : undefined)
  );
}

/** The skill a named slip points at. */
export const SLIP_SKILL: Readonly<Record<string, string>> = {
  drop_division: 'ordering-vs-choosing',
  divide_by_k_not_k_factorial: 'ordering-vs-choosing',
  one_factor_divided: 'ordering-vs-choosing',
  ordered_instead_of_groups: 'ordering-vs-choosing',
  over_generalised_order_rule: 'ordering-vs-choosing',
  bracket_left_to_right: 'brackets-division',
  start_number_off: 'combinations-count',
  n_times_k: 'combinations-count',
  add_instead_of_multiply: 'multiplication-principle',
  missing_part: 'multiplication-principle',
  swap_numerator_denominator: 'probability-by-counting',
  unsimplified: 'fractions-simplify',
  // The tree's wrong roads (roadsOf in src/method/templatesTree.ts), each
  // with the skill its entry of the slip library names
  // (docs/exercises/BAC2022P_SC_EX2.md).
  adds_along_path: 'probability-tree',
  branch_for_path: 'probability-tree',
  first_branch_for_path: 'probability-tree',
  lower_branch_like_upper: 'probability-tree',
  wrong_second_branch: 'probability-tree',
  copies_another_branch: 'probability-tree',
  quotient_for_complement: 'probability-tree',
  // The right value by a road no branch or path of the tree explains.
  coincidence: 'probability-tree',
  total_for_path: 'total-probability',
  uses_the_target: 'total-probability',
  subtracts_branch_not_path: 'total-probability',
  adds_instead_of_subtracts: 'total-probability',
  first_minus_total: 'total-probability',
  complement_of_path: 'total-probability',
  adds_branches_for_total: 'total-probability',
  complement_of_total: 'complement-event',
  complement_forgotten: 'complement-event',
  inverts_instead_of_complement: 'complement-event',
  complement_of_other_branch: 'complement-event',
  complement_of_first_branch: 'complement-event',
  complement_across_nodes: 'conditional-probability',
  divides_by_total: 'conditional-probability',
  divides_by_first_branch: 'conditional-probability',
  multiplies_instead_of_divides: 'conditional-probability',
  intersection_for_conditional: 'conditional-probability',
  quotient_upside_down: 'fractions-operations',
  reverses_condition: 'reverse-conditional',
  condition_for_reverse: 'reverse-conditional',
  divides_by_other_total: 'reverse-conditional',
  // Numbered balls (src/method/templatesLaw.ts, the ex2 slip library).
  merges_identical_balls: 'counting-pairs',
  counts_balls_not_draws: 'counting-pairs',
  ball_drawn_twice: 'simultaneous-draw',
  counts_balls_not_pairs: 'probability-by-counting',
  forgot_one_minus: 'complement-event',
  misses_double_draw: 'au-moins-un',
  complement_partial_event: 'complement-event',
  confuses_event_and_complement: 'complement-event',
  law_sum_not_one: 'law-sum-one',
  mean_of_values_unweighted: 'expectation',
  mean_drops_signs: 'expectation',
  square_of_mean: 'variance',
  square_keeps_sign: 'variance',
  variance_forgets_square: 'variance',
  variance_adds_square: 'variance',
  variance_reversed: 'variance',
  forgets_count: 'binomial-law',
  failures_power_n: 'binomial-law',
  swaps_success_failure: 'binomial-law',
  p_of_complement: 'complement-event',
  variance_for_mean: 'binomial-mean',
  solve_multiplies: 'fractions-operations',
  rounds_down: 'binomial-mean',
  odd_for_even: 'function-parity',
  exp_negative_sign: 'exp-rules',
  exponent_rules_gap: 'exp-rules',
  multiplies_one_part: 'exp-rules',
  value_at_0_vs_limit: 'limit-at-infinity',
  cancel_leaves_zero: 'exp-rules',
  chain_rule_exp_factor: 'chain-rule-exp',
  derivative_keeps_x: 'chain-rule-exp',
  quotient_sign: 'quotient-rule',
  den_not_squared: 'quotient-rule',
  exp_zero_is_zero: 'exp-rules',
};

const blankSkill = (): SkillRecord => ({
  attempts: 0,
  firstTry: 0,
  afterHelp: 0,
  slips: {},
  dontKnow: 0,
  lastSeenAt: 0,
  level: 'unknown',
});

/** A first guess from counts (untuned; never shown to the student). */
export function levelOf(r: SkillRecord): SkillLevel {
  const slips = Object.values(r.slips).reduce((a, b) => a + b, 0);
  if (r.attempts === 0 && slips === 0 && r.dontKnow === 0) {
    return 'unknown';
  }
  const score = 2 * r.firstTry + r.afterHelp - slips - r.dontKnow;
  if (r.firstTry >= 3 && slips === 0) {
    return 'solid';
  }
  if (score >= 3) {
    return 'ok';
  }
  if (score >= 0) {
    return 'shaky';
  }
  return 'weak';
}

export interface FinishedQuestion {
  state: SessionState;
  outcome: string;
  summary: string;
  nextTime: string;
  now: number;
}

/** Applies a finished (or stopped) question to the profile. Pure. */
/**
 * A warm-up he finished (or skipped) before an exercise: kept whole for the
 * tutor, and counted as engine evidence on each skill (a right answer is a
 * first try, a miss a slip `warmup`, «ما نعرفش» a don't-know). Pure.
 */
export function applyWarmup(
  profile: StudentProfile,
  exerciseId: string,
  answers: readonly WarmupAnswer[],
  now: number,
): StudentProfile {
  const p: StudentProfile = JSON.parse(JSON.stringify(profile));
  p.warmups = {
    ...(p.warmups ?? {}),
    [exerciseId]: { at: now, answers: answers.map(a => ({ ...a })) },
  };
  for (const a of answers) {
    if (a.verdict === 'skipped') {
      continue;
    }
    const r = (p.skills[a.skill] ??= blankSkill());
    r.lastSeenAt = now;
    if (a.verdict === 'right') {
      r.attempts += 1;
      r.firstTry += 1;
    } else if (a.verdict === 'wrong') {
      r.attempts += 1;
      r.slips.warmup = (r.slips.warmup ?? 0) + 1;
    } else {
      r.dontKnow += 1;
    }
    r.level = levelOf(r);
  }
  return p;
}

/** Has he seen this exercise's warm-up (done or skipped)? */
export const warmupSeen = (
  profile: StudentProfile | null,
  exerciseId: string,
): boolean => profile?.warmups?.[exerciseId] !== undefined;

/** Forgets an exercise's warm-up (the exercise started from scratch). */
export function forgetWarmup(
  profile: StudentProfile,
  exerciseId: string,
): StudentProfile {
  if (!profile.warmups?.[exerciseId]) {
    return profile;
  }
  const p: StudentProfile = JSON.parse(JSON.stringify(profile));
  delete p.warmups![exerciseId];
  return p;
}

export function applySession(
  profile: StudentProfile,
  q: FinishedQuestion,
): StudentProfile {
  const p: StudentProfile = JSON.parse(JSON.stringify(profile));
  const s = q.state;
  const skill = (id: string): SkillRecord => {
    const r = (p.skills[id] ??= blankSkill());
    r.lastSeenAt = q.now;
    return r;
  };
  const credited: string[] = [];
  const slips: string[] = [];
  // Per node: was it settled on the first line aimed at it?
  const firstAt = new Map<string, boolean>();
  for (const l of s.lines) {
    const node =
      l.match && 'node' in l.match ? l.match.node : l.expected ?? null;
    const key = `${l.graph ?? '-'}:${node ?? '-'}`;
    if (l.match?.verdict === 'credit' && node) {
      const sk = nodeSkill(node);
      if (sk && !firstAt.has(key)) {
        firstAt.set(key, true);
        const r = skill(sk);
        r.attempts += 1;
        r.firstTry += 1;
      } else if (sk && firstAt.get(key) === false) {
        firstAt.set(key, true);
        const r = skill(sk);
        r.attempts += 1;
        r.afterHelp += 1;
      }
      credited.push(`${l.graph}:${node}`);
      if (l.match.unsimplified) {
        skill('fractions-simplify').slips.unsimplified =
          (skill('fractions-simplify').slips.unsimplified ?? 0) + 1;
      }
    } else if (node && !firstAt.has(key)) {
      firstAt.set(key, false);
    }
    if (l.match?.verdict === 'slip') {
      slips.push(l.match.slip);
      const sk = SLIP_SKILL[l.match.slip];
      if (sk) {
        const r = skill(sk);
        r.slips[l.match.slip] = (r.slips[l.match.slip] ?? 0) + 1;
      }
    }
    if (l.verdict.readback && l.verdict.equal === false) {
      const r = skill('brackets-division');
      r.slips.bracket_left_to_right = (r.slips.bracket_left_to_right ?? 0) + 1;
    }
  }
  // «ما نعرفش» is not tied to one node: it stays in the session summary.
  for (const r of Object.values(p.skills)) {
    r.level = levelOf(r);
  }

  // Observations: earlier ones confirmed by a repeated slip, dropped by clean credits.
  for (const o of p.observations) {
    if (o.status !== 'open') {
      continue;
    }
    if (o.slip && slips.includes(o.slip)) {
      o.status = 'confirmed';
    } else if (o.skill && (p.skills[o.skill]?.firstTry ?? 0) >= 3) {
      o.status = 'dropped';
    }
  }
  const rawOf = (id: string) => s.lines.find(l => l.id === id)?.raw ?? id;
  for (const o of s.observations) {
    p.observations.push({
      id: `${q.now}-${o.id}`,
      at: q.now,
      exerciseId: s.exerciseId,
      questionId: s.questionId,
      kind: o.kind,
      skill: o.skill,
      slip: o.slip,
      note: o.note,
      evidence: o.evidence.map(rawOf),
      confidence: o.confidence,
      status: 'open',
    });
  }
  p.observations = p.observations.slice(-MAX_OBSERVATIONS);
  p.sessions.push({
    exerciseId: s.exerciseId,
    questionId: s.questionId,
    endedAt: q.now,
    outcome: q.outcome,
    studentTurns: s.turn,
    dontKnows: s.dontKnows,
    credited,
    slips,
    summary: q.summary.slice(0, 1500),
    nextTime: q.nextTime.slice(0, 300),
  });
  p.sessions = p.sessions.slice(-MAX_SESSIONS);
  for (const c of s.componentRequests) {
    p.componentRequests.push({
      name: c.name,
      studentDoes: c.studentDoes,
      why: c.why,
    });
  }
  p.componentRequests = p.componentRequests.slice(-100);
  return p;
}
