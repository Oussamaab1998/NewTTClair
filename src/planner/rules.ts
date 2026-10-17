/**
 * Rules planner (docs/PLANNER.md layer 1, docs/TUTOR_BEHAVIOR.md reaction
 * ladder): deterministic, instant, no LLM. Reads a Situation, chooses only
 * from authored content (deep dives, variants, hints, results) and returns a
 * Decision with the id of the rule that fired. Thresholds: src/state/config.ts.
 */
import { SKILLS, type Skills } from '../content/skills';
import type { ClarifyChoice, Variant } from '../content/schema';
import { THRESHOLDS, type Thresholds } from '../state/config';
import { continueDecision, type Planner, type PlannerMenu } from './planner';
import type { Action, Decision } from './schema';
import type { Situation } from './situation';

export const MAX_DEPTH = 3;

/** Every rule id the planner can return (each one has tests in rules.test.ts). */
export const RULES = {
  firstWrong: 'rule.first_wrong',
  firstWrongCheck: 'rule.first_wrong.check',
  firstWrongRepair: 'rule.first_wrong.repair',
  secondWrong: 'rule.second_wrong',
  secondWrongHint: 'rule.second_wrong.hint',
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
  transferAfterHelp: 'rule.transfer_after_help',
  transferAfterSelfReport: 'rule.transfer_after_self_report',
  selfReportDismissed: 'rule.self_report_dismissed',
  cleanStreak: 'rule.clean_streak',
  changeMethod: 'rule.change_method',
  simpler: 'rule.simpler',
  clarifyCounting: 'rule.clarify.counting',
  clarifyWhy: 'rule.clarify.why',
  clarifyLink: 'rule.clarify.link',
  exampleLoop: 'rule.example_loop',
  exampleLoopEnd: 'rule.example_loop.end',
  detourDone: 'rule.detour_done',
  nextStep: 'rule.next_step',
} as const;
export type RuleId = (typeof RULES)[keyof typeof RULES];

interface Pick {
  action: Action;
  representation: string;
}

export interface RulesPlanner extends Planner {
  decideSync(situation: Situation): Decision;
}

