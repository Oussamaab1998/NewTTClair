/**
 * The AI teacher (src/ai/teacher): its prompt rules, the checks of an answer,
 * the call with a fake transport (never a real call), its allowance, the
 * glossary's free answers and the free stand-in.
 */
import { CATALOG } from '../../app/exercises';
import type { GlossaryEntry } from '../../content/help/schema';
import { questionCtx, startQuestion } from '../../hybrid/conductor/conductor';
import '../../method/library';
import { memoryLedger } from '../../planner/llm/costCap';
import { memoryStore } from '../../storage/kv';
import { AI_MODELS, AI_PRICES } from '../config';
import { bannedSentence } from '../prompt/lexicon';
import type { MessagesTransport, SendResult } from '../transport/messagesApi';
import type {
  ContentBlock,
  MessagesRequest,
  ToolResultBlock,
} from '../transport/wire';
import {
  storeTeacherAllowance,
  teacherAllowance,
  TEACHER_EXPECTED_USD,
  TEACHER_SPEND_KEY,
} from './allowance';
import { arabiziNotes } from './arabizi';
import { CANNED_ANSWER, cannedTeacher } from './canned';
import { teacherContext } from './context';
import { glossaryAnswer, isFrenchWords, pickEntry } from './glossary';
import { TEACHER_PROMPT, teacherBannedIn, teacherUserText } from './prompt';
import {
  createTeacher,
  liveTeacher,
  noTeacher,
  teacherBody,
  DEFAULT_TEACHER_CONFIG,
} from './teacher';
import {
  TEACHER_TOOL,
  teacherToolDefinition,
  type TeacherBlockIn,
} from './tool';
import type { TeacherRequest } from './types';
import { cutTrailingQuestion, verifyTeacher } from './verify';

const TREE = 'bac2022p-sc-ex2';
const entry = CATALOG.find(e => e.id === TREE)!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const treeCtx = () => questionCtx(loaded!, entry.raw as never, 't1');

function t1Context() {
  const ctx = treeCtx();
  return teacherContext(ctx, startQuestion(ctx));
}

const ask = (
  question: string,
  over: Partial<TeacherRequest> = {},
): TeacherRequest => ({
  mode: 'ask',
  question,
  pressed: null,
  context: null,
  general: false,
  history: [],
  ...over,
});

const GOOD: TeacherBlockIn[] = [
  { type: 'ar', text: 'هذا احتمال الزوز مع بعض.' },
  { type: 'math', latex: 'p(A \\cap F)' },
  { type: 'fr', text: '« p de A inter F »' },
  { type: 'ar', text: 'مثال: قسم فيه خمسة وعشرين تلميذ.' },
  { type: 'math', latex: 'p(A \\cap F) = \\frac{3}{25}' },
];

// ---------------------------------------------------------------------------
// The fake transport: scripted answers, every request kept.

const usage = {
  input: 900,
  cacheRead: 1_400,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 1_100,
};

function reply(content: ContentBlock[], stopReason = 'tool_use'): SendResult {
  return {
    ok: true,
    latencyMs: 5,
    attempts: 1,
    response: {
      id: 'msg',
      model: AI_MODELS.sonnet,
      content,
      stopReason,
      refusalCategory: null,
      usage,
    },
  };
}

const answerCall = (blocks: unknown, id = 'tu1'): ContentBlock => ({
  type: 'tool_use',
  id,
  name: TEACHER_TOOL,
  input: { blocks },
});

function fake(script: SendResult[]): {
  transport: MessagesTransport;
  sent: MessagesRequest[];
} {
  const sent: MessagesRequest[] = [];
  return {
    sent,
    transport: {
      send: async body => {
        sent.push(JSON.parse(JSON.stringify(body)) as MessagesRequest);
        const next = script.shift();
        if (!next) {
          throw new Error('no more scripted answers');
        }
        return next;
      },
    },
  };
}

const allowance = (dailyUsd = 0.2) =>
  teacherAllowance({ ledger: memoryLedger(), dailyUsd });

// ---------------------------------------------------------------------------

