import { fractionToLatex } from '../engine/format';
import ex2 from '../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../content/loader';
import { THRESHOLDS } from '../state/config';
import { buildMenu } from './planner';
import { createRulesPlanner, MAX_DEPTH, RULES, type RuleId } from './rules';
import type { Decision } from './schema';
import type { Situation } from './situation';

const r = loadExercise(ex2, ex2Misconceptions);
if (!r.ok) {
  throw new Error(r.errors.join('\n'));
}
const menu = buildMenu(r.loaded);
const planner = createRulesPlanner(menu);
const fired = new Set<string>();

type Overrides = Omit<Partial<Situation>, 'step' | 'question'> & {
  step?: Partial<Situation['step']>;
  question?: Partial<Situation['question']>;
};

/** A situation on a step, with defaults: nothing happened yet. */
function sit(
  trigger: Situation['trigger'],
  key: string,
  o: Overrides = {},
): Situation {
  const [questionId] = key.includes('/') ? key.split('/') : ['1b'];
  const scope = key.startsWith('dd:')
    ? 'mini'
    : key.startsWith('var:')
    ? 'variant'
    : 'main';
  return {
    trigger,
    exerciseId: 'bac2022c-ex2',
    contentVersion: 'ex2-0.4.0',
    questionId: questionId!,
    stack: [],
    depth: 0,
    detours: [],
    componentsShown: [],
    representationsTried: [],
    decisions: [],
    requests: [],
    declinedOffers: [],
    clarify: [],
    selfReports: [],
    skills: {},
    session: { selfReportsAsked: 0 },
    ...o,
    step: {
      key,
      scope,
      skills: [],
      wrong: 0,
      notSure: 0,
      struggle: 0,
      hintsUsed: 0,
      hintCount: 3,
      wrongValues: [],
      revealed: false,
      ...o.step,
    },
    question: {
      cleanStreak: 0,
      cleanStreakActed: false,
      selfReportsAsked: 0,
      compressOffered: false,
      compressed: false,
      transfersDone: [],
      variantsShown: [],
      deepDivesShown: [],
      exampleRounds: [],
      prerequisiteLevel: 0,
      teacherNotes: 0,
      ...o.question,
    },
  };
}

const shakySkill = {
  status: 'shaky' as const,
  representationsTried: [],
  helpRequests: { changeMethod: 0, easier: 0 },
};

function decide(s: Situation, rule: RuleId): Decision {
  const d = planner.decideSync(s);
  expect(d.ruleId).toBe(rule);
  expect(d.source).toBe('rules');
  fired.add(d.ruleId);
  return d;
}

const wrong = (n: number, extra: Partial<Situation['step']> = {}) => ({
  wrong: n,
  struggle: n + (extra.notSure ?? 0),
  ...extra,
});

