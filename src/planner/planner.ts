/**
 * One planner interface for the lesson (docs/PLANNER.md layers). The rules
 * planner answers synchronously; an LLM planner (Phase 4) returns a Promise
 * and is wrapped with the rules planner as its deterministic fallback.
 * Every decision is validated against the content before the lesson uses it:
 * unknown components, deep dives or variants are rejected.
 */
import { resolveSpec } from '../components/registry';
import {
  deepDiveRepresentation,
  stepKey,
  type LoadedExercise,
} from '../content/loader';
import type {
  AskChip,
  ClarifyChoice,
  Exercise,
  Rich,
  Variant,
} from '../content/schema';
import type { Fraction } from '../engine/rational';
import {
  DecisionSchema,
  type Action,
  type Decision,
  type PlannerOutput,
} from './schema';
import type { Situation } from './situation';

export interface Planner {
  readonly id: string;
  decide(situation: Situation): Decision | Promise<Decision>;
}

/** What the planner may choose from: authored content of one exercise. */
export interface PlannerMenu {
  loaded: LoadedExercise;
  variant(id: string): Variant | undefined;
  /** Variants for a step key, of one kind, in authored order. */
  variantsFor(key: string, kind: Variant['kind']): Variant[];
  /** Prerequisite variants that teach this skill. */
  prerequisitesFor(skillId: string): Variant[];
  deepDiveOf(key: string): string | undefined;
  hasDeepDive(id: string): boolean;
  /** "text" or "text+<Component>" (deep dives with an interactive component). */
  deepDiveRepresentation(id: string): string;
  /** Results a question uses ("résultats acquis"). */
  usedResults(questionId: string): Exercise['results'];
  hasCheck(key: string): boolean;
  /** B3: deep dives tagged for an ask_clarify answer, in authored order. */
  deepDivesAddressing(choice: ClarifyChoice): string[];
  /** B3: a question's ask chips tagged for an ask_clarify answer. */
  askChipsFor(questionId: string, choice: ClarifyChoice): AskChip[];
  /** B3: the step's earlier result (`link`), its value from the engine. */
  linkOf(key: string): { text: Rich; value: Fraction } | undefined;
  /** B4: the step has its own guided walk-through. */
  hasWalkthrough(key: string): boolean;
}

export function buildMenu(loaded: LoadedExercise): PlannerMenu {
  const ex = loaded.exercise;
  const variants = new Map(ex.variants.map(v => [v.id, v]));
  const deepDiveOf = new Map<string, string>();
  const checks = new Set<string>();
  const links = new Map<string, { text: Rich; value: Fraction }>();
  const walkthroughs = new Set<string>();
  const addLink = (key: string, s: object) => {
    const link =
      'link' in s
        ? (s as { link?: { resultRef: string; text: Rich } }).link
        : undefined;
    const value = link ? loaded.values.get(link.resultRef) : undefined;
    if (link && value) {
      links.set(key, { text: link.text, value });
    }
    if ('walkthrough' in s && s.walkthrough) {
      walkthroughs.add(key);
    }
  };
  for (const q of ex.parts) {
    for (const g of q.groups) {
      for (const s of g.steps) {
        const key = stepKey.main(q.id, s.id);
        addLink(key, s);
        if ('deepDiveId' in s && s.deepDiveId !== undefined) {
          deepDiveOf.set(key, s.deepDiveId);
        }
        if ('check' in s && s.check) {
          checks.add(key);
        }
      }
    }
  }
  for (const d of ex.deepDives) {
    if (d.mini?.deepDiveId !== undefined) {
      deepDiveOf.set(stepKey.mini(d.id), d.mini.deepDiveId);
    }
    if (d.mini && 'check' in d.mini && d.mini.check) {
      checks.add(stepKey.mini(d.id));
    }
  }
  for (const v of ex.variants) {
    const key = stepKey.variant(v.id);
    addLink(key, v.step);
    if ('deepDiveId' in v.step && v.step.deepDiveId !== undefined) {
      deepDiveOf.set(key, v.step.deepDiveId);
    }
    if ('check' in v.step && v.step.check) {
      checks.add(key);
    }
  }
  const deepDives = new Set(ex.deepDives.map(d => d.id));
  return {
    loaded,
    variant: id => variants.get(id),
    variantsFor: (key, kind) =>
      ex.variants.filter(v => v.kind === kind && v.forSteps.includes(key)),
    prerequisitesFor: skillId =>
      ex.variants.filter(
        v => v.kind === 'prerequisite' && v.step.skills.includes(skillId),
      ),
    deepDiveOf: key => deepDiveOf.get(key),
    hasDeepDive: id => deepDives.has(id),
    deepDiveRepresentation: id => {
      const dive = ex.deepDives.find(d => d.id === id);
      return dive ? deepDiveRepresentation(dive) : 'text';
    },
    usedResults: questionId => {
      const q = ex.parts.find(p => p.id === questionId);
      return ex.results.filter(r => q?.uses.includes(r.id));
    },
    hasCheck: key => checks.has(key),
    deepDivesAddressing: choice =>
      ex.deepDives.filter(d => d.addresses?.includes(choice)).map(d => d.id),
    askChipsFor: (questionId, choice) =>
      (ex.parts.find(p => p.id === questionId)?.askChips ?? []).filter(c =>
        c.addresses?.includes(choice),
      ),
    linkOf: key => links.get(key),
    hasWalkthrough: key => walkthroughs.has(key),
  };
}

