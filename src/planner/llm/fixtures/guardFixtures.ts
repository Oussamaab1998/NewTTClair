/**
 * Hand-written planner answers (valid and invalid) for the output guard, run
 * through the same pipeline as live answers (FakeClient -> zod -> content ->
 * guard). Situations: Exercise 2, 1.b, after a wrong answer on s3 (choice,
 * answer "none") and on s5 (typed, answer 3; the student typed 4).
 * Arabic text here is test data only (reviewed: false).
 */
import ex2 from '../../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../../content/loader';
import {
  buildContent,
  startLesson,
  type LessonContent,
} from '../../../lesson/session/lesson';
import { stepSync } from '../../../lesson/session/orchestrate';
import type { LessonAction } from '../../../lesson/session/types';
import { EventLog, fixedClock } from '../../../telemetry/log';
import { createRulesPlanner } from '../../rules';
import { buildSituation, type Situation } from '../../situation';
import { consultWith } from '../consult';
import { createFakeClient } from '../plannerClient';

export type Where = 's3' | 's5' | '2a-s10';

export interface GuardFixture {
  id: string;
  at: Where;
  expect: 'accept' | 'reject';
  /** Expected rejection reasons (subset), when rejected by the guard or content. */
  reasons?: string[];
  output: Record<string, unknown>;
}

const dx = (summary: string) => ({
  diagnosis: {
    skillIds: ['complement-event'],
    misconceptionIds: [],
    confidence: 0.6,
    summary,
  },
  avoid: [],
});
const ar = (text: string) => ({ ar: [{ ar: text }] });
const said = (text: string) => ({ type: 'tutor_text', text: ar(text) });