describe('1st wrong answer', () => {
  it('undiagnosed (no misconception): the generic line is on screen, nothing more without a check', () => {
    const d = decide(
      sit('wrong', '1b/s5', {
        step: wrong(1, { wrongValues: [{ value: '5' }] }),
      }),
      RULES.firstWrong,
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });

  it('diagnosed, no repair (round 1 "dead ends"): the next hint, never a bare continue', () => {
    const d = decide(
      sit('wrong', '1b/s3', {
        step: wrong(1, {
          wrongValues: [
            { value: 'two', misconceptionId: 'complement_partial_event' },
          ],
        }),
      }),
      RULES.firstWrongDiagnosed,
    );
    expect(d.next).toEqual({ kind: 'hint', level: 1 });
  });

  it('diagnosed, the ladder used up: the next detour', () => {
    const d = decide(
      sit('wrong', '1b/s3', {
        step: wrong(1, {
          hintsUsed: 3,
          hintCount: 3,
          wrongValues: [
            { value: 'two', misconceptionId: 'complement_partial_event' },
          ],
        }),
      }),
      RULES.firstWrongDiagnosed,
    );
    expect(d.next).toEqual({
      kind: 'deep_dive',
      deepDiveId: 'au_moins_contraire',
    });
  });

  it(`diagnosed, ladder used and ${THRESHOLDS.maxDetoursPerStep} detours: nothing authored is left, the line stays and reveal is open`, () => {
    const detour = {
      kind: 'variant' as const,
      variantKind: 'alternative' as const,
      representation: 'x',
      outcome: 'correct' as const,
    };
    const d = decide(
      sit('wrong', '1b/s3', {
        detours: Array.from(
          { length: THRESHOLDS.maxDetoursPerStep },
          (_, i) => ({
            ...detour,
            id: `d${i}`,
          }),
        ) as unknown as Situation['detours'],
        question: { variantsShown: ['pre-event-as-set', 'pre-sure-event'] },
        step: wrong(1, {
          hintsUsed: 3,
          hintCount: 3,
          wrongValues: [
            { value: 'two', misconceptionId: 'complement_partial_event' },
          ],
        }),
      }),
      RULES.firstWrong,
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });

  it("adds a numeric check with the student's own value", () => {
    const d = decide(
      sit('wrong', '1b/s8', {
        step: wrong(1, { wrongValues: [{ value: '1/2' }] }),
      }),
      RULES.firstWrongCheck,
    );
    expect(d.next).toEqual({ kind: 'numeric_check' });
  });

  it('no numeric check when the value is not a number', () => {
    const d = decide(
      sit('wrong', '1b/s8', {
        step: wrong(1, { wrongValues: [{ value: null }] }),
      }),
      RULES.firstWrong,
    );
    expect(d.next.kind).toBe('continue');
  });

  it("offers the misconception's repair component (optional), with the numeric check", () => {
    const d = decide(
      sit('wrong', '1b/s8', {
        step: wrong(1, {
          wrongValues: [
            { value: '3/10', misconceptionId: 'confuses_event_and_complement' },
          ],
        }),
      }),
      RULES.firstWrongRepair,
    );
    expect(d.next).toEqual({ kind: 'numeric_check' });
    expect(d.followUp).toEqual({
      kind: 'variant',
      variantId: 'alt-1b-s8-complement',
      offer: true,
    });
    expect(d.representation).toBe('ComplementView');
  });

  it('offers the repair alone when there is no check', () => {
    const d = decide(
      sit('wrong', '1b/s3', {
        step: wrong(1, {
          wrongValues: [
            { value: 'one', misconceptionId: 'au_moins_direct_miscount' },
          ],
        }),
      }),
      RULES.firstWrongRepair,
    );
    expect(d.next).toEqual({
      kind: 'variant',
      variantId: 'alt-1b-s3-pick',
      offer: true,
    });
  });
});

describe('2nd wrong answer: change representation, require an action', () => {
  it('opens the step deep dive when its representation was not tried', () => {
    const d = decide(
      sit('wrong', '1b/s3', { step: wrong(2) }),
      RULES.secondWrong,
    );
    expect(d.next).toEqual({
      kind: 'deep_dive',
      deepDiveId: 'au_moins_contraire',
    });
    expect(d.representation).toBe('text+ComplementView');
  });

  it('skips representations already tried for the skill', () => {
    const d = decide(
      sit('wrong', '1b/s3', {
        step: wrong(2),
        representationsTried: ['text+ComplementView'],
      }),
      RULES.secondWrong,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'alt-1b-s3-pick' });
  });

  it('never shows the same deep dive twice', () => {
    const d = decide(
      sit('wrong', '1b/s3', {
        step: wrong(2),
        question: { deepDivesShown: ['au_moins_contraire'] },
      }),
      RULES.secondWrong,
    );
    expect(d.next.kind).toBe('variant');
  });

  it('prefers an alternative for the misconception skill when the deep dive teaches another one', () => {
    const d = decide(
      sit('wrong', '2a/s10', {
        step: wrong(2, {
          wrongValues: [
            { value: null, misconceptionId: 'misses_duplicate_value_pair' },
            { value: null },
          ],
        }),
      }),
      RULES.secondWrong,
    );
    expect(d.next).toEqual({
      kind: 'variant',
      variantId: 'alt-2a-s10-complement',
    });
  });

  it('falls back to the next hint when no other representation is left', () => {
    const d = decide(
      sit('wrong', 'dd:pairs_listing', { step: wrong(2) }),
      RULES.secondWrongHint,
    );
    expect(d.next).toEqual({ kind: 'hint', level: 1 });
  });

  it('respects the depth cap', () => {
    const d = decide(
      sit('wrong', '1b/s3', { step: wrong(2), depth: MAX_DEPTH }),
      RULES.secondWrongHint,
    );
    expect(d.next.kind).toBe('hint');
  });
});

describe(`3rd struggle signal (${THRESHOLDS.clarifyAfterStruggle}: wrong + not sure)`, () => {
  it('asks what exactly is unclear: counting / why / link', () => {
    const d = decide(
      sit('wrong', '1b/s5', { step: wrong(2, { notSure: 1 }) }),
      RULES.struggleClarify,
    );
    expect(d.next).toMatchObject({
      kind: 'ask_clarify',
      choices: ['counting', 'why', 'link'],
    });
  });

  // Changed by B2 (2026-10-22): with nothing tried on the step, two "not
  // sure" first change the form (see the B2 tests); once a change was
  // tried, "not sure" twice asks, as before.
  it('"not sure" twice on one step also asks, once a change was tried', () => {
    const d = decide(
      sit('not_sure', '1b/s5', {
        step: { notSure: 2, struggle: 2 },
        detours: [
          {
            kind: 'deep_dive',
            id: 'pairs_listing',
            representation: 'OutcomeSpace',
            outcome: 'completed',
          },
        ],
      }),
      RULES.struggleClarify,
    );
    expect(d.next.kind).toBe('ask_clarify');
  });

  it('once asked, escalates: simpler twin, then prerequisite, then the walk-through or a hint, with a silent teacher note', () => {
    const base = { step: wrong(3, { notSure: 1 }), clarify: ['why' as const] };
    expect(
      decide(sit('wrong', '1b/s5', base), RULES.struggleEscalate).next,
    ).toEqual({ kind: 'variant', variantId: 'sim-pairs-1' });
    const noTwin = sit('wrong', '1b/s5', {
      ...base,
      question: {
        variantsShown: ['sim-pairs-1', 'sim-pairs-2'],
        exampleRounds: [
          { variantId: 'sim-pairs-1', round: 1, outcome: 'wrong' },
          { variantId: 'sim-pairs-2', round: 2, outcome: 'wrong' },
        ],
      },
      step: { ...base.step, skills: ['counting-pairs'] },
    });
    expect(decide(noTwin, RULES.struggleEscalate).next).toEqual({
      kind: 'variant',
      variantId: 'pre-simultaneous',
    });
    // B4 (round 2): no card any more. This mini has no walk-through, so the
    // next hint, and the note for the teacher is queued silently (was the
    // teacher-note card).
    const nothing = sit('wrong', 'dd:pairs_listing', base);
    const d = decide(nothing, RULES.struggleEscalate);
    expect(d.next).toEqual({ kind: 'hint', level: 1 });
    expect(d.followUp).toEqual({ kind: 'teacher_note' });
  });
});

describe('"ما نعرفش"', () => {
  it('opens the step deep dive', () => {
    const d = decide(
      sit('not_sure', '1b/s3', { step: { notSure: 1, struggle: 1 } }),
      RULES.notSureDeepDive,
    );
    expect(d.next).toEqual({
      kind: 'deep_dive',
      deepDiveId: 'au_moins_contraire',
    });
  });

  it('same deep dive requested twice: a different representation', () => {
    const d = decide(
      sit('not_sure', '1b/s8', {
        step: { notSure: 1, struggle: 1 },
        question: { deepDivesShown: ['au_moins_contraire'] },
      }),
      RULES.deepDiveRepeat,
    );
    expect(d.next).toEqual({
      kind: 'variant',
      variantId: 'alt-1b-s8-complement',
    });
  });

  // Changed by B2 (2026-10-22): with nothing tried on the step, the second
  // failure (rule.second_failure) picks the same alternative through the
  // same skill preference; after an earlier detour the mismatch rule fires.
  it('skips a deep dive that targets another skill than the misconception', () => {
    const step = {
      wrong: 1,
      notSure: 1,
      struggle: 2,
      wrongValues: [{ value: null, misconceptionId: 'selects_complement' }],
    };
    const target = { kind: 'variant', variantId: 'alt-2a-s10-complement' };
    expect(
      decide(sit('not_sure', '2a/s10', { step }), RULES.secondFailure).next,
    ).toEqual(target);
    const d = decide(
      sit('not_sure', '2a/s10', {
        step,
        detours: [
          {
            kind: 'variant',
            id: 'pre-sample-space',
            representation: 'OutcomeSpace',
            variantKind: 'prerequisite',
            outcome: 'correct',
          },
        ],
      }),
      RULES.deepDiveMismatch,
    );
    expect(d.next).toEqual(target);
  });

  it('no deep dive: the next hint, then the end of the ladder', () => {
    expect(
      decide(
        sit('not_sure', '1b/s7', { step: { notSure: 1, struggle: 1 } }),
        RULES.notSureHint,
      ).next,
    ).toEqual({ kind: 'hint', level: 1 });
    expect(
      decide(
        sit('not_sure', '1b/s7', {
          step: { notSure: 1, struggle: 1, hintsUsed: 3 },
        }),
        RULES.notSureLadderEnd,
      ).next,
    ).toEqual({ kind: 'continue' });
  });
});

describe('after a detour', () => {
  const dive = (miniCorrect: boolean | undefined, outcome = 'completed') => ({
    detours: [
      {
        kind: 'deep_dive' as const,
        id: 'pairs_listing',
        representation: 'text',
        outcome,
        ...(miniCorrect !== undefined && { miniCorrect }),
      },
    ],
    representationsTried: ['text'],
    question: { deepDivesShown: ['pairs_listing'] },
  });

  it('a deep dive that did not help (mini wrong): a different representation', () => {
    const d = decide(
      sit('detour_closed', '1b/s5', dive(false)),
      RULES.deepDiveFailed,
    );
    expect(d.next.kind).toBe('variant');
    expect(d.representation).not.toBe('text');
  });

  it('a deep dive that helped, or one the student left: back to the question', () => {
    expect(
      decide(sit('detour_closed', '1b/s5', dive(true)), RULES.detourDone).next,
    ).toEqual({
      kind: 'continue',
    });
    expect(
      decide(
        sit('detour_closed', '1b/s5', dive(undefined, 'abandoned')),
        RULES.detourDone,
      ).next.kind,
    ).toBe('continue');
  });

  it('mini-example loop: a failed round gives the next, simpler round', () => {
    const d = decide(
      sit('detour_closed', '1b/s8', {
        detours: [
          {
            kind: 'variant',
            id: 'sim-complement-1',
            representation: 'numeric_twin',
            variantKind: 'simpler',
            round: 1,
            outcome: 'wrong',
          },
        ],
        question: {
          variantsShown: ['sim-complement-1'],
          exampleRounds: [
            { variantId: 'sim-complement-1', round: 1, outcome: 'wrong' },
          ],
        },
      }),
      RULES.exampleLoop,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'sim-complement-2' });
  });

  it(`mini-example loop: after ${THRESHOLDS.maxExampleRounds} rounds, the prerequisite (or a teacher note)`, () => {
    const rounds = [1, 2, 3].map(n => ({
      variantId: `sim-complement-${n}`,
      round: n,
      outcome: 'wrong',
    }));
    const base = {
      detours: rounds.map(x => ({
        kind: 'variant' as const,
        id: x.variantId,
        representation: 'numeric_twin',
        variantKind: 'simpler' as const,
        round: x.round,
        outcome: 'wrong',
      })),
      question: {
        variantsShown: rounds.map(x => x.variantId),
        exampleRounds: rounds,
      },
    };
    // 3 rounds are 3 detours (the per-step cap); one prerequisite step-back
    // is allowed beyond it (product owner, 2026-10-22), as before the cap.
    const d = decide(
      sit('detour_closed', '1b/s8', {
        ...base,
        step: { skills: ['complement-event'] },
      }),
      RULES.exampleLoopEnd,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'pre-event-as-set' });
    const twoRounds = decide(
      sit('detour_closed', '1b/s8', {
        detours: base.detours.slice(0, 2),
        question: {
          variantsShown: rounds.map(x => x.variantId),
          exampleRounds: rounds,
        },
        step: { skills: ['complement-event'] },
      }),
      RULES.exampleLoopEnd,
    );
    expect(twoRounds.next).toEqual({
      kind: 'variant',
      variantId: 'pre-event-as-set',
    });
    // B4 (round 2): 1b/s8 has a walk-through; the note is queued silently
    // (was the teacher-note card).
    const none = decide(
      sit('detour_closed', '1b/s8', base),
      RULES.exampleLoopEnd,
    );
    expect(none.next).toEqual({ kind: 'walkthrough' });
    expect(none.followUp).toEqual({ kind: 'teacher_note' });
  });

  it('a simpler round answered right: back to the question', () => {
    const d = decide(
      sit('detour_closed', '1b/s8', {
        detours: [
          {
            kind: 'variant',
            id: 'sim-complement-1',
            representation: 'numeric_twin',
            variantKind: 'simpler',
            round: 1,
            outcome: 'correct',
          },
        ],
      }),
      RULES.detourDone,
    );
    expect(d.next.kind).toBe('continue');
  });
});