export const FALLBACK_RULE = 'fallback.next_authored_step';

/** The deterministic "no rule applies / invalid output" decision. */
export function continueDecision(
  ruleId: string = FALLBACK_RULE,
  source: Decision['source'] = 'fallback',
): Decision {
  return {
    diagnosis: {
      skillIds: [],
      misconceptionIds: [],
      confidence: 0,
      summary: '',
    },
    avoid: [],
    next: { kind: 'continue' },
    ruleId,
    source,
  };
}

/** Why an action cannot be applied with this content, or null when it can. */
export function rejectAction(action: Action, menu: PlannerMenu): string | null {
  switch (action.kind) {
    case 'deep_dive':
      return menu.hasDeepDive(action.deepDiveId)
        ? null
        : `unknown deep dive ${action.deepDiveId}`;
    case 'variant':
      return menu.variant(action.variantId)
        ? null
        : `unknown variant ${action.variantId}`;
    case 'quiz':
      return action.variantId !== undefined && menu.variant(action.variantId)
        ? null
        : 'quiz must reference an authored variant';
    case 'revisit_prerequisite':
      return menu.prerequisitesFor(action.skillId).length > 0
        ? null
        : `no prerequisite content for ${action.skillId}`;
    case 'show_component': {
      const r = resolveSpec(action.component, menu.loaded.exercise.experiment);
      if (!r.ok) {
        return `${action.component.component}: ${r.reason}`;
      }
      return r.entry.kind === 'visual'
        ? null
        : 'only visual components can be shown directly';
    }
    case 'explain':
    case 'example':
      for (const b of action.blocks) {
        if (b.type === 'component') {
          const r = resolveSpec(b.spec, menu.loaded.exercise.experiment);
          if (!r.ok || r.entry.kind !== 'visual') {
            return `block component ${b.spec.component} rejected`;
          }
        }
      }
      return null;
    default:
      return null;
  }
}

/**
 * Validates raw planner output (schema, then content). Invalid -> the
 * deterministic fallback, with the reason in the dev-only summary.
 */
export function validateDecision(
  raw: PlannerOutput | Decision | unknown,
  menu: PlannerMenu,
  source: Decision['source'],
): Decision {
  const candidate =
    raw !== null && typeof raw === 'object'
      ? { ruleId: source === 'llm' ? 'llm' : FALLBACK_RULE, source, ...raw }
      : raw;
  const parsed = DecisionSchema.safeParse(candidate);
  if (!parsed.success) {
    return withReason(continueDecision(), 'invalid planner output');
  }
  const d = parsed.data;
  for (const a of [d.next, ...(d.followUp ? [d.followUp] : [])]) {
    const why = rejectAction(a, menu);
    if (why) {
      return withReason(continueDecision(), why);
    }
  }
  return d;
}

function withReason(d: Decision, reason: string): Decision {
  return { ...d, diagnosis: { ...d.diagnosis, summary: reason.slice(0, 300) } };
}
