/**
 * Rules planner (docs/PLANNER.md layer 1, docs/TUTOR_BEHAVIOR.md reaction
 * ladder): deterministic, instant, no LLM. Reads a Situation, chooses only
 * from authored content (deep dives, variants, hints, results) and returns a
 * Decision with the id of the rule that fired. Thresholds: src/state/config.ts.
 */
import { stepKey } from '../content/loader';
import { SKILLS, type Skills } from '../content/skills';
import type { ClarifyChoice, Variant } from '../content/schema';
import { fractionToLatex } from '../engine/format';
import type { OutcomeClass } from '../state/outcomes';
import { nextMove, type NextMoveDecision } from './nextMove';
import { THRESHOLDS, type Thresholds } from '../state/config';
import { continueDecision, type Planner, type PlannerMenu } from './planner';
import type { Action, Decision } from './schema';
import type { Situation } from './situation';

export const MAX_DEPTH = 3;

type ClarifyRung =
  | 'alternative'
  | 'deepDive'
  | 'taggedDeepDive'
  | 'askChip'
  | 'link'
  | 'usedResults'
  | 'simplerTwin'
  | 'hint';

/**
 * B3 (Tutor intelligence 1): what each answer to "what is unclear?" leads
 * to, in order. "counting": a counting activity, then a deep dive tagged
 * counting, a twin, a hint. "why": the step's deep dive, the ask chip tagged
 * why, an alternative, a hint. "link": the step's earlier result (engine
 * value), the results the question uses, an alternative, the deep dive, a hint.
 */
export const CLARIFY_LADDER: Record<ClarifyChoice, readonly ClarifyRung[]> = {
  counting: ['alternative', 'taggedDeepDive', 'simplerTwin', 'hint'],
  why: ['deepDive', 'askChip', 'alternative', 'hint'],
  link: ['link', 'usedResults', 'alternative', 'deepDive', 'hint'],
};

/** Every rule id the planner can return (each one has tests in rules.test.ts). */
export const RULES = {
  firstWrong: 'rule.first_wrong',
  firstWrongCheck: 'rule.first_wrong.check',
  firstWrongRepair: 'rule.first_wrong.repair',
  /** D2: after a reveal, a fresh variant on a new urn. */
  afterRevealFresh: 'rule.after_reveal.fresh',
  /** D2: after a reveal, nothing fresh is left (authored, capped, or a fresh one was revealed). */
  afterRevealNone: 'rule.after_reveal.none',
  /** E2: nextMove chose a step back (a prerequisite) after a failed transfer. */
  nextMoveStepBack: 'rule.next_move.step_back',
  /** A diagnosed mistake with no repair: the next hint, else the next detour. */
  firstWrongDiagnosed: 'rule.first_wrong.diagnosed',
  secondWrong: 'rule.second_wrong',
  secondWrongHint: 'rule.second_wrong.hint',
  /** B2: the second failure with a "not sure" in it, nothing tried yet: change the form. */
  secondFailure: 'rule.second_failure',
  struggleClarify: 'rule.struggle_clarify',
  struggleEscalate: 'rule.struggle_escalate',
  notSureDeepDive: 'rule.not_sure.deep_dive',
  notSureHint: 'rule.not_sure.hint',
  notSureLadderEnd: 'rule.not_sure.ladder_end',
  deepDiveMismatch: 'rule.deep_dive_mismatch',
  deepDiveRepeat: 'rule.deep_dive_repeat',
  deepDiveFailed: 'rule.deep_dive_failed',
  correctAfterHelp: 'rule.correct_after_help',
  oddTiming: 'rule.odd_timing',
  /** Lines: the goal written at once, no reasoning shown (product owner, 2026-10-18). */
  jumpedToGoal: 'rule.jumped_to_goal',
  transferAfterHelp: 'rule.transfer_after_help',
  transferAfterSelfReport: 'rule.transfer_after_self_report',
  selfReportDismissed: 'rule.self_report_dismissed',
  cleanStreak: 'rule.clean_streak',
  changeMethod: 'rule.change_method',
  simpler: 'rule.simpler',
  /** A help request with nothing left (cap or no target): the lesson goes on; the reason line points to the hint or reveal. */
  requestNone: 'rule.request.none',
  clarifyCounting: 'rule.clarify.counting',
  clarifyWhy: 'rule.clarify.why',
  clarifyLink: 'rule.clarify.link',
  exampleLoop: 'rule.example_loop',
  exampleLoopEnd: 'rule.example_loop.end',
  detourDone: 'rule.detour_done',
  nextStep: 'rule.next_step',
  /** Lines: an unreadable / unchecked line. Nothing changes (the editor already says what is wrong). */
  lineInvalid: 'rule.line_invalid.continue',
} as const;
export type RuleId = (typeof RULES)[keyof typeof RULES];

