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
  it('specific feedback is the authored one: nothing more without a check or repair', () => {
    const d = decide(
      sit('wrong', '1b/s5', {
        step: wrong(1, { wrongValues: [{ value: '5' }] }),
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

  it('"not sure" twice on one step also asks', () => {
    const d = decide(
      sit('not_sure', '1b/s5', { step: { notSure: 2, struggle: 2 } }),
      RULES.struggleClarify,
    );
    expect(d.next.kind).toBe('ask_clarify');
  });

  it('once asked, escalates: simpler twin, then prerequisite, then a teacher note', () => {
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
    const nothing = sit('wrong', 'dd:pairs_listing', base);
    expect(decide(nothing, RULES.struggleEscalate).next.kind).toBe(
      'teacher_note',
    );
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

  it('skips a deep dive that targets another skill than the misconception', () => {
    const d = decide(
      sit('not_sure', '2a/s10', {
        step: {
          wrong: 1,
          notSure: 1,
          struggle: 2,
          wrongValues: [{ value: null, misconceptionId: 'selects_complement' }],
        },
      }),
      RULES.deepDiveMismatch,
    );
    expect(d.next).toEqual({
      kind: 'variant',
      variantId: 'alt-2a-s10-complement',
    });
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
    const d = decide(
      sit('detour_closed', '1b/s8', {
        ...base,
        step: { skills: ['complement-event'] },
      }),
      RULES.exampleLoopEnd,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'pre-event-as-set' });
    const none = decide(
      sit('detour_closed', '1b/s8', base),
      RULES.exampleLoopEnd,
    );
    expect(none.next.kind).toBe('teacher_note');
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

  it('self-report already asked in this question: a transfer variant instead', () => {
    const d = decide(
      sit('correct', '1b/s5', {
        step: { wrong: 1 },
        question: { selfReportsAsked: 1 },
      }),
      RULES.transferAfterHelp,
    );
    expect(d.next).toEqual({ kind: 'variant', variantId: 'tr-1b-s5-noneg' });
  });

  it('after the self-report: the transfer variant (a changed task), once', () => {
    expect(
      decide(sit('self_report', '1b/s8'), RULES.transferAfterSelfReport).next,
    ).toEqual({
      kind: 'variant',
      variantId: 'tr-1b-aumoins2',
    });
    expect(
      decide(
        sit('self_report', '1b/s8', {
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
        step: { wrong: 1 },
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

  it('"change method" with nothing left: never a hint (a teacher note; the button is hidden then)', () => {
    // Changed (Group 4a): this used to answer with the next hint.
    const nothingLeft = sit('request', 'dd:pairs_listing', {
      requests: [{ kind: 'change_method' }],
    });
    expect(decide(nothingLeft, RULES.changeMethod).next.kind).toBe(
      'teacher_note',
    );
    expect(planner.helpTargets(nothingLeft).changeMethod).toBe(false);
  });

  it('"something simpler" with nothing authored: the first answer is not the teacher note', () => {
    const first = planner.decideSync(
      sit('request', 'dd:pairs_listing', { requests: [{ kind: 'simpler' }] }),
    );
    expect(first.next.kind).not.toBe('teacher_note');
    const again = planner.decideSync(
      sit('request', 'dd:pairs_listing', {
        requests: [{ kind: 'simpler' }, { kind: 'simpler' }],
      }),
    );
    expect(again.next.kind).toBe('teacher_note');
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

  it('why: the deep dive if not shown, else an alternative addressing why', () => {
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
