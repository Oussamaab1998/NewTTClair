/**
 * Components that show the current step's answer by construction (D16,
 * 2026-10-22): while hints are left, the guard rejects them and the per-step
 * pack names them. Derived from the step's answer, not listed by hand:
 * - the values or the law of X (lawValues, lawSum, a LawBuilder step):
 *   LawChart always; OutcomeSpace coloured by value;
 * - the number of outcomes (outcomeCount): OutcomeSpace with its count;
 * - the count or probability of an event E (count, probability, an
 *   EventPicker step): OutcomeSpace coloured by E or its complement with its
 *   count, or coloured by value when E is about X; ComplementView of E or its
 *   complement (it shows both probabilities).
 * Containers (PredictReveal, CompareTwo) are checked through their inner specs.
 * Also, from the engine (2026-10-22): the values a LawChart or a
 * ComplementView would display (probabilities, and counts out of the total)
 * compared with the answer's values: LawChart shows p(X = 0) = 7/10, the
 * answer of 2.a/s10 and of 1.b/s8.
 */
import { componentMeta, resolveSpec } from '../../components/registry';
import { revealedByRules } from '../../components/reveals';
import type { ComponentSpec } from '../../components/contract';
import { CONTAINER_SLOTS } from '../../components/shared/schemas';
import type { Experiment } from '../../engine/calls';
import {
  enumerateOutcomes,
  law,
  probability,
  type EventSpec,
  type ValueFn,
} from '../../engine/probability';
import { frac, type Fraction } from '../../engine/rational';
import type { LessonContent } from '../../lesson/session/lesson';
import { answerTokensFor, valueKey } from './shown';

interface SpecLike {
  component: string;
  props?: Record<string, unknown>;
}