describe('correct answers', () => {
  it('correct after help: one self-report', () => {
    const d = decide(
      sit('correct', '1b/s5', {
        step: { wrong: 1, last: { correct: true, value: '3', attempt: 2 } },
      }),
      RULES.correctAfterHelp,
    );
    expect(d.next).toEqual({ kind: 'self_report' });
  });

  it('suspiciously fast or slow first answers: a self-report too', () => {
    for (const durationMs of [
      THRESHOLDS.fastAnswerMs - 1,
      THRESHOLDS.slowAnswerMs + 1,
    ]) {
      const d = decide(
        sit('correct', '1b/s5', {
          step: { last: { correct: true, value: '3', attempt: 1, durationMs } },
        }),
        RULES.oddTiming,
      );
      expect(d.next.kind).toBe('self_report');
    }
  });

  it('lines written straight in the goal form: self-report, then (if asked already) the transfer', () => {
    const jumped = {
      last: { correct: true, value: null, attempt: 1, jumped: true },
    };
    expect(
      decide(sit('correct', '1b/s5', { step: jumped }), RULES.jumpedToGoal).next
        .kind,
    ).toBe('self_report');
    const d = decide(
      sit('correct', '1b/s5', {
        step: jumped,
        question: { selfReportsAsked: 1 },
      }),
      RULES.jumpedToGoal,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-noneg' });
  });

  it('an unreadable or unchecked line changes nothing (the editor already says what is wrong)', () => {
    expect(
      decide(sit('line_invalid', '1b/s5'), RULES.lineInvalid).next,
    ).toEqual({ kind: 'continue' });
  });

  it('self-report already asked in this question: a transfer variant instead', () => {
    const d = decide(
      sit('correct', '1b/s5', {
        step: { wrong: 1, skills: ['counting-pairs'] },
        // E2 (round 3): after a wrong answer the skill is shaky (one signal),
        // as in a real session; after_retry repeats only on a shaky skill.
        skills: { 'counting-pairs': shakySkill },
        question: { selfReportsAsked: 1 },
      }),
      RULES.transferAfterHelp,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-noneg' });
  });

  it('after the self-report: the transfer variant (a changed task), once', () => {
    // E2 (round 3): «خمّنت» repeats with the transfer. After a first-try answer
    // (the self-report then comes from an odd answer time), «فهمت علاش» moves
    // on (was: the transfer after any self-report but «موش توّا»).
    const guessed = {
      selfReports: [{ stepKey: '1b/s8', value: 'guessed' as const }],
    };
    expect(
      decide(
        sit('self_report', '1b/s8', {
          selfReports: [{ stepKey: '1b/s8', value: 'understood' }],
        }),
        RULES.nextStep,
      ).nextMove,
    ).toEqual({ outcome: 'first_try', wanted: 'move_on', move: 'move_on' });
    expect(
      decide(
        sit('self_report', '1b/s8', guessed),
        RULES.transferAfterSelfReport,
      ).next,
    ).toEqual({
      kind: 'variant',
      variantId: 'tr-1b-aumoins2',
    });
    expect(
      decide(
        sit('self_report', '1b/s8', {
          ...guessed,
          question: { transfersDone: ['tr-1b-aumoins2'] },
        }),
        RULES.nextStep,
      ).next.kind,
    ).toBe('continue');
  });

  it(`${THRESHOLDS.cleanStreakForCompress} clean answers with a typed or acted one: offer to compress (once)`, () => {
    const s = (
      q: Partial<Situation['question']>,
      o: Pick<Overrides, 'selfReports'> = {},
    ) =>
      sit('correct', '1b/s7', {
        step: {
          last: { correct: true, value: 'p3_10', attempt: 1, durationMs: 5000 },
        },
        question: q,
        ...o,
      });
    expect(
      decide(s({ cleanStreak: 3, cleanStreakActed: true }), RULES.cleanStreak)
        .next,
    ).toEqual({ kind: 'compress_steps' });
    expect(
      decide(
        s({ cleanStreak: 3, cleanStreakActed: true, compressOffered: true }),
        RULES.nextStep,
      ).next.kind,
    ).toBe('continue');
    expect(
      decide(s({ cleanStreak: 2, cleanStreakActed: true }), RULES.nextStep).next
        .kind,
    ).toBe('continue');
  });

  it('three clean option taps alone are not enough; "understood" is', () => {
    const s = (o: Pick<Overrides, 'selfReports'> = {}) =>
      sit('correct', '1b/s7', {
        step: {
          last: { correct: true, value: 'p3_10', attempt: 1, durationMs: 5000 },
        },
        question: { cleanStreak: 3, cleanStreakActed: false },
        ...o,
      });
    expect(decide(s(), RULES.nextStep).next.kind).toBe('continue');
    expect(
      decide(
        s({ selfReports: [{ stepKey: '1b/s3', value: 'understood' }] }),
        RULES.cleanStreak,
      ).next.kind,
    ).toBe('compress_steps');
    // A guessed or dismissed self-report is not the stronger signal.
    for (const value of ['guessed', 'dismissed'] as const) {
      expect(
        decide(
          s({ selfReports: [{ stepKey: '1b/s3', value }] }),
          RULES.nextStep,
        ).next.kind,
      ).toBe('continue');
    }
  });

  it('a dismissed self-report: no transfer this time', () => {
    const d = decide(
      sit('self_report', '1b/s8', {
        selfReports: [{ stepKey: '1b/s8', value: 'dismissed' }],
      }),
      RULES.selfReportDismissed,
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });

  it(`at most ${THRESHOLDS.selfReportsPerSession} self-reports per session (then the transfer directly)`, () => {
    const helped = (sessionAsked: number) =>
      sit('correct', '1b/s5', {
        step: { wrong: 1, skills: ['counting-pairs'] },
        // E2 (round 3): after a wrong answer the skill is shaky (one signal),
        // as in a real session; after_retry repeats only on a shaky skill.
        skills: { 'counting-pairs': shakySkill },
        session: { selfReportsAsked: sessionAsked },
      });
    expect(
      decide(
        helped(THRESHOLDS.selfReportsPerSession - 1),
        RULES.correctAfterHelp,
      ).next.kind,
    ).toBe('self_report');
    expect(
      decide(helped(THRESHOLDS.selfReportsPerSession), RULES.transferAfterHelp)
        .next,
    ).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-noneg' });
  });
});

describe('buttons on the card', () => {
  it('"change method": a representation not yet tried for the skill', () => {
    const d = decide(
      sit('request', '1b/s5', {
        requests: [{ kind: 'change_method' }],
        representationsTried: ['text+OutcomeSpace', 'EventPicker'],
      }),
      RULES.changeMethod,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'alt-2a-s6-list' });
    expect(d.representation).toBe('OutcomeSpace');
  });

  it('"change method" with nothing left: never a hint, never a dead end (the button is hidden then)', () => {
    // Changed (Group 4a): this used to answer with the next hint.
    // Changed (help chips, 2026-10-22): no teacher-note card any more; the
    // lesson goes on and the reason line points to the hint (lesson.ts).
    const nothingLeft = sit('request', 'dd:pairs_listing', {
      requests: [{ kind: 'change_method' }],
    });
    expect(decide(nothingLeft, RULES.requestNone).next.kind).toBe('continue');
    expect(planner.helpTargets(nothingLeft).changeMethod).toBe(false);
  });

  it('"something simpler" with nothing authored: never the teacher note, never a dead end', () => {
    // Changed (help chips, 2026-10-22): the second "easier" used to answer
    // with a teacher-note card; now the reason line points to the hint.
    for (const requests of [
      [{ kind: 'simpler' as const }],
      [{ kind: 'simpler' as const }, { kind: 'simpler' as const }],
    ]) {
      const d = decide(
        sit('request', 'dd:pairs_listing', { requests }),
        RULES.requestNone,
      );
      expect(d.next.kind).toBe('continue');
    }
  });

  it('helpTargets: true only when an authored answer exists', () => {
    expect(
      planner.helpTargets(
        sit('request', '1b/s5', { requests: [{ kind: 'change_method' }] }),
      ).changeMethod,
    ).toBe(true);
    expect(
      planner.helpTargets(
        sit('request', '1b/s8', {
          requests: [{ kind: 'simpler' }],
          step: { skills: ['complement-event'] },
        }),
      ).simpler,
    ).toBe(true);
  });

  it('"something simpler": one prerequisite level down via the map', () => {
    const d = decide(
      sit('request', '1b/s8', {
        requests: [{ kind: 'simpler' }],
        step: { skills: ['complement-event'] },
      }),
      RULES.simpler,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'pre-event-as-set' });
  });

  it(`"something simpler" is capped at ${THRESHOLDS.maxPrerequisiteLevels} levels (then a simpler twin)`, () => {
    const d = decide(
      sit('request', '1b/s8', {
        requests: [{ kind: 'simpler' }],
        step: { skills: ['complement-event'] },
        question: { prerequisiteLevel: THRESHOLDS.maxPrerequisiteLevels },
      }),
      RULES.simpler,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'sim-complement-1' });
  });
});

