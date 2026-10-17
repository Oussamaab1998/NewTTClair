import { EventSchema, type EventType } from './events';

const base = {
  id: 'ev1',
  ts: 1760000000000,
  sessionId: 's1',
  studentId: 'anon-42',
  exerciseId: 'bac2022c-ex2',
  contentVersion: 'ex2-0.3.0',
  questionId: '2a',
  stepId: 'q6',
};

const samples: Record<EventType, Record<string, unknown>> = {
  answer: {
    t: 'answer',
    kind: 'typed',
    value: '1/10',
    correct: false,
    misconceptionId: 'p_x0_counts_one_pair',
    attempt: 1,
  },
  not_sure: { t: 'not_sure', deepDiveId: 'prod0', attempt: 1 },
  hint: { t: 'hint', level: 2 },
  reveal: { t: 'reveal', hintsUsed: 3, attempt: 2 },
  deepdive: {
    t: 'deepdive',
    deepDiveId: 'prod0',
    outcome: 'completed',
    miniCorrect: true,
  },
  component_event: {
    t: 'component_event',
    component: 'EventPicker',
    name: 'submitted',
    payload: { selected: ['a-b'], correct: ['a-b', 'b-c'] },
  },
  component_error: {
    t: 'component_error',
    component: 'Hologram',
    reason: 'unknown_component',
  },
  ask: {
    t: 'ask',
    via: 'longpress',
    mode: 'why',
    quoted: 'au moins un',
    source: 'local',
    snapshot: { k: 2, highlighted: ['b-c'] },
  },
  mode: { t: 'mode', value: 'try_alone', result: 'skip_ok' },
  self_report: { t: 'self_report', value: 'guessed' },
  transfer: {
    t: 'transfer',
    skillId: 'event-counting',
    correct: true,
    variantId: 'urn-6-balls',
    hintsUsed: 0,
  },
  admit: { t: 'admit', resultId: 'p_B_7_10' },
  skip: { t: 'skip', reason: 'knows_it' },
  report: {
    t: 'report',
    blockId: 'q1b-s2',
    contentVersion: 'ex2-0.1.0',
    reason: 'wrong_math',
    source: 'lesson',
    snapshot: {},
  },
  example_round: {
    t: 'example_round',
    templateId: 'urn-count',
    round: 2,
    outcome: 'wrong',
  },
  request: { t: 'request', kind: 'change_method' },
  clarify: { t: 'clarify', choice: 'counting' },
  offer_response: { t: 'offer_response', offer: 'compress', accepted: true },
  plan: {
    t: 'plan',
    trigger: 'wrong',
    decision: {
      diagnosis: {
        skillIds: ['counting-pairs'],
        misconceptionIds: [],
        confidence: 0.5,
        summary: 'rule.second_wrong',
      },
      avoid: ['text'],
      next: { kind: 'variant', variantId: 'alt-1b-s5-pick' },
      ruleId: 'rule.second_wrong',
      source: 'rules',
      representation: 'EventPicker',
    },
  },
  teacher_note: {
    t: 'teacher_note',
    noteId: 'note-12',
    skillIds: ['counting-pairs'],
    misconceptionIds: ['counts_ordered_pairs'],
    ruleId: 'rule.example_loop.end',
  },
};

describe('EventSchema', () => {
  it.each(Object.entries(samples))('accepts a %s event', (_t, sample) => {
    const r = EventSchema.safeParse({ ...base, ...sample });
    expect(r.success ? [] : r.error.issues).toEqual([]);
  });
  it('accepts reaction metadata on planner-driven events', () => {
    const e = {
      ...base,
      ...samples.answer,
      reaction: { reactionId: 'r1', representation: 'EventPicker' },
    };
    expect(EventSchema.safeParse(e).success).toBe(true);
  });
  it('rejects unknown event types and the prototype format', () => {
    expect(EventSchema.safeParse({ ...base, t: 'transfer_ok' }).success).toBe(
      false,
    );
    expect(EventSchema.safeParse({ t: 'correct', at: 'q1' }).success).toBe(
      false,
    );
  });
  it('rejects a hint level above 3', () => {
    expect(
      EventSchema.safeParse({ ...base, t: 'hint', level: 4 }).success,
    ).toBe(false);
  });
  it('requires blockId and contentVersion on reports', () => {
    for (const key of ['blockId', 'contentVersion']) {
      const report: Record<string, unknown> = { ...base, ...samples.report };
      delete report[key];
      expect(EventSchema.safeParse(report).success).toBe(false);
    }
  });
  it('rejects non-JSON payloads and unexpected fields (e.g. personal data)', () => {
    const fn = {
      ...base,
      ...samples.component_event,
      payload: { cb: () => 1 },
    };
    expect(EventSchema.safeParse(fn).success).toBe(false);
    expect(
      EventSchema.safeParse({ ...base, ...samples.hint, studentName: 'X' })
        .success,
    ).toBe(false);
  });
  it('a plan event needs a rule id and a source, and only known action kinds', () => {
    const plan = { ...base, ...samples.plan } as Record<string, unknown>;
    const decision = plan.decision as Record<string, unknown>;
    for (const key of ['ruleId', 'source']) {
      const d = { ...decision };
      delete d[key];
      expect(EventSchema.safeParse({ ...plan, decision: d }).success).toBe(
        false,
      );
    }
    expect(
      EventSchema.safeParse({
        ...plan,
        decision: { ...decision, next: { kind: 'reveal_answer' } },
      }).success,
    ).toBe(false);
  });

  it('a teacher note carries ids only (no free text field)', () => {
    expect(
      EventSchema.safeParse({ ...base, ...samples.teacher_note, text: 'x' })
        .success,
    ).toBe(false);
  });

  it('caps free text length', () => {
    expect(
      EventSchema.safeParse({ ...base, ...samples.ask, text: 'a'.repeat(501) })
        .success,
    ).toBe(false);
  });
});