describe('the teacher prompt', () => {
  it('asks for a whole answer that never ends with a question', () => {
    expect(TEACHER_PROMPT).toContain('Answer it fully and directly');
    expect(TEACHER_PROMPT).toContain('Never end with a question');
    expect(TEACHER_PROMPT).toContain('read aloud in French');
    expect(TEACHER_PROMPT).toContain('numbers of your own');
    // Not the lesson's move rule.
    expect(TEACHER_PROMPT).not.toMatch(/exactly one question/i);
  });

  it('holds the Tunisian word lists, Arabizi and the right-to-left rules', () => {
    expect(TEACHER_PROMPT).toContain(bannedSentence());
    for (const w of [
      '«هل»',
      '«مزيان»',
      '«دوك»',
      '«هاذا»',
      '«بس»',
      '«لكن»',
      '«الاتنين»',
    ]) {
      expect(TEACHER_PROMPT).toContain(w);
    }
    expect(TEACHER_PROMPT).toContain('"inter" = ∩');
    expect(TEACHER_PROMPT).toContain('"chnwa" = شنوّة');
    expect(TEACHER_PROMPT).toContain('No Latin letters, no digits');
    expect(TEACHER_PROMPT).toContain('never \\mid');
  });

  it('answers any bac maths, declines the rest, never gives a step he has not done', () => {
    expect(TEACHER_PROMPT).toContain('about his exercise or not');
    expect(TEACHER_PROMPT).toContain('Not maths');
    expect(TEACHER_PROMPT).toContain(
      'Never write one of those values, nor the calculation that gives it',
    );
    expect(TEACHER_PROMPT).toContain('Never say whether his result');
  });

  it('builds the user message from the context, the last turns and his question', () => {
    const context = t1Context();
    const text = teacherUserText(
      ask('Ma fhmtch P(AinterF)', {
        context,
        history: [
          { his: 'a', answer: 'b' },
          { his: 'c', answer: 'd' },
          { his: 'e', answer: 'f' },
          { his: 'g', answer: 'h' },
        ],
      }),
    );
    expect(text).toContain('# His exercise');
    expect(text).toContain(`Exercise ${TREE}`);
    expect(text).toContain('Values he has not found yet');
    expect(text).toContain('His question (verbatim): «Ma fhmtch P(AinterF)»');
    // The last three turns only.
    expect(text).not.toContain('«a»');
    expect(text).toContain('- He: «g»');
    expect(text).toContain(`Answer with one ${TEACHER_TOOL} call.`);
  });

  it('keeps the values hidden in a general question, and says what was long-pressed', () => {
    const context = t1Context();
    const general = teacherUserText(
      ask('شنوّة معناها؟', { context, general: true, pressed: 'p(A \\cap F)' }),
    );
    expect(general).not.toContain('# His exercise');
    expect(general).toContain('General question');
    expect(general).toContain('Values he has not found yet');
    expect(general).toContain(
      'He long-pressed «p(A \\cap F)» in the lesson and chose «شنوّة معناها؟».',
    );
    const simpler = teacherUserText({ ...ask(''), mode: 'simpler' });
    expect(simpler).toContain('«مازال ما فهمتش»');
    expect(teacherUserText(ask('x'))).toContain('no exercise is open');
  });

  it('finds the teacher’s own banned words as whole words only', () => {
    expect(teacherBannedIn('هل فهمت').map(b => b.word)).toEqual(['هل']);
    expect(teacherBannedIn('وبس')).toHaveLength(1);
    expect(teacherBannedIn('هلبة تلامذة يلبسو، لبس مرايات')).toEqual([]);
    expect(teacherBannedIn('هاذا الكسر').map(b => b.word)).toEqual(['هاذا']);
  });
});