describe('answers to "what is unclear?"', () => {
  it('counting: an alternative that addresses counting', () => {
    const d = decide(
      sit('clarify', '1b/s5', { clarify: ['counting'] }),
      RULES.clarifyCounting,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'alt-1b-s5-pick' });
  });

  it('why: the deep dive if not shown, then the "why" ask chip (B3), then an alternative addressing why', () => {
    expect(
      decide(sit('clarify', '1b/s3', { clarify: ['why'] }), RULES.clarifyWhy)
        .next,
    ).toEqual({
      kind: 'deep_dive',
      deepDiveId: 'au_moins_contraire',
    });
    expect(
      decide(
        sit('clarify', '1b/s3', {
          clarify: ['why'],
          question: { deepDivesShown: ['au_moins_contraire'] },
          // B3: the ask chip tagged "why" comes first (was: straight to the alternative).
          decisions: [
            {
              ruleId: RULES.clarifyWhy,
              kind: 'explain',
              representation: 'ask_chip:why_complement',
            },
          ],
        }),
        RULES.clarifyWhy,
      ).next,
    ).toEqual({ kind: 'variant', variantId: 'alt-1b-s3-pick' });
  });

  it('link: the results the question uses (verified content)', () => {
    const d = decide(
      sit('clarify', '2a/s10', { clarify: ['link'] }),
      RULES.clarifyLink,
    );
    expect(d.next).toMatchObject({
      kind: 'explain',
      blocks: [{ type: 'tutor_text', text: { math: 'p(B) = \\frac{7}{10}' } }],
    });
  });
});