export function createRulesPlanner(
  menu: PlannerMenu,
  opts: { thresholds?: Thresholds; skills?: Skills } = {},
): RulesPlanner {
  const th = opts.thresholds ?? THRESHOLDS;
  const skills = opts.skills ?? SKILLS;
  const r = new Rules(menu, th, skills);
  const decideSync = (s: Situation) => r.decide(s);
  return { id: 'rules', decide: decideSync, decideSync };
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
      case 'correct':
        return this.onCorrect(s);
      case 'self_report':
        // "Not now": no transfer this time; a later correct-after-help may offer one.
        if (s.selfReports[s.selfReports.length - 1]?.value === 'dismissed') {
          return this.decision(s, RULES.selfReportDismissed, {
            kind: 'continue',
          });
        }
        return this.transfer(s, RULES.transferAfterSelfReport) ?? this.next(s);
      case 'request':
        return this.onRequest(s);
      case 'clarify':
        return this.onClarify(s, s.clarify[s.clarify.length - 1] ?? 'why');
      default:
        return this.next(s);
    }
  }

  // --- building blocks --------------------------------------------------------

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

  private canNest(s: Situation): boolean {
    return s.depth < MAX_DEPTH;
  }

  /** The step's own deep dive, if it was not shown yet in this question. */
  private deepDive(s: Situation): Pick | null {
    const id = this.menu.deepDiveOf(s.step.key);
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
    return vs.filter(v => !s.question.variantsShown.includes(v.id));
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
    const alts = this.unshown(
      this.menu.variantsFor(s.step.key, 'alternative'),
      s,
    ).filter(
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

  private teacherNote(s: Situation, ruleId: RuleId): Decision | null {
    return s.decisions.some(d => d.kind === 'teacher_note')
      ? null
      : this.decision(s, ruleId, { kind: 'teacher_note' });
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
    const v = this.unshown(this.menu.variantsFor(s.step.key, 'simpler'), s)
      .filter(x => (x.round ?? 0) > lastRound)
      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0))[0];
    return v ? this.variantPick(v) : null;
  }

  /** One prerequisite level below the current step's skills (capped). */
  private prerequisite(s: Situation): Pick | null {
    if (
      !this.canNest(s) ||
      s.question.prerequisiteLevel >= this.th.maxPrerequisiteLevels
    ) {
      return null;
    }
    for (const skill of s.step.skills) {
      for (const pre of this.skills.prerequisites(skill)) {
        const v = this.unshown(this.menu.prerequisitesFor(pre), s)[0];
        if (v) {
          return this.variantPick(v);
        }
      }
    }
    return null;
  }

  private transfer(s: Situation, ruleId: RuleId): Decision | null {
    if (s.step.scope !== 'main') {
      return null;
    }
    const v = this.unshown(
      this.menu.variantsFor(s.step.key, 'transfer'),
      s,
    ).find(x => !s.question.transfersDone.includes(x.id));
    return v ? this.pickDecision(s, ruleId, this.variantPick(v)) : null;
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
    return (
      this.teacherNote(s, RULES.struggleEscalate) ??
      this.withHint(s, RULES.struggleEscalate) ??
      this.next(s)
    );
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

  private onWrong(s: Situation): Decision {
    const struggling = this.struggle(s);
    if (struggling) {
      return struggling;
    }
    if (s.step.wrong <= 1) {
      return this.firstWrong(s);
    }
    // Second wrong: change representation and require an action.
    const dd = this.menu.deepDiveOf(s.step.key);
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
      this.teacherNote(s, RULES.secondWrongHint) ??
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
    // The option / known-value feedback is already on screen (authored content).
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
    const v = this.unshown(
      this.menu.variantsFor(s.step.key, 'alternative'),
      s,
    ).find(x => x.representation === component);
    return v ? this.variantPick(v, true) : null;
  }

  private onNotSure(s: Situation): Decision {
    const struggling = this.struggle(s);
    if (struggling) {
      return struggling;
    }
    const id = this.menu.deepDiveOf(s.step.key);
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
        this.teacherNote(s, RULES.exampleLoopEnd) ??
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
    if ((helped || odd) && canAsk) {
      return this.decision(
        s,
        helped ? RULES.correctAfterHelp : RULES.oddTiming,
        { kind: 'self_report' },
        { representation: 'self_report' },
      );
    }
    if (helped) {
      const t = this.transfer(s, RULES.transferAfterHelp);
      if (t) {
        return t;
      }
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
      return this.decision(s, RULES.cleanStreak, { kind: 'compress_steps' });
    }
    return this.next(s);
  }

  private onRequest(s: Situation): Decision {
    const last = [...s.requests].reverse().find(r => r.kind !== 'ask');
    if (last?.kind === 'simpler') {
      const p = this.prerequisite(s) ?? this.simplerTwin(s);
      if (p) {
        return this.pickDecision(s, RULES.simpler, p);
      }
      return this.teacherNote(s, RULES.simpler) ?? this.next(s);
    }
    // "Change method": a representation not yet tried for this skill.
    const p = this.change(s, { includeDeepDive: true }) ?? this.hint(s);
    if (p) {
      return this.pickDecision(s, RULES.changeMethod, p);
    }
    return this.teacherNote(s, RULES.changeMethod) ?? this.next(s);
  }

  private onClarify(s: Situation, choice: ClarifyChoice): Decision {
    switch (choice) {
      case 'counting': {
        const p =
          this.change(s, { includeDeepDive: false, addresses: 'counting' }) ??
          this.simplerTwin(s) ??
          this.hint(s);
        return p
          ? this.pickDecision(s, RULES.clarifyCounting, p)
          : this.next(s);
      }
      case 'why': {
        const p =
          this.deepDive(s) ??
          this.change(s, { includeDeepDive: false, addresses: 'why' }) ??
          this.hint(s);
        return p ? this.pickDecision(s, RULES.clarifyWhy, p) : this.next(s);
      }
      case 'link': {
        const results = this.menu.usedResults(s.questionId);
        if (results.length > 0) {
          return this.decision(
            s,
            RULES.clarifyLink,
            {
              kind: 'explain',
              blocks: results.map(r => ({
                type: 'tutor_text',
                text: r.statement,
              })),
            },
            { representation: 'previous_result' },
          );
        }
        const p =
          this.change(s, { includeDeepDive: false, addresses: 'link' }) ??
          this.deepDive(s) ??
          this.hint(s);
        return p ? this.pickDecision(s, RULES.clarifyLink, p) : this.next(s);
      }
    }
  }
}