describe('verifyTeacher', () => {
  it('accepts a darija answer with its formulas apart and French words isolated', () => {
    const r = verifyTeacher(
      [...GOOD, { type: 'ar', text: 'هذي probabilité متاع الطريق الكل.' }],
      t1Context().verify,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.blocks[5]).toEqual({
        type: 'ar',
        runs: expect.arrayContaining([{ fr: 'probabilité' }]),
      });
    }
  });

  it('refuses a value of a step he has not done (the spoiler), and its calculation', () => {
    const c = t1Context().verify;
    const value = verifyTeacher(
      [GOOD[0]!, { type: 'math', latex: 'p(A \\cap F) = \\frac{1}{6}' }],
      c,
    );
    expect(value).toMatchObject({ ok: false });
    expect(!value.ok && value.reasons.join()).toContain('1/6');
    const road = verifyTeacher(
      [GOOD[0]!, { type: 'math', latex: '\\frac{2}{3} \\times \\frac{1}{4}' }],
      c,
    );
    expect(road).toMatchObject({ ok: false });
    expect(!road.ok && road.reasons.join()).toContain('calculation of');
    // Without the open question, the same numbers are only an example.
    expect(
      verifyTeacher(
        [
          GOOD[0]!,
          {
            type: 'math',
            latex: '\\frac{2}{3} \\times \\frac{1}{4} = \\frac{1}{6}',
          },
        ],
        null,
      ).ok,
    ).toBe(true);
  });

  it('refuses Latin letters, digits or a formula inside an Arabic sentence', () => {
    for (const text of ['الحدث A صار', 'نضربو الكسر في 3', 'هذا p(A) متاعنا']) {
      const r = verifyTeacher([{ type: 'ar', text }], null);
      expect(r).toMatchObject({ ok: false });
    }
  });

  it('refuses a false equality and words in a formula', () => {
    const wrong = verifyTeacher(
      [GOOD[0]!, { type: 'math', latex: '\\frac{3}{25} = \\frac{1}{8}' }],
      null,
    );
    expect(wrong).toMatchObject({ ok: false });
    expect(!wrong.ok && wrong.reasons.join()).toContain('is false');
    const words = verifyTeacher(
      [GOOD[0]!, { type: 'math', latex: '3 \\text{ people in } A \\cap F' }],
      null,
    );
    expect(words).toMatchObject({ ok: false });
    expect(!words.ok && words.reasons.join()).toContain('"people"');
  });

  it('cuts a question at the end, and refuses an answer that is only a question', () => {
    const r = verifyTeacher(
      [...GOOD, { type: 'ar', text: 'هذا هو المعنى. تحب مثال آخر؟' }],
      null,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const last = r.blocks[r.blocks.length - 1]!;
      expect(last.type === 'ar' && last.runs).toEqual([
        { ar: 'هذا هو المعنى.' },
      ]);
    }
    expect(
      cutTrailingQuestion([GOOD[0]!, { type: 'ar', text: 'فهمت؟' }]),
    ).toEqual([GOOD[0]]);
    expect(
      verifyTeacher([{ type: 'ar', text: 'شنوّة تعرف على الكسر؟' }], null),
    ).toMatchObject({ ok: false });
    // A blank to fill is a question too.
    expect(
      verifyTeacher([GOOD[0]!, { type: 'math', latex: 'p(A) = ?' }], null),
    ).toMatchObject({ ok: false });
  });

  it('refuses the words the owner does not want', () => {
    const r = verifyTeacher(
      [{ type: 'ar', text: 'لكن المعنى موش كيف كيف.' }],
      null,
    );
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.reasons.join()).toContain('«لكن»');
    expect(
      verifyTeacher([{ type: 'ar', text: 'نجبدو جوج كور.' }], null),
    ).toMatchObject({ ok: false });
  });

  it('passes its own stand-in answer on every question of the four exercises', () => {
    expect(verifyTeacher(CANNED_ANSWER, null).ok).toBe(true);
    let checked = 0;
    for (const e of CATALOG) {
      const l = e.result.ok ? e.result.loaded : null;
      const parts = (l?.exercise as { parts?: { id: string }[] } | undefined)
        ?.parts;
      for (const q of parts?.map(x => x.id) ?? []) {
        let ctx;
        try {
          ctx = questionCtx(l!, e.raw as never, q);
        } catch {
          continue;
        }
        const c = teacherContext(ctx, startQuestion(ctx));
        expect({ q, ok: verifyTeacher(CANNED_ANSWER, c.verify).ok }).toEqual({
          q,
          ok: true,
        });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(15);
  });
});

describe('teacherContext', () => {
  it('reads the statement, the question, the step and the values he has not found', () => {
    const c = t1Context();
    expect(c.exerciseId).toBe(TREE);
    expect(c.questionId).toBe('t1');
    expect(c.text).toContain('Statement (exam French):');
    expect(c.text).toContain('Question (exam French):');
    expect(c.hidden.join()).toContain('1/6');
    // The figure's given numbers are not hidden.
    expect(c.hidden.join()).not.toMatch(/[=] 2\/3\b/);
  });
});