const CLARIFY_RULE: Record<ClarifyChoice, RuleId> = {
  counting: RULES.clarifyCounting,
  why: RULES.clarifyWhy,
  link: RULES.clarifyLink,
};

interface Pick {
  action: Action;
  representation: string;
}

/** Whether "change method" / "easier" would get an authored answer now. */
export interface HelpTargets {
  changeMethod: boolean;
  simpler: boolean;
}

export interface RulesPlanner extends Planner {
  decideSync(situation: Situation): Decision;
  /** The help buttons are shown only when this is true for them. */
  helpTargets(situation: Situation): HelpTargets;
}

export function createRulesPlanner(
  menu: PlannerMenu,
  opts: { thresholds?: Thresholds; skills?: Skills } = {},
): RulesPlanner {
  const th = opts.thresholds ?? THRESHOLDS;
  const skills = opts.skills ?? SKILLS;
  const r = new Rules(menu, th, skills);
  const decideSync = (s: Situation) => r.decide(s);
  return {
    id: 'rules',
    decide: decideSync,
    decideSync,
    helpTargets: s => r.helpTargets(s),
  };
}

class Rules {
  constructor(
    private readonly menu: PlannerMenu,
    private readonly th: Thresholds,
    private readonly skills: Skills,
  ) {}

  decide(s: Situation): Decision {
    switch (s.trigger) {
      case 'wrong':
        return this.onWrong(s);
      case 'not_sure':
        return this.onNotSure(s);
      case 'detour_closed':
        return this.onDetourClosed(s);
      case 'revealed':
        return this.afterReveal(s);
      case 'correct':
        return this.onCorrect(s);
      case 'self_report':
        // "Not now": no transfer this time; a later correct-after-help may offer one.
        if (s.selfReports[s.selfReports.length - 1]?.value === 'dismissed') {
          return this.decision(s, RULES.selfReportDismissed, {
            kind: 'continue',
          });
        }
        return this.afterAttempt(s, RULES.transferAfterSelfReport);
      case 'request':
        return this.onRequest(s);
      case 'clarify':
        return this.onClarify(s, s.clarify[s.clarify.length - 1] ?? 'why');
      case 'line_invalid':
        return this.decision(s, RULES.lineInvalid, { kind: 'continue' });
      default:
        return this.next(s);
    }
  }

  // --- building blocks --------------------------------------------------------

  /**
   * The step's own key, then its parent steps (B1, Tutor intelligence 1): a
   * variant step that uses the exercise's urn (no experiment of its own)
   * looks up alternatives, twins and the deep dive of the steps it is for.
   * A variant with its own urn inherits nothing (the parent's would show
   * the wrong numbers).
   */
  private keysFor(s: Situation): string[] {
    const key = s.step.key;
    if (!key.startsWith('var:')) {
      return [key];
    }
    const v = this.menu.variant(key.slice(4));
    return v && v.experiment === undefined ? [key, ...v.forSteps] : [key];
  }

  private variantsFor(s: Situation, kind: Variant['kind']): Variant[] {
    const out: Variant[] = [];
    for (const v of this.keysFor(s).flatMap(k =>
      this.menu.variantsFor(k, kind),
    )) {
      if (!out.some(x => x.id === v.id)) {
        out.push(v);
      }
    }
    return out;
  }

  private deepDiveOf(s: Situation): string | undefined {
    for (const k of this.keysFor(s)) {
      const id = this.menu.deepDiveOf(k);
      if (id !== undefined) {
        return id;
      }
    }
    return undefined;
  }

  private decision(
    s: Situation,
    ruleId: RuleId,
    next: Action,
    extra: { followUp?: Action; representation?: string } = {},
  ): Decision {
    return {
      diagnosis: {
        skillIds: s.step.skills,
        misconceptionIds: [
          ...new Set(
            s.step.wrongValues
              .map(w => w.misconceptionId)
              .filter((m): m is string => m !== undefined),
          ),
        ],
        confidence: 0.5,
        summary: ruleId,
      },
      avoid: s.representationsTried,
      next,
      ...(extra.followUp && { followUp: extra.followUp }),
      ruleId,
      source: 'rules',
      ...(extra.representation !== undefined && {
        representation: extra.representation,
      }),
    };
  }

  private pickDecision(s: Situation, ruleId: RuleId, p: Pick): Decision {
    return this.decision(s, ruleId, p.action, {
      representation: p.representation,
    });
  }

  /** No rule applies: the next authored step (or the card stays as it is). */
  private next(s: Situation): Decision {
    return {
      ...continueDecision(RULES.nextStep, 'rules'),
      avoid: s.representationsTried,
    };
  }