export const GUARD_FIXTURES: GuardFixture[] = [
  // --- valid ---
  {
    id: 'hint-next-level',
    at: 's3',
    expect: 'accept',
    output: { ...dx('hint'), next: { kind: 'hint', level: 1 } },
  },
  {
    id: 'authored-deep-dive',
    at: 's3',
    expect: 'accept',
    output: {
      ...dx('dd'),
      next: { kind: 'deep_dive', deepDiveId: 'au_moins_contraire' },
    },
  },
  {
    id: 'authored-variant',
    at: 's3',
    expect: 'accept',
    output: {
      ...dx('variant'),
      next: { kind: 'variant', variantId: 'alt-1b-s3-pick' },
    },
  },
  {
    id: 'offered-component',
    at: 's3',
    expect: 'accept',
    output: {
      ...dx('component'),
      next: {
        kind: 'show_component',
        component: {
          component: 'ComplementView',
          props: { event: { id: 'any_value', args: { value: 0 } } },
        },
        instruction: ar('اضغط على الجهة اللي ما فيهاش صفر.'),
      },
    },
  },
  {
    id: 'one-idea-with-math',
    at: 's3',
    expect: 'accept',
    output: {
      ...dx('explain'),
      next: {
        kind: 'explain',
        blocks: [
          said('العكس متاع الحدث هذا هو اللي ما يصيرش فيه حتى صفر.'),
          { type: 'math', latex: '\\bar{B}' },
        ],
      },
    },
  },
  {
    id: 'ask-clarify',
    at: 's3',
    expect: 'accept',
    output: {
      ...dx('clarify'),
      next: {
        kind: 'ask_clarify',
        options: [ar('ما فهمتش كلمة العكس'), ar('ما فهمتش علاش نخدمو بالعكس')],
        choices: ['why', 'link'],
      },
    },
  },
  {
    id: 'student-own-number',
    at: 's5',
    expect: 'accept',
    output: {
      ...dx('own value'),
      next: {
        kind: 'explain',
        blocks: [
          said('إنت كتبت هالعدد. عاود عدّ التيراجات.'),
          { type: 'math', latex: '4' },
        ],
      },
    },
  },
  // --- invalid ---
  {
    id: 'hint-skips-ladder',
    at: 's3',
    expect: 'reject',
    reasons: ['hint_level'],
    output: { ...dx('skip'), next: { kind: 'hint', level: 3 } },
  },
  {
    id: 'final-answer-choice',
    at: 's3',
    expect: 'reject',
    reasons: ['final_answer_early'],
    output: {
      ...dx('reveal'),
      next: {
        kind: 'explain',
        blocks: [
          {
            type: 'tutor_text',
            text: { fr: 'Aucune des deux boules ne porte le numéro 0.' },
          },
        ],
      },
    },
  },
  {
    id: 'final-answer-number',
    at: 's5',
    expect: 'reject',
    reasons: ['final_answer_early'],
    output: {
      ...dx('reveal'),
      next: {
        kind: 'explain',
        blocks: [said('الجواب هو:'), { type: 'math', latex: '3' }],
      },
    },
  },
  {
    id: 'invented-number',
    at: 's5',
    expect: 'reject',
    reasons: ['number_not_allowed'],
    output: {
      ...dx('invent'),
      next: {
        kind: 'explain',
        blocks: [
          said('شوف الكسر هذا:'),
          { type: 'math', latex: '\\frac{5}{12}' },
        ],
      },
    },
  },
  {
    id: 'too-many-blocks',
    at: 's3',
    expect: 'reject',
    reasons: ['too_many_blocks'],
    output: {
      ...dx('long'),
      next: {
        kind: 'explain',
        blocks: [said('أولا.'), said('ثانيا.'), said('ثالثا.'), said('رابعا.')],
      },
    },
  },
  {
    id: 'latex-broken',
    at: 's3',
    expect: 'reject',
    reasons: ['latex_unparseable'],
    output: {
      ...dx('latex'),
      next: {
        kind: 'explain',
        blocks: [said('شوف:'), { type: 'math', latex: '\\frac{1}{' }],
      },
    },
  },
  {
    id: 'component-not-offered',
    at: 's3',
    expect: 'reject',
    reasons: ['component_not_offered'],
    output: {
      ...dx('urn'),
      next: {
        kind: 'show_component',
        component: { component: 'Urn', props: {} },
        instruction: ar('شوف الكور.'),
      },
    },
  },
  {
    id: 'text-too-long',
    at: 's3',
    expect: 'reject',
    reasons: ['text_too_long'],
    output: {
      ...dx('wall'),
      next: {
        kind: 'explain',
        blocks: [said('نحكيو على الحدث العكسي برشا برشا. '.repeat(9))],
      },
    },
  },
  {
    id: 'unknown-deep-dive',
    at: 's3',
    expect: 'reject',
    reasons: ['content:unknown deep dive nope'],
    output: { ...dx('dd'), next: { kind: 'deep_dive', deepDiveId: 'nope' } },
  },
  {
    id: 'digit-inside-arabic',
    at: 's3',
    expect: 'reject',
    output: {
      ...dx('bidi'),
      next: { kind: 'explain', blocks: [said('فمّا 3 تيراجات.')] },
    },
  },
  // Guard fix (a): a later step's answer is not shown yet.
  {
    id: 'later-step-answer',
    at: 's3',
    expect: 'reject',
    reasons: ['number_not_allowed'],
    output: {
      ...dx('later'),
      next: {
        kind: 'explain',
        blocks: [
          said('شوف الاحتمال هذا:'),
          { type: 'math', latex: '\\frac{3}{10}' },
        ],
      },
    },
  },
  // Guard fix (b): task-component answers (2a/s10: X = 0, 7 favorable draws of 10).
  {
    id: 'task-hint',
    at: '2a-s10',
    expect: 'accept',
    output: { ...dx('hint'), next: { kind: 'hint', level: 1 } },
  },
  {
    id: 'task-urn-numbers',
    at: '2a-s10',
    expect: 'accept',
    output: {
      ...dx('urn'),
      next: {
        kind: 'explain',
        blocks: [
          said('كي تكون وحدة من الزوز صفر:'),
          { type: 'math', latex: '0 \\times 2 = 0' },
        ],
      },
    },
  },
  {
    id: 'task-answer-ids',
    at: '2a-s10',
    expect: 'reject',
    reasons: ['final_answer_early'],
    output: {
      ...dx('ids'),
      next: {
        kind: 'explain',
        blocks: [
          { type: 'tutor_text', text: { fr: 'Prends a-b, a-c, b-c et b-d.' } },
        ],
      },
    },
  },
  {
    id: 'task-answer-count',
    at: '2a-s10',
    expect: 'reject',
    reasons: ['final_answer_early'],
    output: {
      ...dx('count'),
      next: {
        kind: 'explain',
        blocks: [said('عددهم:'), { type: 'math', latex: '7' }],
      },
    },
  },
  {
    id: 'task-answer-probability',
    at: '2a-s10',
    expect: 'reject',
    reasons: ['final_answer_early'],
    output: {
      ...dx('prob'),
      next: {
        kind: 'explain',
        blocks: [
          said('الاحتمال:'),
          { type: 'math', latex: 'p(X = 0) = \\frac{7}{10}' },
        ],
      },
    },
  },
  {
    id: 'unknown-action',
    at: 's3',
    expect: 'reject',
    output: { ...dx('x'), next: { kind: 'self_destruct' } },
  },
];