describe('the call', () => {
  it('sends Sonnet, effort low, the tool and the cached rules, then shows a checked answer', async () => {
    const f = fake([reply([answerCall(GOOD)])]);
    const a = allowance();
    const r = await createTeacher({ transport: f.transport, allowance: a })(
      ask('chnwa P(AinterF)', { context: t1Context() }),
    );
    expect(r.ok).toBe(true);
    expect(f.sent).toHaveLength(1);
    const body = f.sent[0]!;
    expect(body.model).toBe(AI_MODELS.sonnet);
    expect(body.output_config).toEqual({ effort: 'low' });
    expect(body.thinking).toEqual({ type: 'adaptive' });
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.fallbacks).toBe('default');
    expect(body.tools.map(t => t.name)).toEqual([TEACHER_TOOL]);
    expect(body.system).toEqual([
      {
        type: 'text',
        text: TEACHER_PROMPT,
        cache_control: { type: 'ephemeral', ttl: '1h' },
      },
    ]);
    expect(JSON.stringify(body.messages)).toContain('chnwa P(AinterF)');
    // Charged its real cost.
    expect(r.ok && r.answer.costUsd).toBeCloseTo(a.spent(), 10);
    expect(a.spent()).toBeGreaterThan(0);
  });

  it('sends a refused answer back once with the reasons, then shows the fixed one', async () => {
    const f = fake([
      reply([answerCall([{ type: 'ar', text: 'الحدث A و 3 تلامذة' }])]),
      reply([answerCall(GOOD, 'tu2')]),
    ]);
    const r = await createTeacher({
      transport: f.transport,
      allowance: allowance(),
    })(ask('?'));
    expect(r.ok).toBe(true);
    const retry = f.sent[1]!.messages;
    const last = retry[retry.length - 1]!.content as ToolResultBlock[];
    expect(last[0]).toMatchObject({
      type: 'tool_result',
      tool_use_id: 'tu1',
      is_error: true,
    });
    expect(last[0]!.content).toContain('Not shown to the student');
  });

  it('gives up after a second refusal (the screen says the teacher could not answer)', async () => {
    const bad = [{ type: 'math', latex: '3 \\text{ people}' }];
    const f = fake([reply([answerCall(bad)]), reply([answerCall(bad, 'tu2')])]);
    const logs: string[][] = [];
    const r = await createTeacher({
      transport: f.transport,
      allowance: allowance(),
      onCall: l => logs.push(l.rejected),
    })(ask('x'));
    expect(r).toEqual({ ok: false, reason: 'failed' });
    expect(f.sent).toHaveLength(2);
    expect(logs).toHaveLength(2);
  });

  it('asks again for the tool after plain text, and fails on a transport error or a refusal', async () => {
    const f = fake([
      reply([{ type: 'text', text: 'hello' }], 'end_turn'),
      reply([answerCall(GOOD)]),
    ]);
    expect(
      (
        await createTeacher({ transport: f.transport, allowance: allowance() })(
          ask('x'),
        )
      ).ok,
    ).toBe(true);
    const down = fake([
      {
        ok: false,
        error: 'network',
        retryable: true,
        latencyMs: 1,
        attempts: 3,
      },
    ]);
    expect(
      await createTeacher({
        transport: down.transport,
        allowance: allowance(),
      })(ask('x')),
    ).toEqual({ ok: false, reason: 'failed' });
    const refused = fake([reply([], 'refusal')]);
    expect(
      await createTeacher({
        transport: refused.transport,
        allowance: allowance(),
      })(ask('x')),
    ).toEqual({ ok: false, reason: 'failed' });
  });

  it('makes no call once the day’s allowance is spent', async () => {
    const f = fake([]);
    const a = allowance(TEACHER_EXPECTED_USD / 2);
    expect(
      await createTeacher({ transport: f.transport, allowance: a })(ask('x')),
    ).toEqual({
      ok: false,
      reason: 'spent',
    });
    expect(f.sent).toHaveLength(0);
  });

  it('keeps a byte-stable prefix (the tool and the rules)', () => {
    const one = teacherBody(DEFAULT_TEACHER_CONFIG, []);
    const two = teacherBody(DEFAULT_TEACHER_CONFIG, []);
    expect(JSON.stringify([one.tools, one.system])).toBe(
      JSON.stringify([two.tools, two.system]),
    );
    expect(teacherToolDefinition()).toBe(teacherToolDefinition());
  });

  it('costs about a cent and a half an answer (prices of src/ai/config.ts)', () => {
    const p = AI_PRICES[AI_MODELS.sonnet]!;
    // The cached prefix: the tool and the rules, about 3.5 characters a token.
    const prefixTokens = Math.ceil(
      (JSON.stringify(teacherToolDefinition()).length + TEACHER_PROMPT.length) /
        3.5,
    );
    expect(prefixTokens).toBeGreaterThan(512); // Sonnet 5.5 caches from 512 tokens.
    expect(prefixTokens).toBeLessThan(2_200);
    expect(TEACHER_EXPECTED_USD).toBeLessThan(0.02);
    // A cold call writes the prefix to the 1-hour cache once.
    const cold =
      TEACHER_EXPECTED_USD +
      (prefixTokens * (p.cacheWrite1h - p.cacheRead)) / 1e6;
    expect(cold).toBeLessThan(0.025);
  });
});