describe('B3: each clarify answer maps to an ordered list of actions (Tutor intelligence 1)', () => {
  const next = (key: string, o: Overrides, rule: RuleId) =>
    decide(sit('clarify', key, o), rule).next;

  it('counting: a counting alternative, then a deep dive tagged "counting", then a twin, then a hint', () => {
    const c = { clarify: ['counting' as const] };
    expect(next('1b/s5', c, RULES.clarifyCounting)).toEqual({
      kind: 'variant',
      variantId: 'alt-1b-s5-pick',
    });
    // Both counting alternatives of 1b/s5 shown.
    const altShown = { variantsShown: ['alt-1b-s5-pick', 'alt-2a-s6-list'] };
    expect(
      next('1b/s5', { ...c, question: altShown }, RULES.clarifyCounting),
    ).toEqual({ kind: 'deep_dive', deepDiveId: 'pairs_listing' });
    const ddShown = { ...altShown, deepDivesShown: ['pairs_listing'] };
    expect(
      next('1b/s5', { ...c, question: ddShown }, RULES.clarifyCounting),
    ).toEqual({ kind: 'variant', variantId: 'sim-pairs-1' });
    expect(
      next(
        '1b/s5',
        {
          ...c,
          question: {
            ...ddShown,
            variantsShown: [
              ...ddShown.variantsShown,
              'sim-pairs-1',
              'sim-pairs-2',
            ],
            exampleRounds: [
              { variantId: 'sim-pairs-1', round: 1, outcome: 'correct' },
              { variantId: 'sim-pairs-2', round: 2, outcome: 'correct' },
            ],
          },
        },
        RULES.clarifyCounting,
      ),
    ).toEqual({ kind: 'hint', level: 1 });
  });

  it('counting on the transfer of 1b/s5 (the real session): the counting activity of its parent step', () => {
    expect(
      next(
        'var:tr-1b-s5-noneg',
        { clarify: ['counting'], step: { skills: ['counting-pairs'] } },
        RULES.clarifyCounting,
      ),
    ).toEqual({ kind: 'variant', variantId: 'alt-1b-s5-pick' });
  });

  it('why: the ask chip tagged "why" shows its verified answer', () => {
    expect(
      next(
        '1b/s3',
        {
          clarify: ['why'],
          question: { deepDivesShown: ['au_moins_contraire'] },
        },
        RULES.clarifyWhy,
      ),
    ).toMatchObject({
      kind: 'explain',
      blocks: [
        { type: 'tutor_text', text: { ar: [{ fr: 'au moins une' }, {}] } },
        { type: 'tutor_text', text: { math: 'p(B) = 1 - p(\\bar{B})' } },
      ],
    });
  });

  it("link: the step's link shows the earlier result with its engine value", () => {
    const d = decide(
      sit('clarify', '1b/s7', { clarify: ['link'] }),
      RULES.clarifyLink,
    );
    expect(d.representation).toBe('link');
    const v = menu.loaded.values.get('nNoZero')!;
    expect(d.next).toMatchObject({
      kind: 'explain',
      blocks: [{ type: 'tutor_text', text: { math: fractionToLatex(v) } }],
    });
    expect(fractionToLatex(v)).toBe('3');
  });

  it('link shown once: then the next action (no repeat)', () => {
    const d = decide(
      sit('clarify', '1b/s7', {
        clarify: ['link'],
        decisions: [
          {
            ruleId: RULES.clarifyLink,
            kind: 'explain',
            representation: 'link',
          },
        ],
      }),
      RULES.clarifyLink,
    );
    expect(d.representation).not.toBe('link');
  });
});

