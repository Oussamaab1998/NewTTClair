/**
 * What the «Formules» screens show and record, kept pure so the screens
 * stay thin (docs/FORMULAS_PLAN.md, stage 4):
 * - the training plans (a rule's «S’entraîner · 6 questions», a theme's);
 * - the list's groups (year and chapter, «Rappel de …» for the year before);
 * - a tap or a judged line turned into a recorded answer;
 * - when a rule comes back, in words.
 */
import type { Year } from '../content/curriculum';
import { rng } from '../engine/expression/equivalence';
import type { Node } from '../engine/expression';
import { kindsFor, type DrillItem, type DrillKind } from './drills/drills';
import { parseLaw } from './law';
import {
  addDays,
  dayStart,
  ruleState,
  type FormulaAnswer,
  type FormulaLog,
  type FormulaState,
} from './log';
import type { FormulaRule } from './schema';
import { tracksFor, type VisibleRule } from './visible';
import type { SectionId } from '../content/curriculum';

export interface PlannedItem {
  ruleId: string;
  kind: DrillKind;
  seed: number;
}

/** A call anywhere in an expression (√, ln…): the lessons' keypad has no key for it. */
function hasCall(node: Node): boolean {
  switch (node.type) {
    case 'call':
      return true;
    case 'unary':
      return hasCall(node.arg);
    case 'binary':
      return hasCall(node.left) || hasCall(node.right);
    default:
      return false;
  }
}

/**
 * «Calcule» needs the answer typed with the lessons' keys (digits, x, e,
 * powers, fractions): not for a rule whose f′ has a root or a ln.
 */
export function typable(rule: FormulaRule): boolean {
  return !hasCall(parseLaw(rule.law.d));
}

export function kindsOnScreen(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
): DrillKind[] {
  return kindsFor(rule, pool).filter(k => k !== 'calc' || typable(rule));
}

export const RULE_SESSION = 6;
export const THEME_SESSION = 8;
/** The order a rule's session tries its drills in: remember, tell apart, use, recognise. */
const RULE_ORDER: readonly DrillKind[] = [
  'complete',
  'true_false',
  'calc',
  'true_false',
  'recognise',
  'calc',
];

/** «S’entraîner · 6 questions» on one rule. */
export function rulePlan(
  rule: FormulaRule,
  pool: readonly FormulaRule[],
  seed: number,
): PlannedItem[] {
  const kinds = kindsOnScreen(rule, pool);
  const order = RULE_ORDER.filter(k => kinds.includes(k));
  const out: DrillKind[] = [...order];
  for (let i = 0; out.length < RULE_SESSION; i++) {
    out.push(kinds[i % kinds.length]!);
  }
  return out.slice(0, RULE_SESSION).map((kind, i) => ({
    ruleId: rule.id,
    kind,
    seed: seed * 31 + i,
  }));
}

/** «S’entraîner» on a theme: the rules not yet Retenue first, one item each. */
export function themePlan(
  visible: readonly VisibleRule[],
  log: FormulaLog,
  now: number,
  seed: number,
): PlannedItem[] {
  const r = rng(seed);
  const pool = visible.map(v => v.rule);
  const rank = (v: VisibleRule) => {
    const s = ruleState(log.entries[v.rule.id], now, v.reminder).status;
    return s === 'en_cours' ? 0 : s === 'nouvelle' ? 1 : 2;
  };
  const ordered = [...visible]
    .map(v => ({ v, rank: rank(v), tie: r() }))
    .sort((a, b) => a.rank - b.rank || a.tie - b.tie)
    .slice(0, THEME_SESSION);
  return ordered.map(({ v }, i) => {
    const kinds = kindsOnScreen(v.rule, pool);
    return {
      ruleId: v.rule.id,
      kind: kinds[Math.floor(r() * kinds.length)]!,
      seed: seed * 37 + i,
    };
  });
}

// The list.

export interface RulePlace {
  year: Year;
  chapter: string;
  reminder: boolean;
  /** The chapter's place in its track (textbook order). */
  order: number;
}

/** Where a rule sits for this student: his track's chapter, or the year before's. */
export function placeOf(
  rule: FormulaRule,
  year: Year,
  section: SectionId | null,
): RulePlace | null {
  const { own, before } = tracksFor(year, section);
  for (const [track, reminder] of [
    [own, false],
    [before, true],
  ] as const) {
    const order = track?.chapters.findIndex(c => rule.chapters.includes(c.id)) ?? -1;
    const chapter = track?.chapters[order];
    if (track && chapter) {
      return { year: track.year, chapter: chapter.title.fr, reminder, order };
    }
  }
  return null;
}

export type ListFilter = 'all' | FormulaState['status'];
export const LIST_FILTERS: readonly ListFilter[] = ['all', 'nouvelle', 'en_cours', 'retenue'];

export interface ListRow {
  rule: FormulaRule;
  state: FormulaState;
}

export interface ListGroup {
  key: string;
  place: RulePlace;
  rows: ListRow[];
}

/** The rules in groups of one chapter, his own year first, in the theme's order. */
export function listGroups(
  visible: readonly VisibleRule[],
  log: FormulaLog,
  now: number,
  year: Year,
  section: SectionId | null,
  filter: ListFilter,
): ListGroup[] {
  const groups = new Map<string, ListGroup>();
  for (const v of visible) {
    const place = placeOf(v.rule, year, section);
    if (!place) {
      continue;
    }
    const state = ruleState(log.entries[v.rule.id], now, v.reminder);
    if (filter !== 'all' && state.status !== filter) {
      continue;
    }
    const key = `${place.reminder ? 1 : 0}|${place.year}|${place.chapter}`;
    const g = groups.get(key) ?? { key, place, rows: [] };
    g.rows.push({ rule: v.rule, state });
    groups.set(key, g);
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.place.reminder) - Number(b.place.reminder) ||
      a.place.order - b.place.order,
  );
}

// Answers.

export type TapChoice =
  | { kind: 'complete'; tile: number }
  | { kind: 'true_false'; saidTrue: boolean }
  | { kind: 'recognise'; ruleId: string };

/** A tap on a tap drill, as the record keeps it. */
export function tapVerdict(
  item: DrillItem,
  choice: TapChoice,
): Pick<FormulaAnswer, 'verdict' | 'trapId'> {
  if (item.kind === 'complete' && choice.kind === 'complete') {
    return { verdict: item.tiles[choice.tile]?.right ? 'right' : 'wrong' };
  }
  if (item.kind === 'true_false' && choice.kind === 'true_false') {
    if (choice.saidTrue === item.isTrue) {
      return { verdict: 'right' };
    }
    // He took a trap for the rule: the trap is what he would write.
    return item.trapId !== null
      ? { verdict: 'trap', trapId: item.trapId }
      : { verdict: 'wrong' };
  }
  if (item.kind === 'recognise' && choice.kind === 'recognise') {
    return { verdict: choice.ruleId === item.ruleId ? 'right' : 'wrong' };
  }
  throw new Error(`a ${choice.kind} tap on a ${item.kind} item`);
}

// When it comes back.

export type DueWords =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'days'; count: number }
  | null;

export function dueWords(state: FormulaState, now: number): DueWords {
  if (state.due === null) {
    return null;
  }
  const today = dayStart(now);
  if (state.due <= today) {
    return { kind: 'today' };
  }
  if (state.due === addDays(today, 1)) {
    return { kind: 'tomorrow' };
  }
  return { kind: 'days', count: Math.round((state.due - today) / 86_400_000) };
}