  private hint(s: Situation): Pick | null {
    return s.step.hintsUsed < s.step.hintCount
      ? {
          action: {
            kind: 'hint',
            level: Math.min(3, s.step.hintsUsed + 1) as 1 | 2 | 3,
          },
          representation: 'hint',
        }
      : null;
  }

  /**
   * Nesting depth below the cap, and fewer than maxDetoursPerStep detours
   * on this step (any visit in the session; transfers not counted).
   */
  private canNest(s: Situation): boolean {
    const detours = s.detours.filter(d => d.variantKind !== 'transfer').length;
    return s.depth < MAX_DEPTH && detours < this.th.maxDetoursPerStep;
  }

  /** The step's own deep dive, if it was not shown yet in this question. */
  private deepDive(s: Situation): Pick | null {
    const id = this.deepDiveOf(s);
    if (
      id === undefined ||
      !this.canNest(s) ||
      s.question.deepDivesShown.includes(id)
    ) {
      return null;
    }
    return {
      action: { kind: 'deep_dive', deepDiveId: id },
      representation: this.menu.deepDiveRepresentation(id),
    };
  }

  private variantPick(v: Variant, offer = false): Pick {
    return {
      action: { kind: 'variant', variantId: v.id, ...(offer && { offer }) },
      representation: v.representation,
    };
  }

  private unshown(vs: Variant[], s: Situation): Variant[] {
    return vs.filter(
      v =>
        !s.question.variantsShown.includes(v.id) &&
        !s.declinedOffers.includes(v.id),
    );
  }

  /**
   * A different representation for this step: untried first (for its skills),
   * then any not yet shown in this question. Never the same deep dive twice.
   */
  private change(
    s: Situation,
    opts: {
      includeDeepDive: boolean;
      addresses?: ClarifyChoice;
      /** Prefer alternatives that train this skill (deep dive targets another gap). */
      preferSkill?: string;
    },
  ): Pick | null {
    if (!this.canNest(s)) {
      return null;
    }
    const tried = new Set(s.representationsTried);
    const alts = this.unshown(this.variantsFor(s, 'alternative'), s).filter(
      v =>
        opts.addresses === undefined || v.addresses?.includes(opts.addresses),
    );
    const candidates: Pick[] = [];
    const dd = opts.includeDeepDive ? this.deepDive(s) : null;
    if (dd && (opts.addresses === undefined || opts.addresses === 'why')) {
      candidates.push(dd);
    }
    candidates.push(...alts.map(v => this.variantPick(v)));
    const skillOf = (p: Pick) =>
      p.action.kind === 'variant'
        ? this.menu.variant(p.action.variantId)?.step.skills ?? []
        : [];
    if (opts.preferSkill !== undefined) {
      const preferred = candidates.find(
        p =>
          skillOf(p).includes(opts.preferSkill!) &&
          !tried.has(p.representation),
      );
      if (preferred) {
        return preferred;
      }
    }
    return (
      candidates.find(p => !tried.has(p.representation)) ??
      candidates[0] ??
      null
    );
  }

  private lastMisconceptionSkill(s: Situation): string | undefined {
    const m = [...s.step.wrongValues]
      .reverse()
      .find(w => w.misconceptionId !== undefined)?.misconceptionId;
    return m === undefined
      ? undefined
      : this.menu.loaded.misconceptions.get(m)?.skillId;
  }

  /** The deep dive teaches a different skill than the student's last misconception. */
  private deepDiveMisses(s: Situation, deepDiveId: string): string | undefined {
    const skill = this.lastMisconceptionSkill(s);
    if (skill === undefined) {
      return undefined;
    }
    const dive = this.menu.loaded.exercise.deepDives.find(
      d => d.id === deepDiveId,
    );
    const taught = dive?.mini?.skills ?? [];
    return taught.includes(skill) ? undefined : skill;
  }

  /**
   * B4 (2026-10-22): a stuck student gets the step's own guided walk-through
   * (once per step), else the next hint, else the lesson goes on; the note
   * for the teacher is queued silently alongside, once (it was a card).
   * null when there is nothing to do and the note was already queued.
   */
  private stuckHelp(s: Situation, ruleId: RuleId): Decision | null {
    const note = !s.decisions.some(d => d.kind === 'teacher_note');
    const walk =
      this.menu.hasWalkthrough(s.step.key) &&
      !s.decisions.some(d => d.kind === 'walkthrough');
    const next: Pick | null = walk
      ? { action: { kind: 'walkthrough' }, representation: 'walkthrough' }
      : this.hint(s);
    if (!next && !note) {
      return null;
    }
    return this.decision(s, ruleId, next?.action ?? { kind: 'continue' }, {
      ...(note && { followUp: { kind: 'teacher_note' } }),
      ...(next && { representation: next.representation }),
    });
  }