describe('D2: after a reveal, a fresh variant on a new urn (round 2)', () => {
  const revealedDetour = (
    id: string,
    variantKind: NonNullable<Situation['detours'][number]['variantKind']>,
  ) => ({
    kind: 'variant' as const,
    id,
    variantKind,
    representation: 'text',
    outcome: 'revealed',
  });

  it('a main step revealed: its fresh variant opens (not offered)', () => {
    const d = decide(
      sit('revealed', '1b/s5', { step: { skills: ['counting-pairs'] } }),
      RULES.afterRevealFresh,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-fresh' });
  });

  it("a transfer revealed: its parent step's fresh variant", () => {
    const d = decide(
      sit('detour_closed', 'var:tr-1b-s5-noneg', {
        step: { skills: ['counting-pairs'] },
        detours: [revealedDetour('tr-1b-s5-noneg', 'transfer')],
      }),
      RULES.afterRevealFresh,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-fresh' });
  });

  it('the fresh variant revealed too: no second one, the lesson moves on', () => {
    const d = decide(
      sit('detour_closed', 'var:tr-1b-s5-fresh', {
        step: { skills: ['counting-pairs'] },
        detours: [revealedDetour('tr-1b-s5-fresh', 'transfer')],
        question: { variantsShown: ['tr-1b-s5-fresh'] },
      }),
      RULES.afterRevealNone,
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });

  it(`at most ${THRESHOLDS.freshAfterRevealPerSkillPerSession} per skill per session (complement-event already had one, in another question)`, () => {
    const d = decide(
      sit('revealed', '1b/s8', {
        step: { skills: ['complement-event', 'counting-pairs'] },
        session: { selfReportsAsked: 0, freshAfterReveal: ['tr-1b-s8-fresh'] },
      }),
      RULES.afterRevealNone,
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });

  // C1 (2026-10-23): 1b/s7 now has a fresh variant; 2a/sum still has none.
  it('nothing authored (2a/sum): the lesson moves on', () => {
    decide(sit('revealed', '2a/sum'), RULES.afterRevealNone);
  });

  it('fresh variants are never the normal transfer (self-report "guessed", the regular transfer already shown)', () => {
    const d = planner.decideSync(
      sit('self_report', '1b/s5', {
        selfReports: [{ stepKey: '1b/s5', value: 'guessed' }],
        question: { variantsShown: ['tr-1b-s5-noneg'] },
      }),
    );
    expect(d.next).toEqual({ kind: 'continue' });
  });
});

describe('B4: a guided walk-through instead of the teacher-note card (round 2)', () => {
  const stuck = { step: wrong(3, { notSure: 1 }), clarify: ['why' as const] };
  const nothingLeft = {
    ...stuck,
    question: {
      variantsShown: [
        'sim-pairs-1',
        'sim-pairs-2',
        'pre-simultaneous',
        'pre-sample-space',
      ],
      exampleRounds: [
        { variantId: 'sim-pairs-1', round: 1, outcome: 'wrong' },
        { variantId: 'sim-pairs-2', round: 2, outcome: 'wrong' },
      ],
    },
  };

  it('escalation with nothing else left: the walk-through of the step (via its parent for the transfer)', () => {
    for (const key of ['1b/s5', 'var:tr-1b-s5-noneg']) {
      const d = decide(sit('wrong', key, nothingLeft), RULES.struggleEscalate);
      expect(d.next).toEqual({ kind: 'walkthrough' });
      expect(d.followUp).toEqual({ kind: 'teacher_note' });
    }
  });

  it('second wrong answer with no hint left: the walk-through', () => {
    const d = decide(
      sit('wrong', '1b/s8', {
        step: wrong(2, { hintsUsed: 2, hintCount: 2 }),
        detours: Array.from(
          { length: THRESHOLDS.maxDetoursPerStep },
          (_, i) => ({
            kind: 'variant' as const,
            id: `d${i}`,
            variantKind: 'alternative' as const,
            representation: 'x',
            outcome: 'correct',
          }),
        ),
        question: { variantsShown: ['pre-event-as-set', 'pre-sure-event'] },
      }),
      RULES.secondWrongHint,
    );
    expect(d.next).toEqual({ kind: 'walkthrough' });
  });

  it('a walk-through once per step; then the next hint, then continue (the note only once)', () => {
    const shown = {
      ruleId: RULES.struggleEscalate,
      kind: 'walkthrough' as const,
    };
    const again = decide(
      sit('wrong', '1b/s5', { ...nothingLeft, decisions: [shown] }),
      RULES.struggleEscalate,
    );
    expect(again.next).toEqual({ kind: 'hint', level: 1 });
    const end = decide(
      sit('wrong', '1b/s5', {
        ...nothingLeft,
        step: { ...nothingLeft.step, hintsUsed: 3 },
        decisions: [
          shown,
          { ruleId: RULES.struggleEscalate, kind: 'teacher_note' },
        ],
      }),
      RULES.nextStep,
    );
    expect(end.next).toEqual({ kind: 'continue' });
    expect(end.followUp).toBeUndefined();
  });
});

describe('E2: nextMove after a transfer (round 3)', () => {
  const closed = (outcome: string, ruleId?: string) => ({
    kind: 'variant' as const,
    id: 'tr-1b-s5-noneg',
    variantKind: 'transfer' as const,
    representation: 'text',
    outcome,
    ...(ruleId !== undefined && { ruleId }),
  });
  const onTransfer = (o: Overrides) =>
    sit('detour_closed', 'var:tr-1b-s5-noneg', {
      ...o,
      step: { skills: ['counting-pairs'], ...o.step },
    });

  it('answered right at once: transfer_ok, the lesson moves on', () => {
    const d = decide(
      onTransfer({ detours: [closed('correct')] }),
      RULES.detourDone,
    );
    expect(d.nextMove).toEqual({
      outcome: 'transfer_ok',
      wanted: 'move_on',
      move: 'move_on',
    });
  });

  it('answered right only after a wrong answer: transfer_fail, a step back to a prerequisite', () => {
    const d = decide(
      onTransfer({ detours: [closed('wrong')] }),
      RULES.nextMoveStepBack,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'pre-simultaneous' });
    expect(d.nextMove).toEqual({
      outcome: 'transfer_fail',
      wanted: 'step_back',
      move: 'step_back',
    });
  });

  it(`a step back at most ${THRESHOLDS.stepBackPerSkillPerSession} per skill per session: then on, with the cap named`, () => {
    const d = decide(
      onTransfer({
        detours: [closed('wrong')],
        session: {
          selfReportsAsked: 0,
          moves: [
            { move: 'step_back', skills: ['counting-pairs'], questionId: '1a' },
          ],
        },
      }),
      RULES.detourDone,
    );
    expect(d.nextMove).toMatchObject({
      move: 'move_on',
      stoppedBy: 'stepBackPerSkillPerSession',
    });
  });

  it('a transfer revealed after a failed one on the skill (fails twice): a step back', () => {
    const d = decide(
      onTransfer({
        detours: [closed('revealed')],
        session: {
          selfReportsAsked: 0,
          outcomes: [
            {
              stepKey: 'var:tr-2a-s6-six',
              outcome: 'transfer_fail',
              skills: ['counting-pairs'],
            },
          ],
        },
      }),
      RULES.nextMoveStepBack,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'pre-simultaneous' });
  });
});

describe('the planner never reveals and never invents', () => {
  it('chooses only registered content: every variant / deep dive it returns exists', () => {
    for (const d of [...decisions]) {
      for (const a of [d.next, ...(d.followUp ? [d.followUp] : [])]) {
        if (a.kind === 'variant') {
          expect(menu.variant(a.variantId)).toBeDefined();
        }
        if (a.kind === 'deep_dive') {
          expect(menu.hasDeepDive(a.deepDiveId)).toBe(true);
        }
      }
    }
  });
});

/** Decisions from a sweep over every trigger and step (shape checks above). */
const decisions: Decision[] = [];
beforeAll(() => {
  const triggers: Situation['trigger'][] = [
    'wrong',
    'not_sure',
    'correct',
    'detour_closed',
    'request',
    'clarify',
    'self_report',
  ];
  for (const key of [...menu.loaded.answers.keys()]) {
    for (const t of triggers) {
      for (const n of [1, 2, 3, 4]) {
        decisions.push(
          planner.decideSync(
            sit(t, key, {
              step: wrong(n),
              requests: [{ kind: 'simpler' }],
              clarify: ['counting'],
            }),
          ),
        );
      }
    }
  }
});

afterAll(() => {
  // Every rule id has at least one test above (beyond the default "next step").
  const untested = Object.values(RULES).filter(id => !fired.has(id));
  expect(untested).toEqual([]);
});

describe("B1: a variant step uses its parent step's menu when it shares its urn (Tutor intelligence 1)", () => {
  const transfer = 'var:tr-1b-s5-noneg';
  const wrong2 = {
    step: {
      wrong: 2,
      struggle: 2,
      wrongValues: [{ value: '4' }, { value: '5' }],
    },
  };

  it('second wrong on the transfer: a change of representation from 1b/s5, not a hint', () => {
    const d = decide(sit('wrong', transfer, wrong2), RULES.secondWrong);
    expect(d.next.kind === 'deep_dive' || d.next.kind === 'variant').toBe(true);
    const target =
      d.next.kind === 'deep_dive'
        ? d.next.deepDiveId
        : d.next.kind === 'variant'
        ? d.next.variantId
        : '';
    expect(['pairs_listing', 'alt-1b-s5-pick', 'alt-2a-s6-list']).toContain(
      target,
    );
  });

  it('a first "not sure" on the transfer opens 1b/s5\'s deep dive', () => {
    const d = decide(
      sit('not_sure', transfer, { step: { notSure: 1, struggle: 1 } }),
      RULES.notSureDeepDive,
    );
    expect(d.next).toEqual({ kind: 'deep_dive', deepDiveId: 'pairs_listing' });
  });

  it('what was shown already is not offered again', () => {
    const d = planner.decideSync(
      sit('wrong', transfer, {
        ...wrong2,
        question: {
          deepDivesShown: ['pairs_listing'],
          variantsShown: ['tr-1b-s5-noneg', 'alt-1b-s5-pick'],
        },
      }),
    );
    expect(d.next).toMatchObject({
      kind: 'variant',
      variantId: 'alt-2a-s6-list',
    });
  });

  it('a variant with its own urn inherits nothing (sim-pairs-2): the hint ladder', () => {
    const d = decide(
      sit('wrong', 'var:sim-pairs-2', wrong2),
      RULES.secondWrongHint,
    );
    expect(d.next.kind).toBe('hint');
  });
});

describe('B2: a second failure (wrong or not sure) changes representation before asking what is unclear', () => {
  it('two "not sure" on the transfer: a change (was: ask_clarify)', () => {
    const d = decide(
      sit('not_sure', 'var:tr-1b-s5-noneg', {
        step: { notSure: 2, struggle: 2 },
      }),
      RULES.secondFailure,
    );
    expect(d.next).toEqual({ kind: 'deep_dive', deepDiveId: 'pairs_listing' });
  });

  it('wrong then "not sure" on 1b/s7 (no deep dive): an alternative (was: a hint)', () => {
    const d = decide(
      sit('not_sure', '1b/s7', {
        step: {
          wrong: 1,
          notSure: 1,
          struggle: 2,
          wrongValues: [{ value: 'p7_10' }],
        },
      }),
      RULES.secondFailure,
    );
    expect(d.next.kind).toBe('variant');
  });

  it('"not sure" then wrong on 1b/s7: an alternative (was: the first-wrong feedback)', () => {
    const d = decide(
      sit('wrong', '1b/s7', {
        step: {
          wrong: 1,
          notSure: 1,
          struggle: 2,
          wrongValues: [{ value: 'p7_10' }],
        },
      }),
      RULES.secondFailure,
    );
    expect(d.next.kind).toBe('variant');
  });

  it('once a change was tried on the step, the second failure keeps the old rules', () => {
    decide(
      sit('not_sure', 'var:tr-1b-s5-noneg', {
        step: { notSure: 2, struggle: 2 },
        detours: [
          {
            kind: 'deep_dive',
            id: 'pairs_listing',
            representation: 'OutcomeSpace',
            outcome: 'completed',
          } as never,
        ],
      }),
      RULES.struggleClarify,
    );
  });

  it('two wrong answers keep their own rule (second_wrong)', () => {
    decide(
      sit('wrong', 'var:tr-1b-s5-noneg', {
        step: {
          wrong: 2,
          struggle: 2,
          wrongValues: [{ value: '4' }, { value: '5' }],
        },
      }),
      RULES.secondWrong,
    );
  });

  it('a third failure still asks what is unclear', () => {
    decide(
      sit('wrong', 'var:tr-1b-s5-noneg', {
        step: {
          wrong: 2,
          notSure: 1,
          struggle: 3,
          wrongValues: [{ value: '4' }, { value: '5' }],
        },
      }),
      RULES.struggleClarify,
    );
  });
});

describe('help requests (chips): at most 3 detours per step, never a dead end', () => {
  const dd = (id: string) => ({
    kind: 'deep_dive' as const,
    id,
    representation: 'OutcomeSpace',
    outcome: 'completed',
  });
  const v = (
    id: string,
    variantKind: 'alternative' | 'simpler' | 'transfer',
  ) => ({
    kind: 'variant' as const,
    id,
    representation: id,
    variantKind,
    outcome: 'correct',
  });
  const three = [
    dd('pairs_listing'),
    v('alt-1b-s5-pick', 'alternative'),
    v('sim-pairs-1', 'simpler'),
  ];

  // Changed (cap exemption, 2026-10-22): "easier" keeps its one step-back
  // at the cap, so only "change method" is hidden there.
  it(`after ${THRESHOLDS.maxDetoursPerStep} detours on a step: no new form; "easier" keeps one step-back`, () => {
    const change = sit('request', '1b/s5', {
      requests: [{ kind: 'change_method' }],
      detours: three,
      step: { skills: ['counting-pairs'] },
    });
    expect(decide(change, RULES.requestNone).next.kind).toBe('continue');
    expect(planner.helpTargets(change)).toEqual({
      changeMethod: false,
      simpler: true,
    });
    const easierAgain = sit('request', '1b/s5', {
      requests: [{ kind: 'simpler' }],
      detours: [...three, v('pre-simultaneous', 'prerequisite' as never)],
      step: { skills: ['counting-pairs'] },
    });
    expect(decide(easierAgain, RULES.requestNone).next.kind).toBe('continue');
    expect(planner.helpTargets(easierAgain)).toEqual({
      changeMethod: false,
      simpler: false,
    });
  });

  it("the cap also stops the rules' own detours (a second wrong answer gets the next hint)", () => {
    const d = decide(
      sit('wrong', '1b/s5', {
        detours: three,
        step: {
          wrong: 2,
          struggle: 2,
          wrongValues: [{ value: '4' }, { value: '5' }],
        },
      }),
      RULES.secondWrongHint,
    );
    expect(d.next.kind).toBe('hint');
  });

  it('transfers do not count toward the cap', () => {
    const d = decide(
      sit('request', '1b/s5', {
        requests: [{ kind: 'change_method' }],
        detours: [
          v('tr-1b-s5-noneg', 'transfer'),
          dd('pairs_listing'),
          v('alt-1b-s5-pick', 'alternative'),
        ],
        question: {
          deepDivesShown: ['pairs_listing'],
          variantsShown: ['tr-1b-s5-noneg', 'alt-1b-s5-pick'],
        },
      }),
      RULES.changeMethod,
    );
    // 2 counted detours (the transfer is not one): a third is still given.
    expect(d.next.kind).toBe('variant');
  });

  it('a declined repair offer is not proposed again by "change method"', () => {
    const d = decide(
      sit('request', '1b/s7', {
        requests: [{ kind: 'change_method' }],
        declinedOffers: ['alt-1b-s8-bar'],
      }),
      RULES.changeMethod,
    );
    expect(d.next).not.toEqual({ kind: 'variant', variantId: 'alt-1b-s8-bar' });
  });
});

describe('cap exemption: one prerequisite step-back beyond the 3 detours (2026-10-22)', () => {
  const v = (
    id: string,
    variantKind: 'alternative' | 'simpler' | 'prerequisite',
  ) => ({
    kind: 'variant' as const,
    id,
    representation: id,
    variantKind,
    outcome: 'correct',
  });
  const three = [
    v('alt-1b-s8-complement', 'alternative'),
    v('alt-1b-s8-bar', 'alternative'),
    v('sim-complement-1', 'simpler'),
  ];
  const easier = (o: Parameters<typeof sit>[2] = {}) =>
    sit('request', '1b/s8', {
      requests: [{ kind: 'simpler' }],
      step: { skills: ['complement-event'] },
      ...o,
      detours: o.detours ?? three,
    });

  it('at 3 detours, "easier" still steps back once (a 4th detour)', () => {
    expect(decide(easier(), RULES.simpler).next).toEqual({
      kind: 'variant',
      variantId: 'pre-event-as-set',
    });
  });

  it('not twice on a step: after the step-back (4 detours), nothing more', () => {
    decide(
      easier({ detours: [...three, v('pre-event-as-set', 'prerequisite')] }),
      RULES.requestNone,
    );
  });

  it('not if a step-back was already one of the 3', () => {
    decide(
      easier({
        detours: [three[0]!, three[1]!, v('pre-event-as-set', 'prerequisite')],
        question: { variantsShown: ['pre-event-as-set'] },
      }),
      RULES.requestNone,
    );
  });

  it('once per skill per session: a skill that already had its step-back is skipped (another prerequisite skill may still be used)', () => {
    const d = planner.decideSync(
      easier({ question: { variantsShown: ['pre-event-as-set'] } }),
    );
    expect(d.next).not.toEqual({
      kind: 'variant',
      variantId: 'pre-event-as-set',
    });
  });

  it('the twin and alternatives stay capped (only the step-back is exempt)', () => {
    const d = decide(
      sit('request', '1b/s8', {
        requests: [{ kind: 'change_method' }],
        detours: three,
      }),
      RULES.requestNone,
    );
    expect(d.next.kind).toBe('continue');
  });
});