interface Rule {
  component: string;
  /** For the pack: how the component shows the answer. */
  note: string;
  test: (props: Record<string, unknown>) => boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** E, not(E), or E = not(F) with F the other one. */
function sameOrComplement(a: unknown, b: unknown): boolean {
  const not = (e: unknown) =>
    isObj(e) && e.id === 'not' && isObj(e.args) ? e.args.event : undefined;
  return same(a, b) || same(not(a), b) || same(a, not(b));
}
const counts = (p: Record<string, unknown>) => p.showCount !== false;

function rulesFor(content: LessonContent, key: string): Rule[] {
  const step = content.steps.get(key) as
    | {
        kind: string;
        answer?: { compute?: { fn?: string; args?: Record<string, unknown> } };
        component?: { component: string; props?: Record<string, unknown> };
      }
    | undefined;
  if (!step) {
    return [];
  }
  const fn = step.answer?.compute?.fn;
  const args = step.answer?.compute?.args ?? {};
  const task = step.kind === 'component' ? step.component : undefined;
  const lawChart: Rule = {
    component: 'LawChart',
    note: 'LawChart (it shows the law and its sum)',
    test: () => true,
  };
  const byValue: Rule = {
    component: 'OutcomeSpace',
    note: 'OutcomeSpace with colorBy "value" (it shows every value of X)',
    test: p => p.colorBy === 'value',
  };
  if (fn === 'lawValues' || fn === 'lawSum' || task?.component === 'LawBuilder') {
    return [lawChart, byValue];
  }
  if (fn === 'outcomeCount') {
    return [
      {
        component: 'OutcomeSpace',
        note: 'OutcomeSpace with its count (set showCount false)',
        test: counts,
      },
    ];
  }
  const event =
    fn === 'count' || fn === 'probability'
      ? args.event
      : task?.component === 'EventPicker'
      ? task.props?.event
      : undefined;
  if (event === undefined) {
    return [];
  }
  const rules: Rule[] = [
    {
      component: 'OutcomeSpace',
      note: 'OutcomeSpace coloured by this event or its complement with its count',
      test: p =>
        p.colorBy === 'event' && sameOrComplement(p.event, event) && counts(p),
    },
    {
      component: 'ComplementView',
      note: 'ComplementView of this event or its complement (it shows both probabilities)',
      test: p => sameOrComplement(p.event, event),
    },
  ];
  // An event about X (value_eq): colouring by value shows it too.
  if (isObj(event) && event.id === 'value_eq') {
    rules.push(byValue);
  }
  return rules;
}

function inner(spec: SpecLike): SpecLike[] {
  const slots: readonly string[] =
    CONTAINER_SLOTS[spec.component as keyof typeof CONTAINER_SLOTS] ?? [];
  return slots
    .map(s => spec.props?.[s])
    .filter((x): x is SpecLike => isObj(x) && typeof x.component === 'string');
}

function experimentOf(content: LessonContent, key: string): Experiment | undefined {
  return key.startsWith('var:')
    ? content.variants.get(key.slice(4))?.experiment ??
        content.loaded.exercise.experiment
    : content.loaded.exercise.experiment;
}

/** Values a LawChart / ComplementView puts on screen (probabilities and counts), by the engine. */
function displayedValues(
  content: LessonContent,
  key: string,
  spec: SpecLike,
): Fraction[] {
  if (spec.component !== 'LawChart' && spec.component !== 'ComplementView') {
    return [];
  }
  let r: ReturnType<typeof resolveSpec>;
  try {
    r = resolveSpec(spec as ComponentSpec, experimentOf(content, key));
  } catch {
    return [];
  }
  if (!r.ok) {
    return [];
  }
  const p = r.props as {
    balls?: Parameters<typeof enumerateOutcomes>[0];
    draw?: Parameters<typeof enumerateOutcomes>[1];
    k?: number;
    valueFn?: ValueFn;
    event?: EventSpec;
  };
  if (!p.balls || !p.draw || !p.k) {
    return [];
  }
  const outcomes = enumerateOutcomes(p.balls, p.draw, p.k);
  const n = outcomes.length;
  const probs: Fraction[] = [];
  if (spec.component === 'LawChart' && p.valueFn) {
    probs.push(...law(p.valueFn, outcomes).map(row => row.p));
  }
  if (spec.component === 'ComplementView' && p.event) {
    const pe = probability(
      p.event,
      outcomes,
      p.valueFn ? { valueFn: p.valueFn } : {},
    ).reduced;
    probs.push(pe, frac(pe[1] - pe[0], pe[1]));
  }
  // A probability over n outcomes also shows the count (p × n).
  return probs.flatMap(f => [f, frac(f[0] * n, f[1])]);
}

/** The rule's note when this spec (or one inside it) shows the answer, else null. */
export function revealsAnswer(
  content: LessonContent,
  key: string | null,
  spec: SpecLike,
): string | null {
  if (key === null) {
    return null;
  }
  const rules = rulesFor(content, key);
  const answer = answerTokensFor(content, key).values;
  const check = (s: SpecLike): string | null => {
    const hit = rules.find(
      r => r.component === s.component && r.test(s.props ?? {}),
    );
    if (hit) {
      return hit.note;
    }
    if (displayedValues(content, key, s).some(f => answer.has(valueKey(f)))) {
      return `${s.component} (it displays the answer's value)`;
    }
    // A component that declares what it reveals (probability2, hard rule 9).
    const declared = revealedByRules(
      componentMeta(s.component)?.reveals,
      s.props ?? {},
      experimentOf(content, key),
      f => answer.has(valueKey(f)),
    );
    if (declared) {
      return `${s.component} (${declared.note})`;
    }
    for (const x of inner(s)) {
      const n = check(x);
      if (n) {
        return n;
      }
    }
    return null;
  };
  return check(spec);
}

/** What not to show at this step while hints are left (per-step pack). */
export function revealingNotes(
  content: LessonContent,
  key: string | null,
): string[] {
  return key === null ? [] : rulesFor(content, key).map(r => r.note);
}