describe('the allowance', () => {
  it('keeps the day’s spend under teacher.spend.v1 and starts again the next day', () => {
    const store = memoryStore();
    let day = '2026-11-18';
    const a = storeTeacherAllowance(store, { today: () => day });
    expect(a.permits()).toBe(true);
    a.add(0.19);
    expect(JSON.parse(store.getString(TEACHER_SPEND_KEY)!)).toEqual({
      day,
      usd: 0.19,
    });
    expect(a.permits()).toBe(false);
    day = '2026-11-19';
    expect(a.permits()).toBe(true);
    a.add(Number.NaN);
    expect(a.spent()).toBe(0);
  });
});

describe('the glossary answers', () => {
  const entries: GlossaryEntry[] = [
    {
      id: 'inter',
      match: ['p(A \\cap F)'],
      meaning: [{ ar: [{ ar: 'الزوز مع بعض: طريق كامل في الشجرة.' }] }],
      reading: 'p de A inter F',
      use: [{ ar: [{ ar: 'نستعملوها باش نحسبو الطريق.' }] }],
    },
    {
      id: 'montrer',
      match: ['Montrer que'],
      meaning: [{ ar: [{ ar: 'نوريو باللي الحاجة صحيحة.' }] }],
    },
  ];

  it('answers meaning, reading and use from the entry, free', () => {
    const e = entries[0]!;
    expect(glossaryAnswer(e, 'meaning')).toEqual([
      { type: 'ar', runs: [{ ar: 'الزوز مع بعض: طريق كامل في الشجرة.' }] },
      { type: 'fr', text: '« p de A inter F »' },
    ]);
    expect(glossaryAnswer(e, 'reading')?.[0]).toEqual({
      type: 'fr',
      text: '« p de A inter F »',
    });
    expect(glossaryAnswer(e, 'use')).toEqual([
      { type: 'ar', runs: [{ ar: 'نستعملوها باش نحسبو الطريق.' }] },
    ]);
    expect(glossaryAnswer(e, 'own')).toBeNull();
  });

  it('leaves to the AI what the entry does not hold', () => {
    const e = entries[1]!;
    expect(glossaryAnswer(e, 'reading')).toBeNull();
    expect(glossaryAnswer(e, 'use')).toBeNull();
    expect(glossaryAnswer(e, 'meaning')).toHaveLength(1);
  });

  it('picks the entry he chose, or the only one', () => {
    expect(pickEntry(entries, 'montrer')?.id).toBe('montrer');
    expect(pickEntry(entries, null)).toBeNull();
    expect(pickEntry([entries[0]!], null)?.id).toBe('inter');
    expect(pickEntry(entries, 'nope')).toBeNull();
  });

  it('tells French words from formulas', () => {
    expect(isFrenchWords('Montrer que')).toBe(true);
    expect(isFrenchWords('Recopier et compléter')).toBe(true);
    expect(isFrenchWords('p(A \\cap F)')).toBe(false);
    expect(isFrenchWords('A')).toBe(false);
  });
});

describe('the stand-ins', () => {
  it('-devTeacher canned answers with the checked example, no call, nothing spent', async () => {
    jest.useFakeTimers();
    try {
      const store = memoryStore();
      const ai = liveTeacher({ store, apiKey: 'k', devTeacher: 'canned' });
      const p = ai(ask('x', { context: t1Context() }));
      jest.advanceTimersByTime(2_000);
      const r = await p;
      expect(r.ok && r.answer.source).toBe('canned');
      expect(store.getString(TEACHER_SPEND_KEY)).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops when the screen aborts', async () => {
    const ac = new AbortController();
    const p = cannedTeacher(10_000)(ask('x'), ac.signal);
    ac.abort();
    expect(await p).toEqual({ ok: false, reason: 'failed' });
  });

  it('without a key there is no teacher (glossary answers still work)', async () => {
    expect(liveTeacher({ store: memoryStore(), apiKey: '' })).toBe(noTeacher);
    expect(await noTeacher(ask('x'))).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('arabiziNotes', () => {
  it('says what it read in his Latin words', () => {
    expect(arabiziNotes('Ma fhmtch P(AinterF) wel union')).toEqual([
      { word: 'inter', symbol: '∩' },
      { word: 'union', symbol: '∪' },
    ]);
    expect(arabiziNotes('intervalle')).toEqual([]);
  });
});
