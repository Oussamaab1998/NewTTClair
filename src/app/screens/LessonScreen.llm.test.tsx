import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import type { LessonLlm } from '../../lesson/useLesson';
import {
  createFakeClient,
  type FakeAnswer,
} from '../../planner/llm/plannerClient';
import { createLlmRuntime } from '../../planner/llm/runtime';
import { memoryStore } from '../../storage/kv';
import { EventSchema, type Event } from '../../telemetry/events';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LocalQueue } from '../../telemetry/reports';
import { setDevTools } from '../devFlags';
import { LessonScreen } from './LessonScreen';

let log: EventLog;

/** A planner answer the test releases by hand. */
function deferred() {
  let resolve!: (a: FakeAnswer) => void;
  const promise = new Promise<FakeAnswer>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

const hint1 = {
  diagnosis: {
    skillIds: ['complement-event'],
    misconceptionIds: [],
    confidence: 0.6,
    summary: 'llm',
  },
  avoid: [],
  next: { kind: 'hint', level: 1 },
};

function wiring(
  plan: () => FakeAnswer | Promise<FakeAnswer>,
  o: {
    cap?: number;
    timeoutMs?: number;
    kill?: boolean;
    tutor?: () => FakeAnswer | Promise<FakeAnswer>;
  } = {},
): LessonLlm {
  const runtime = createLlmRuntime({
    client: createFakeClient({
      model: 'gpt-6-luna',
      plan,
      ...(o.tutor && { tutor: o.tutor }),
    }),
    store: memoryStore(),
    dailyCap: o.cap ?? 10,
  });
  if (o.kill) {
    runtime.flags.setKillSwitch(true);
  }
  let n = 0;
  return {
    runtime,
    newRequestId: () => `req-${++n}`,
    timeoutMs: o.timeoutMs ?? 5000,
    consultAll: true,
  };
}

let queue: LocalQueue;

async function renderLesson(llm: LessonLlm) {
  queue = new LocalQueue(memoryStore());
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart="1b"
        clock={fixedClock()}
        queue={queue}
        llm={llm}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}

const tap = (id: string) => fireEvent.press(screen.getAllByTestId(id).at(-1)!);
const of = <T extends Event['t']>(t: T) =>
  log.all().filter((e): e is Extract<Event, { t: T }> => e.t === t);
const flush = () => act(async () => {});

describe('provisional rules, then the LLM (lesson screen, fake client)', () => {
  it('shows the rules answer with "..." at once, then swaps in the LLM answer when the student did nothing', async () => {
    const d = deferred();
    await renderLesson(wiring(() => d.promise));
    await tap('option-one'); // wrong: a decision point
    expect(screen.getByTestId('feed-thinking')).toBeOnTheScreen();
    // The provisional answer is not logged yet.
    expect(of('plan')).toHaveLength(0);
    d.resolve({ value: hint1 });
    await flush();
    expect(screen.queryByTestId('feed-thinking')).toBeNull();
    expect(of('plan')).toMatchObject([
      {
        shownSource: 'llm',
        decision: { source: 'llm', next: { kind: 'hint', level: 1 } },
      },
    ]);
    expect(of('plan')[0]!.decision.llmRequestId).toBe('req-1');
    expect(of('llm_call')).toMatchObject([
      {
        requestId: 'req-1',
        purpose: 'plan',
        outcome: 'ok',
        statusClass: '2xx',
      },
    ]);
    expect(screen.getByTestId('hint-1')).toBeOnTheScreen();
    for (const e of log.all()) {
      expect(EventSchema.safeParse(e).success).toBe(true);
    }
  });

  it('the student acts first: the rules answer stays, the late LLM answer is stale', async () => {
    const d = deferred();
    await renderLesson(wiring(() => d.promise));
    await tap('option-one');
    await tap('option-two'); // acts on the provisional screen
    expect(of('plan')[0]).toMatchObject({
      shownSource: 'rules',
      decision: { source: 'rules' },
    });
    d.resolve({ value: hint1 });
    await flush();
    // The first call is stale; the second tap was a new decision point (its own call).
    expect(of('llm_call')[0]).toMatchObject({
      requestId: 'req-1',
      outcome: 'stale',
    });
    expect(of('plan')[0]!.decision.source).toBe('rules');
  });

  it('the student scrolls first: no swap', async () => {
    const d = deferred();
    await renderLesson(wiring(() => d.promise));
    await tap('option-one');
    await fireEvent(screen.getByTestId('lesson-feed'), 'scrollBeginDrag');
    expect(screen.queryByTestId('feed-thinking')).toBeNull();
    d.resolve({ value: hint1 });
    await flush();
    expect(of('plan')[0]).toMatchObject({ shownSource: 'rules' });
    expect(of('llm_call')[0]).toMatchObject({ outcome: 'stale' });
  });

  it('an invalid answer, an error or a timeout keeps the rules answer, silently', async () => {
    const cases: [
      () => FakeAnswer | Promise<FakeAnswer>,
      string,
      Partial<{ timeoutMs: number }>,
    ][] = [
      [
        () => ({ value: { ...hint1, next: { kind: 'hint', level: 3 } } }),
        'rejected',
        {},
      ],
      [() => ({ error: 'no_credit', status: 429 }), 'no_credit', {}],
      [() => new Promise<FakeAnswer>(() => {}), 'timeout', { timeoutMs: 20 }],
    ];
    for (const [plan, outcome, o] of cases) {
      await renderLesson(wiring(plan, o));
      await tap('option-one');
      await act(async () => {
        await new Promise(r => setTimeout(r, 40));
      });
      expect(of('llm_call')[0]).toMatchObject({ outcome });
      expect(of('plan')[0]).toMatchObject({
        shownSource: 'rules',
        decision: { source: 'fallback' },
      });
      expect(screen.queryByTestId('feed-thinking')).toBeNull();
      // Nothing about the AI, errors or credit is shown to the student.
      const visible = JSON.stringify(screen.toJSON());
      for (const word of ['credit', 'AI', 'IA', 'الذكاء', 'رصيد', 'خطأ']) {
        expect(visible).not.toContain(word);
      }
    }
  });

  it('kill switch and daily cap: rules at once, the skipped call is logged', async () => {
    await renderLesson(wiring(() => ({ value: hint1 }), { kill: true }));
    await tap('option-one');
    expect(screen.queryByTestId('feed-thinking')).toBeNull();
    expect(of('llm_call')).toMatchObject([
      { outcome: 'disabled', statusClass: 'none' },
    ]);
    expect(of('plan')[0]!.decision.source).toBe('rules');

    await renderLesson(wiring(() => ({ value: hint1 }), { cap: 0 }));
    await tap('option-one');
    await flush();
    expect(of('llm_call')).toMatchObject([{ outcome: 'capped' }]);
    expect(of('plan')[0]).toMatchObject({
      shownSource: 'rules',
      decision: { source: 'fallback' },
    });
  });
});

describe('tutor drawer (fake client)', () => {
  const ask = async (text: string) => {
    await fireEvent.changeText(screen.getByTestId('ask-input'), text);
    await tap('ask-send');
  };

  it('shows checked AI blocks with their label, the caution mark and a Report button; the report points to the request', async () => {
    const d = deferred();
    await renderLesson(
      wiring(() => ({ value: hint1 }), { tutor: () => d.promise }),
    );
    await ask('كيفاش نحسب الاحتمال؟');
    expect(screen.getByTestId('tutor-loading')).toBeOnTheScreen();
    d.resolve({
      value: {
        blocks: [
          {
            type: 'text',
            text: { ar: [{ ar: 'نقسمو الحالات الملائمة على الحالات الكل.' }] },
          },
          { type: 'math', latex: 'p(X = 0) = \\frac{5}{12}' },
        ],
        needsTeacher: false,
      },
    });
    await flush();
    expect(screen.queryByTestId('tutor-loading')).toBeNull();
    expect(screen.getByTestId('tutor-caution-1')).toHaveTextContent(
      /ممكن فيه غلط/,
    );
    expect(screen.getAllByTestId(/^trust-tutor-/)[0]).toHaveTextContent(
      /مولّد بالذكاء الاصطناعي، ممكن يكون فيه غلط/,
    );
    expect(of('tutor_answer')).toMatchObject([
      { source: 'ai', blocks: 2, mathUnverified: 1, requestId: 'req-1' },
    ]);
    expect(of('llm_call')).toMatchObject([{ purpose: 'tutor', outcome: 'ok' }]);
    expect(of('ask')).toMatchObject([{ via: 'field', source: 'ai' }]);

    await tap('block-report-tutor-0');
    await tap('report-reason-wrong_math');
    await tap('report-send');
    expect(of('report')).toMatchObject([
      { source: 'ai', blockId: 'ai:req-1:0', reason: 'wrong_math' },
    ]);
    const entry = queue.all().find(e => e.kind === 'report');
    expect(entry?.kind === 'report' && entry.context.llmRequestId).toBe(
      'req-1',
    );
    await tap('report-continue');
    await tap('tutor-understood');
    expect(of('component_event').at(-1)).toMatchObject({
      component: 'TutorDrawer',
      name: 'understood',
    });
  });

  it('a failing LLM: the neutral saved line only, and the question is queued', async () => {
    await renderLesson(
      wiring(() => ({ value: hint1 }), {
        tutor: () => ({ error: 'no_credit', status: 429 }),
      }),
    );
    await ask('سؤال ما فماش جواب عليه في الدرس؟');
    await flush();
    expect(screen.getByTestId('tutor-saved')).toHaveTextContent('سؤالك تسجّل.');
    const drawer = JSON.stringify(screen.getByTestId('tutor-drawer'));
    for (const word of ['credit', 'IA', 'الذكاء', 'رصيد', 'خطأ']) {
      expect(drawer).not.toContain(word);
    }
    expect(of('llm_call')).toMatchObject([
      { purpose: 'tutor', outcome: 'no_credit', statusClass: '4xx' },
    ]);
    expect(queue.all()).toMatchObject([
      { kind: 'question', text: 'سؤال ما فماش جواب عليه في الدرس؟' },
    ]);
  });
});

describe('dev status line (behind the dev flag only)', () => {
  afterEach(() => act(() => setDevTools(false)));

  it('shows mode, last outcome and the cap; a tap toggles the kill switch', async () => {
    const llm = wiring(() => ({ value: hint1 }));
    await renderLesson(llm);
    expect(screen.queryByTestId('llm-status')).toBeNull();
    await act(async () => setDevTools(true));
    expect(screen.getByTestId('llm-status')).toHaveTextContent(
      /llm \(fake:gpt-6-luna\)/,
    );
    await tap('option-one');
    await flush();
    expect(screen.getByTestId('llm-status')).toHaveTextContent(/plan ok 2xx/);
    expect(screen.getByTestId('llm-status')).toHaveTextContent(/9\/10/);
    await tap('llm-status');
    expect(screen.getByTestId('llm-status')).toHaveTextContent(
      /rules_only \(kill_switch\)/,
    );
  });
});