const loaded = (() => {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  return r.loaded;
})();

/** Rules-driven path to a wrong answer on 1.b s3 / s5 or 2.a s10 (EventPicker). */
export function fixtureSituation(at: Where): {
  content: LessonContent;
  situation: Situation;
} {
  const content = buildContent(loaded, at === '2a-s10' ? '2a' : '1b');
  const log = new EventLog(
    {
      sessionId: 'fx',
      studentId: 'fx',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const rules = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state = start.state;
  const act = (a: LessonAction) => {
    state = stepSync(content, state, a, log, rules);
  };
  // The fixed test clock makes correct answers look too fast: a self-report card.
  const dismissSelfReport = () => {
    const last = state.items[state.items.length - 1];
    if (last?.kind === 'choice_card' && last.status === 'open') {
      act({
        type: 'card_choice',
        purpose: last.purpose,
        choice: 'dismissed',
        at: 1000,
      });
    }
  };
  if (at === 's5') {
    act({ type: 'answer', value: { optionId: 'none' }, at: 1000 });
    dismissSelfReport();
    act({ type: 'answer', value: { raw: '4' }, at: 2000 });
  } else if (at === '2a-s10') {
    act({ type: 'answer', value: { raw: '10' }, at: 1000 });
    dismissSelfReport();
    act({ type: 'answer', value: { optionId: 'ok' }, at: 2000 });
    dismissSelfReport();
    act({
      type: 'component_result',
      correct: false,
      details: { selected: ['a-b'] },
      at: 3000,
    });
  } else {
    act({ type: 'answer', value: { optionId: 'one' }, at: 1000 });
  }
  // Situation at the last decision point (the wrong answer).
  const events = log.all();
  const lastWrong = events
    .map(e => e.t === 'answer' && !e.correct)
    .lastIndexOf(true);
  const situation = buildSituation(
    events.slice(0, lastWrong + 1),
    content.catalog,
  );
  if (!situation) {
    throw new Error(`no situation at ${at}`);
  }
  return { content, situation };
}

export interface GuardRow {
  id: string;
  at: string;
  expected: 'accept' | 'reject';
  verdict: 'accept' | 'reject';
  outcome: string;
  reasons: string[];
  asExpected: boolean;
}

export async function runGuardFixtures(
  fixtures: readonly GuardFixture[] = GUARD_FIXTURES,
): Promise<GuardRow[]> {
  const rows: GuardRow[] = [];
  for (const f of fixtures) {
    const { content, situation } = fixtureSituation(f.at);
    const client = createFakeClient({ plan: () => ({ value: f.output }) });
    const { decision, record } = await consultWith(client, content, situation, {
      requestId: `fx-${f.id}`,
      timeoutMs: 1000,
    });
    const verdict = decision ? 'accept' : 'reject';
    const reasons =
      record.reasons ?? (record.outcome === 'ok' ? [] : [record.outcome]);
    rows.push({
      id: f.id,
      at: f.at,
      expected: f.expect,
      verdict,
      outcome: record.outcome,
      reasons,
      asExpected:
        verdict === f.expect &&
        (f.reasons ?? []).every(r => reasons.includes(r)),
    });
  }
  return rows;
}

export function formatGuardRows(rows: readonly GuardRow[]): string {
  const lines = [
    '| fixture | step | expected | verdict | outcome | reasons | ok |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| ${r.id} | ${r.at} | ${r.expected} | ${r.verdict} | ${
          r.outcome
        } | ${r.reasons.join(', ')} | ${r.asExpected ? 'yes' : 'NO'} |`,
    ),
  ];
  const rejected = rows.filter(r => r.verdict === 'reject');
  const tally = new Map<string, number>();
  for (const r of rejected) {
    for (const reason of r.reasons) {
      tally.set(reason, (tally.get(reason) ?? 0) + 1);
    }
  }
  lines.push(
    '',
    `rejected ${rejected.length}/${rows.length} (${Math.round(
      (100 * rejected.length) / Math.max(1, rows.length),
    )}%); valid fixtures wrongly rejected: ${
      rows.filter(r => r.expected === 'accept' && r.verdict === 'reject').length
    }; invalid fixtures wrongly accepted: ${
      rows.filter(r => r.expected === 'reject' && r.verdict === 'accept').length
    }`,
    `reasons: ${
      [...tally.entries()].map(([k, v]) => `${k} ${v}`).join(', ') || '-'
    }`,
  );
  return lines.join('\n');
}