  /** Next round of the mini-example loop: simpler twins, in round order, max 3. */
  private simplerTwin(s: Situation): Pick | null {
    if (!this.canNest(s)) {
      return null;
    }
    const played = s.question.exampleRounds.length;
    if (played >= this.th.maxExampleRounds) {
      return null;
    }
    const lastRound = Math.max(
      0,
      ...s.question.exampleRounds.map(r => r.round),
    );
    const v = this.unshown(this.variantsFor(s, 'simpler'), s)
      .filter(x => (x.round ?? 0) > lastRound)
      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0))[0];
    return v ? this.variantPick(v) : null;
  }

  /**
   * One prerequisite level below the current step's skills (capped). At the
   * detour cap, one step-back is still allowed (product owner, 2026-10-22):
   * once per step (4 detours at most), and not to a prerequisite skill that
   * already had a step-back in this session.
   */
  private prerequisite(s: Situation): Pick | null {
    if (
      s.depth >= MAX_DEPTH ||
      s.question.prerequisiteLevel >= this.th.maxPrerequisiteLevels
    ) {
      return null;
    }
    const counted = s.detours.filter(d => d.variantKind !== 'transfer');
    const atCap = counted.length >= this.th.maxDetoursPerStep;
    if (
      atCap &&
      (counted.length > this.th.maxDetoursPerStep ||
        counted.some(d => d.variantKind === 'prerequisite'))
    ) {
      return null;
    }
    for (const skill of s.step.skills) {
      for (const pre of this.skills.prerequisites(skill)) {
        const all = this.menu.prerequisitesFor(pre);
        if (atCap && all.some(v => s.question.variantsShown.includes(v.id))) {
          continue;
        }
        const v = this.unshown(all, s)[0];
        if (v) {
          return this.variantPick(v);
        }
      }
    }
    return null;
  }

  private transfer(s: Situation, ruleId: RuleId): Decision | null {
    const v = this.transferCandidate(s);
    return v ? this.pickDecision(s, ruleId, this.variantPick(v)) : null;
  }

  /** The next transfer for a main step (fresh variants are kept for after a reveal, D2). */
  private transferCandidate(s: Situation): Variant | null {
    if (s.step.scope !== 'main') {
      return null;
    }
    return (
      this.unshown(
        this.menu
          .variantsFor(s.step.key, 'transfer')
          .filter(x => !x.afterReveal),
        s,
      ).find(x => !s.question.transfersDone.includes(x.id)) ?? null
    );
  }

  /** E1: the class of the attempt just finished on a main step (from the situation). */
  private attemptClass(s: Situation): OutcomeClass {
    if (
      s.selfReports.some(r => r.stepKey === s.step.key && r.value === 'guessed')
    ) {
      return 'guessed';
    }
    return s.detours.length > 0
      ? 'after_detour'
      : s.step.hintsUsed > 0
      ? 'after_hint'
      : s.step.wrong > 0 || s.step.notSure > 0
      ? 'after_retry'
      : 'first_try';
  }

  /**
   * E2 (2026-10-22): the move after an attempt, from this session's record
   * (outcomes, moves made) and the caps in config.
   */
  private moveFor(
    s: Situation,
    outcome: OutcomeClass,
    o: {
      repeat: boolean;
      stepBack: boolean;
      transfer?: boolean;
      revealedWasFresh?: boolean;
      freshCapped?: boolean;
    },
  ): NextMoveDecision {
    const repeat: Record<string, number> = {};
    const stepBack: Record<string, number> = {};
    const moves = s.session.moves ?? [];
    for (const m of moves) {
      const into = m.move === 'repeat' ? repeat : stepBack;
      for (const k of m.skills) {
        into[k] = (into[k] ?? 0) + 1;
      }
    }
    const sessionOutcomes: Record<string, OutcomeClass[]> = {};
    const transferFailures: Record<string, number> = {};
    for (const a of s.session.outcomes ?? []) {
      if (a.stepKey === s.step.key) {
        continue; // the attempt being decided
      }
      for (const k of a.skills) {
        (sessionOutcomes[k] ??= []).push(a.outcome);
        if (
          a.stepKey.startsWith('var:') &&
          (a.outcome === 'transfer_fail' || a.outcome === 'revealed')
        ) {
          transferFailures[k] = (transferFailures[k] ?? 0) + 1;
        }
      }
    }
    return nextMove(
      {
        outcome,
        skills: s.step.skills,
        skillShaky: s.step.skills.some(k =>
          ['shaky', 'gap'].includes(s.skills[k]?.status ?? ''),
        ),
        sessionOutcomes,
        transferFailures,
        moves: {
          repeat,
          stepBack,
          question: moves.filter(m => m.questionId === s.questionId).length,
        },
        available: { repeat: o.repeat, stepBack: o.stepBack },
        ...(o.transfer && { transfer: true }),
        ...(s.step.last?.jumped === true && { jumped: true }),
        ...(o.revealedWasFresh && { revealedWasFresh: true }),
        ...(o.freshCapped && { freshCapped: true }),
      },
      this.th,
    );
  }

  private withMove(d: Decision, nm: NextMoveDecision): Decision {
    return {
      ...d,
      nextMove: {
        outcome: nm.outcome,
        wanted: nm.wanted,
        move: nm.move,
        ...(nm.stoppedBy && { stoppedBy: nm.stoppedBy }),
      },
    };
  }

  /**
   * D2 (2026-10-22): after a reveal, a fresh variant on a new urn (flagged
   * `afterReveal`, else a transfer with its own urn) for the step or its
   * parents, opened directly. At most one per reveal (a revealed fresh
   * variant opens none) and THRESHOLDS.freshAfterRevealPerSkillPerSession per
   * skill; else the lesson moves on.
   */
  private afterReveal(s: Situation, revealedWasFresh = false): Decision {
    const none = () =>
      this.decision(s, RULES.afterRevealNone, { kind: 'continue' });
    const transfer = s.step.key.startsWith('var:');
    if (revealedWasFresh) {
      return this.withMove(
        none(),
        this.moveFor(s, 'revealed', {
          repeat: false,
          stepBack: false,
          transfer,
          revealedWasFresh: true,
        }),
      );
    }
    const used = new Map<string, number>();
    for (const id of s.session.freshAfterReveal ?? []) {
      for (const skill of this.menu.variant(id)?.step.skills ?? []) {
        used.set(skill, (used.get(skill) ?? 0) + 1);
      }
    }
    const capped = (v: Variant) =>
      v.step.skills.some(
        k => (used.get(k) ?? 0) >= this.th.freshAfterRevealPerSkillPerSession,
      );
    const all = this.variantsFor(s, 'transfer').filter(
      v => v.experiment !== undefined,
    );
    const unshown = this.unshown(
      [...all.filter(x => x.afterReveal), ...all.filter(x => !x.afterReveal)],
      s,
    );
    const v = unshown.find(x => !capped(x));
    const back = transfer ? this.prerequisite(s) : null;
    const nm = this.moveFor(s, 'revealed', {
      repeat: unshown.length > 0,
      stepBack: back !== null,
      transfer,
      freshCapped: unshown.length > 0 && v === undefined,
    });
    if (nm.move === 'repeat' && v) {
      return this.withMove(
        this.pickDecision(s, RULES.afterRevealFresh, this.variantPick(v)),
        nm,
      );
    }
    if (nm.move === 'step_back' && back) {
      return this.withMove(
        this.pickDecision(s, RULES.nextMoveStepBack, back),
        nm,
      );
    }
    return this.withMove(none(), nm);
  }

  private clarifyAsked(s: Situation): boolean {
    return (
      s.clarify.length > 0 || s.decisions.some(d => d.kind === 'ask_clarify')
    );
  }

  private askClarify(s: Situation): Decision {
    return this.decision(
      s,
      RULES.struggleClarify,
      {
        kind: 'ask_clarify',
        // Labels come from i18n (lesson.clarify.*); the ids route the answer.
        options: [{ fr: 'counting' }, { fr: 'why' }, { fr: 'link' }],
        choices: ['counting', 'why', 'link'],
      },
      { representation: 'ask_clarify' },
    );
  }

  /** After ask_clarify: a simpler twin, then a prerequisite, then a note for the teacher. */
  private escalate(s: Situation): Decision {
    const p = this.simplerTwin(s) ?? this.prerequisite(s);
    if (p) {
      return this.pickDecision(s, RULES.struggleEscalate, p);
    }
    return this.stuckHelp(s, RULES.struggleEscalate) ?? this.next(s);
  }

  private withHint(s: Situation, ruleId: RuleId): Decision | null {
    const h = this.hint(s);
    return h ? this.pickDecision(s, ruleId, h) : null;
  }

  private struggle(s: Situation): Decision | null {
    const over =
      s.step.struggle >= this.th.clarifyAfterStruggle ||
      s.step.notSure >= this.th.clarifyAfterNotSure;
    if (!over) {
      return null;
    }
    return this.clarifyAsked(s) ? this.escalate(s) : this.askClarify(s);
  }

  // --- triggers ----------------------------------------------------------------

  /**
   * B2 (Tutor intelligence 1): the second failure on a step (wrong answers
   * and "not sure" together) changes the representation before asking what
   * is unclear, when nothing was tried on this step yet. Two wrong answers
   * keep their own rule (second_wrong), which already does this.
   */
  private secondFailure(s: Situation): Decision | null {
    // A "not sure" or a help tap in it (both count in struggle); two wrong
    // answers have their own rule.
    if (s.step.struggle !== 2 || s.step.struggle === s.step.wrong) {
      return null;
    }
    const tried =
      s.detours.length > 0 ||
      s.decisions.some(d => d.kind === 'deep_dive' || d.kind === 'variant');
    if (tried) {
      return null;
    }
    const dd = this.deepDiveOf(s);
    const miss = dd !== undefined ? this.deepDiveMisses(s, dd) : undefined;
    const p = this.change(s, {
      includeDeepDive: true,
      ...(miss !== undefined && { preferSkill: miss }),
    });
    return p ? this.pickDecision(s, RULES.secondFailure, p) : null;
  }

  private onWrong(s: Situation): Decision {
    const second = this.secondFailure(s);
    if (second) {
      return second;
    }
    const struggling = this.struggle(s);
    if (struggling) {
      return struggling;
    }
    if (s.step.wrong <= 1) {
      return this.firstWrong(s);
    }
    // Second wrong: change representation and require an action.
    const dd = this.deepDiveOf(s);
    const miss = dd !== undefined ? this.deepDiveMisses(s, dd) : undefined;
    const p = this.change(s, {
      includeDeepDive: true,
      ...(miss !== undefined && { preferSkill: miss }),
    });
    if (p) {
      return this.pickDecision(s, RULES.secondWrong, p);
    }
    return (
      this.withHint(s, RULES.secondWrongHint) ??
      this.stuckHelp(s, RULES.secondWrongHint) ??
      this.next(s)
    );
  }

  private firstWrong(s: Situation): Decision {
    const last = s.step.wrongValues[s.step.wrongValues.length - 1];
    const check =
      this.menu.hasCheck(s.step.key) &&
      last?.value !== null &&
      last?.value !== undefined;
    const repair = this.repairFor(s, last?.misconceptionId);
    if (repair) {
      // Optional for the student: offered, the ladder still applies.
      return this.decision(
        s,
        RULES.firstWrongRepair,
        check ? { kind: 'numeric_check' } : repair.action,
        {
          ...(check && { followUp: repair.action }),
          representation: repair.representation,
        },
      );
    }
    if (check) {
      return this.decision(
        s,
        RULES.firstWrongCheck,
        { kind: 'numeric_check' },
        {
          representation: 'numeric_check',
        },
      );
    }
    // Round 1 "dead ends" (2026-10-22): a diagnosed mistake never ends with
    // nothing new. Its line is on screen; with no repair, the next hint, else
    // the next detour (within the cap).
    if (last?.misconceptionId !== undefined) {
      const p =
        this.hint(s) ??
        this.change(s, { includeDeepDive: true }) ??
        this.simplerTwin(s) ??
        this.prerequisite(s);
      if (p) {
        return this.pickDecision(s, RULES.firstWrongDiagnosed, p);
      }
    }
    // Undiagnosed: the generic "wrong" line is on screen; the student tries again.
    return this.decision(s, RULES.firstWrong, { kind: 'continue' });
  }

  /** An authored alternative using the misconception's repair component. */
  private repairFor(
    s: Situation,
    misconceptionId: string | undefined,
  ): Pick | null {
    if (misconceptionId === undefined || !this.canNest(s)) {
      return null;
    }
    const component =
      this.menu.loaded.misconceptions.get(misconceptionId)?.repairComponent;
    if (component === undefined) {
      return null;
    }
    const v = this.unshown(this.variantsFor(s, 'alternative'), s).find(
      x => x.representation === component,
    );
    return v ? this.variantPick(v, true) : null;
  }

  private onNotSure(s: Situation): Decision {
    const second = this.secondFailure(s);
    if (second) {
      return second;
    }
    const struggling = this.struggle(s);
    if (struggling) {
      return struggling;
    }
    const id = this.deepDiveOf(s);
    const dd = this.deepDive(s);
    if (dd && id !== undefined) {
      const miss = this.deepDiveMisses(s, id);
      if (miss !== undefined) {
        const p = this.change(s, { includeDeepDive: false, preferSkill: miss });
        if (p) {
          return this.pickDecision(s, RULES.deepDiveMismatch, p);
        }
      }
      return this.pickDecision(s, RULES.notSureDeepDive, dd);
    }
    if (id !== undefined && s.question.deepDivesShown.includes(id)) {
      // The same deep dive asked for again: it did not work in that form.
      const p = this.change(s, { includeDeepDive: false });
      if (p) {
        return this.pickDecision(s, RULES.deepDiveRepeat, p);
      }
    }
    return (
      this.withHint(s, RULES.notSureHint) ??
      this.decision(s, RULES.notSureLadderEnd, { kind: 'continue' })
    );
  }

  private onDetourClosed(s: Situation): Decision {
    const d = s.detours[s.detours.length - 1];
    if (!d) {
      return this.next(s);
    }
    // D2: the step's own transfer was revealed (a fresh one included): a
    // reveal too. Its own detour, not the last opened from it.
    const own = s.detours.find(
      x => x.kind === 'variant' && stepKey.variant(x.id) === s.step.key,
    );
    if (own?.variantKind === 'transfer' && own.outcome === 'revealed') {
      return this.afterReveal(s, own.ruleId === RULES.afterRevealFresh);
    }
    // E2: the step's own transfer answered: right at once (transfer_ok), or
    // only after a wrong answer (transfer_fail: a step back, capped).
    if (
      own?.variantKind === 'transfer' &&
      (own.outcome === 'correct' || own.outcome === 'wrong')
    ) {
      const back = own.outcome === 'wrong' ? this.prerequisite(s) : null;
      const nm = this.moveFor(
        s,
        own.outcome === 'correct' ? 'transfer_ok' : 'transfer_fail',
        { repeat: false, stepBack: back !== null, transfer: true },
      );
      return nm.move === 'step_back' && back
        ? this.withMove(this.pickDecision(s, RULES.nextMoveStepBack, back), nm)
        : this.withMove(
            this.decision(s, RULES.detourDone, { kind: 'continue' }),
            nm,
          );
    }
    if (d.kind === 'deep_dive') {
      // Abandoned ("back"): respect the student's choice and re-ask the question.
      // `helped` when logged (task minis allow one wrong try), else the first-try result.
      if ((d.helped ?? d.miniCorrect) === true || d.outcome === 'abandoned') {
        return this.decision(s, RULES.detourDone, { kind: 'continue' });
      }
      // Mini answered wrong first: the deep dive did not help.
      const p = this.change(s, { includeDeepDive: false });
      return p
        ? this.pickDecision(s, RULES.deepDiveFailed, p)
        : this.decision(s, RULES.detourDone, { kind: 'continue' });
    }
    if (d.variantKind === 'simpler' && d.outcome !== 'correct') {
      const twin = this.simplerTwin(s);
      if (twin) {
        return this.pickDecision(s, RULES.exampleLoop, twin);
      }
      const pre = this.prerequisite(s);
      if (pre) {
        return this.pickDecision(s, RULES.exampleLoopEnd, pre);
      }
      return (
        this.stuckHelp(s, RULES.exampleLoopEnd) ??
        this.decision(s, RULES.detourDone, { kind: 'continue' })
      );
    }
    return this.decision(s, RULES.detourDone, { kind: 'continue' });
  }

  private onCorrect(s: Situation): Decision {
    const helped =
      s.step.wrong > 0 ||
      s.step.notSure > 0 ||
      s.step.hintsUsed > 0 ||
      s.detours.length > 0;
    const last = s.step.last;
    const odd =
      !helped &&
      last?.attempt === 1 &&
      last.durationMs !== undefined &&
      (last.durationMs < this.th.fastAnswerMs ||
        last.durationMs > this.th.slowAnswerMs);
    const canAsk =
      s.question.selfReportsAsked < this.th.selfReportsPerQuestion &&
      s.session.selfReportsAsked < this.th.selfReportsPerSession;
    const jumped = !helped && last?.jumped === true;
    if ((helped || odd || jumped) && canAsk) {
      return this.decision(
        s,
        helped
          ? RULES.correctAfterHelp
          : jumped
          ? RULES.jumpedToGoal
          : RULES.oddTiming,
        { kind: 'self_report' },
        { representation: 'self_report' },
      );
    }
    if (jumped) {
      const t = this.transfer(s, RULES.jumpedToGoal);
      if (t) {
        return t;
      }
    }
    return this.afterAttempt(s, RULES.transferAfterHelp);
  }

  /**
   * E2: after a finished main-step attempt (a correct answer, or the
   * self-report that followed it): repeat with the step's transfer, or move
   * on (with the clean-streak compress offer as before).
   */
  private afterAttempt(s: Situation, repeatRule: RuleId): Decision {
    const t = this.transferCandidate(s);
    const nm = this.moveFor(s, this.attemptClass(s), {
      repeat: t !== null,
      stepBack: false,
    });
    if (nm.move === 'repeat' && t) {
      return this.withMove(
        this.pickDecision(s, repeatRule, this.variantPick(t)),
        nm,
      );
    }
    // Three clean taps can be luck: also need a typed / acted answer, or "understood".
    const strong =
      s.question.cleanStreakActed ||
      s.selfReports.some(r => r.value === 'understood');
    if (
      s.question.cleanStreak >= this.th.cleanStreakForCompress &&
      strong &&
      !s.question.compressOffered &&
      !s.question.compressed
    ) {
      return this.withMove(
        this.decision(s, RULES.cleanStreak, { kind: 'compress_steps' }),
        nm,
      );
    }
    return this.withMove(this.next(s), nm);
  }

  helpTargets(s: Situation): HelpTargets {
    return {
      changeMethod: this.change(s, { includeDeepDive: true }) !== null,
      simpler: (this.prerequisite(s) ?? this.simplerTwin(s)) !== null,
    };
  }

  private onRequest(s: Situation): Decision {
    const last = [...s.requests].reverse().find(r => r.kind !== 'ask');
    if (last?.kind === 'simpler') {
      const p = this.prerequisite(s) ?? this.simplerTwin(s);
      if (p) {
        return this.pickDecision(s, RULES.simpler, p);
      }
      return this.requestNone(s);
    }
    // "Change method": another representation, never a hint.
    const p = this.change(s, { includeDeepDive: true });
    if (p) {
      return this.pickDecision(s, RULES.changeMethod, p);
    }
    return this.requestNone(s);
  }

  /**
   * Nothing left for a help request (the detour cap, or no authored
   * target): never a dead end. The lesson goes on; its reason line points
   * to the next hint, or to "show the answer" once the ladder is used up.
   */
  private requestNone(s: Situation): Decision {
    return this.decision(s, RULES.requestNone, { kind: 'continue' });
  }

  /**
   * B3: each answer to "what is unclear?" walks its own list of actions
   * (CLARIFY_LADDER) and takes the first one available.
   */
  private onClarify(s: Situation, choice: ClarifyChoice): Decision {
    const ruleId = CLARIFY_RULE[choice];
    for (const rung of CLARIFY_LADDER[choice]) {
      const p = this.clarifyRung(s, choice, rung);
      if (p) {
        return this.pickDecision(s, ruleId, p);
      }
    }
    return this.next(s);
  }

  private clarifyRung(
    s: Situation,
    choice: ClarifyChoice,
    rung: ClarifyRung,
  ): Pick | null {
    const once = (representation: string) =>
      !s.decisions.some(d => d.representation === representation);
    switch (rung) {
      case 'alternative':
        return this.change(s, { includeDeepDive: false, addresses: choice });
      case 'deepDive':
        return this.deepDive(s);
      case 'taggedDeepDive': {
        if (!this.canNest(s)) {
          return null;
        }
        const own = this.deepDiveOf(s);
        const id = [...this.menu.deepDivesAddressing(choice)]
          .sort((x, y) => Number(y === own) - Number(x === own))
          .find(x => !s.question.deepDivesShown.includes(x));
        return id === undefined
          ? null
          : {
              action: { kind: 'deep_dive', deepDiveId: id },
              representation: this.menu.deepDiveRepresentation(id),
            };
      }
      case 'askChip': {
        const chip = this.menu
          .askChipsFor(s.questionId, choice)
          .find(c => once(`ask_chip:${c.id}`));
        return chip
          ? {
              action: {
                kind: 'explain',
                blocks: chip.answer.map(text => ({
                  type: 'tutor_text' as const,
                  text,
                })),
              },
              representation: `ask_chip:${chip.id}`,
            }
          : null;
      }
      case 'link': {
        const link = this.keysFor(s)
          .map(k => this.menu.linkOf(k))
          .find(l => l !== undefined);
        return link && once('link')
          ? {
              action: {
                kind: 'explain',
                blocks: [
                  {
                    type: 'tutor_text',
                    text: { ...link.text, math: fractionToLatex(link.value) },
                  },
                ],
              },
              representation: 'link',
            }
          : null;
      }
      case 'usedResults': {
        const results = this.menu.usedResults(s.questionId);
        return results.length > 0 && once('previous_result')
          ? {
              action: {
                kind: 'explain',
                blocks: results.map(r => ({
                  type: 'tutor_text' as const,
                  text: r.statement,
                })),
              },
              representation: 'previous_result',
            }
          : null;
      }
      case 'simplerTwin':
        return this.simplerTwin(s);
      case 'hint':
        return this.hint(s);
    }
  }
}
