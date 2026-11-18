import '../../../../i18n';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { GlossaryEntry } from '../../../../content/help/schema';
import { CATALOG } from '../../../exercises';
import {
  questionCtx,
  startQuestion,
} from '../../../../hybrid/conductor/conductor';
import '../../../../method/library';
import type {
  TeacherAi,
  TeacherBlock,
  TeacherRequest,
  TeacherResult,
} from '../../../../ai/teacher/types';
import { TeacherScreen } from './TeacherScreen';
import { coveredBy, keyboardTop } from './useKeyboardInset';
import { insertKey, latexToTyped, MATH_KEYS } from './typed';
import type { AskRequest } from './types';

const mockEntries: GlossaryEntry[] = [
  {
    id: 'inter',
    match: ['p(A \\cap F)'],
    meaning: [{ ar: [{ ar: 'الزوز مع بعض: طريق كامل في الشجرة.' }] }],
    reading: 'p de A inter F',
  },
];
jest.mock('../../../../content/help/help', () => ({
  glossaryMatches: (_ex: string, pressed: string) =>
    mockEntries.filter(e =>
      e.match.some(m => m.replace(/\s+/g, '') === pressed.replace(/\s+/g, '')),
    ),
  helpFor: () => ({ glossary: mockEntries }),
}));

const TREE = 'bac2022p-sc-ex2';
const entry = CATALOG.find(e => e.id === TREE)!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const question = () => {
  const ctx = questionCtx(loaded!, entry.raw as never, 't1');
  return { ctx, state: startQuestion(ctx) };
};

const BLOCKS: TeacherBlock[] = [
  {
    type: 'ar',
    runs: [
      { ar: 'هذا احتمال الزوز مع بعض، طريق كامل في الشجرة من البداية للآخر.' },
    ],
  },
  { type: 'math', latex: 'p(A \\cap F)' },
  { type: 'fr', text: '« p de A inter F »' },
  {
    type: 'ar',
    runs: [{ ar: 'مثال: قسم فيه خمسة وعشرين تلميذ، وثلاثة منهم في الزوز.' }],
  },
  { type: 'math', latex: 'p(A \\cap F) = \\frac{3}{25}' },
];

const answer: TeacherResult = {
  ok: true,
  answer: { blocks: BLOCKS, source: 'ai', costUsd: 0.01 },
};

/** A fake teacher: answers when the test says so. */
function fakeAi(result: TeacherResult = answer) {
  const calls: TeacherRequest[] = [];
  const ai: TeacherAi = jest.fn(async (req: TeacherRequest) => {
    calls.push(req);
    return result;
  });
  return { ai, calls };
}

async function open(
  ai: TeacherAi,
  o: { initial?: AskRequest | null; noQuestion?: boolean } = {},
) {
  const onClose = jest.fn();
  const onEvent = jest.fn();
  const view = await render(
    <TeacherScreen
      visible
      onClose={onClose}
      exerciseId={TREE}
      question={o.noQuestion ? null : question()}
      ai={ai}
      initial={o.initial ?? null}
      onEvent={onEvent}
    />,
  );
  return { view, onClose, onEvent };
}

async function ask(text: string) {
  await fireEvent.changeText(screen.getByTestId('teacher-input'), text);
  await fireEvent.press(screen.getByTestId('teacher-send'));
  await act(async () => {});
}

describe('TeacherScreen', () => {
  it('shows the header, the exercise chip and an empty thread', async () => {
    await open(fakeAi().ai);
    expect(screen.getByText('الأستاذ')).toBeTruthy();
    expect(screen.getByText('يفسّرلك حتى تفهم')).toBeTruthy();
    expect(screen.getByTestId('teacher-chip-exercise')).toHaveTextContent(
      /على: تمرين الشجرة، السؤال/,
    );
    expect(screen.getByTestId('teacher-empty')).toBeTruthy();
    expect(screen.getByTestId('teacher-keys')).toBeTruthy();
  });

  it('renders nothing while hidden', async () => {
    await render(
      <TeacherScreen
        visible={false}
        onClose={() => {}}
        exerciseId={TREE}
        question={null}
        ai={fakeAi().ai}
        initial={null}
      />,
    );
    expect(screen.queryByTestId('teacher-screen')).toBeNull();
  });

  it('answers his question in full, with the AI mark and the two buttons, never a question', async () => {
    const f = fakeAi();
    const { onEvent } = await open(f.ai);
    await ask('Ma fhmtch P(AinterF)');
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toMatchObject({
      mode: 'ask',
      question: 'Ma fhmtch P(AinterF)',
      pressed: null,
      general: false,
    });
    expect(f.calls[0]!.context?.hidden.join()).toContain('1/6');
    expect(screen.getByTestId('teacher-his')).toHaveTextContent(
      'Ma fhmtch P(AinterF)',
    );
    expect(screen.getByTestId('teacher-read')).toHaveTextContent(/inter = ∩/);
    expect(screen.getByTestId('teacher-answer')).toBeTruthy();
    expect(screen.getByTestId('teacher-mark-ai')).toHaveTextContent(
      'الكلام هذا كتبو الذكاء الاصطناعي، والحساب يثبّتو المحرّك.',
    );
    expect(screen.getByTestId('teacher-understood')).toHaveTextContent(
      'فهمت ✓',
    );
    expect(screen.getByTestId('teacher-not-yet')).toHaveTextContent(
      'مازال ما فهمتش',
    );
    expect(screen.getByTestId('teacher-back')).toHaveTextContent(
      'نرجعو للتمرين',
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ t: 'teacher_answer', source: 'ai' }),
    );
  });

  it('makes it a general question with the chip, and brings the exercise back', async () => {
    const f = fakeAi();
    await open(f.ai);
    await fireEvent.press(screen.getByTestId('teacher-chip-off'));
    expect(screen.getByTestId('teacher-chip-general')).toHaveTextContent(
      /سؤال عام، موش على التمرين/,
    );
    await ask('chnwa el far9 bin A ∩ B w A ∪ B');
    expect(f.calls[0]!.general).toBe(true);
    // The values he has not found stay hidden in a general question.
    expect(f.calls[0]!.context).not.toBeNull();
    await fireEvent.press(screen.getByTestId('teacher-chip-back'));
    expect(screen.getByTestId('teacher-chip-exercise')).toBeTruthy();
  });

  it('answers a long press from the glossary at once, free, with no call', async () => {
    const f = fakeAi();
    await open(f.ai, {
      initial: {
        kind: 'meaning',
        pressed: { kind: 'math', text: 'p(A \\cap F)' },
        entryId: null,
      },
    });
    await act(async () => {});
    expect(f.calls).toHaveLength(0);
    expect(screen.getByTestId('teacher-his')).toHaveTextContent(
      /شنوّة معناها؟/,
    );
    expect(screen.getByTestId('teacher-mark-glossary')).toBeTruthy();
    expect(screen.getByText('« p de A inter F »')).toBeTruthy();
  });

  it('sends to the AI what the glossary does not hold', async () => {
    const f = fakeAi();
    await open(f.ai, {
      initial: {
        kind: 'use',
        pressed: { kind: 'math', text: 'p(A \\cap F)' },
        entryId: 'inter',
      },
    });
    await act(async () => {});
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toMatchObject({
      question: 'علاش نستعملوها هنا؟',
      pressed: 'p(A \\cap F)',
    });
  });

  it('puts what he pressed in his question for «نكتب سؤالي وحدي»', async () => {
    const f = fakeAi();
    await open(f.ai, {
      initial: {
        kind: 'own',
        pressed: { kind: 'math', text: 'p(\\overline{A} \\cap F)' },
        entryId: null,
      },
    });
    await act(async () => {});
    expect(f.calls).toHaveLength(0);
    expect(screen.getByTestId('teacher-input').props.value).toBe(
      'p(A\u0304 ∩ F) ',
    );
  });

  it('explains again, simpler, on «مازال ما فهمتش», and closes the buttons on «فهمت ✓»', async () => {
    const f = fakeAi();
    const { onEvent } = await open(f.ai);
    await ask('chnwa P(A∩F)');
    await fireEvent.press(screen.getByTestId('teacher-not-yet'));
    await act(async () => {});
    expect(f.calls[1]).toMatchObject({ mode: 'simpler' });
    expect(f.calls[1]!.history).toHaveLength(1);
    expect(f.calls[1]!.history[0]!.answer).toContain('p(A \\cap F)');
    await fireEvent.press(screen.getByTestId('teacher-understood'));
    expect(screen.queryByTestId('teacher-understood')).toBeNull();
    expect(screen.getAllByTestId('teacher-his').pop()).toHaveTextContent(
      'فهمت ✓',
    );
    expect(onEvent).toHaveBeenCalledWith({ t: 'teacher_understood' });
  });

  it('folds a long earlier answer to one line when a new one arrives', async () => {
    const f = fakeAi();
    await open(f.ai);
    await ask('one');
    expect(screen.queryByTestId('teacher-folded')).toBeNull();
    await ask('two');
    expect(screen.getAllByTestId('teacher-folded')).toHaveLength(1);
    expect(screen.getAllByTestId('teacher-answer')).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('teacher-folded'));
    expect(screen.getAllByTestId('teacher-answer')).toHaveLength(2);
  });

  it('says the teacher is back tomorrow when the allowance is spent, and when it could not answer', async () => {
    await open(fakeAi({ ok: false, reason: 'spent' }).ai);
    await ask('x');
    expect(screen.getByTestId('teacher-spent')).toHaveTextContent(
      /الأستاذ يرجع غدوة/,
    );
    await screen.unmount();
    await open(fakeAi({ ok: false, reason: 'failed' }).ai);
    await ask('x');
    expect(screen.getByTestId('teacher-failed')).toHaveTextContent(
      /الأستاذ ما نجمش يجاوب توّا/,
    );
  });

  it('writes the math keys into his question', async () => {
    await open(fakeAi().ai);
    await fireEvent.changeText(screen.getByTestId('teacher-input'), 'A');
    await fireEvent(screen.getByTestId('teacher-input'), 'selectionChange', {
      nativeEvent: { selection: { start: 1, end: 1 } },
    });
    await fireEvent.press(screen.getByTestId('teacher-key-cap'));
    expect(screen.getByTestId('teacher-input').props.value).toBe('A ∩ ');
    await fireEvent.press(screen.getByTestId('teacher-key-p'));
    expect(screen.getByTestId('teacher-input').props.value).toBe('A ∩ p()');
    expect(screen.getByTestId('teacher-input').props.selection).toEqual({
      start: 6,
      end: 6,
    });
  });

  it('closes with ✕ and with «نرجعو للتمرين»', async () => {
    const { onClose } = await open(fakeAi().ai);
    await fireEvent.press(screen.getByTestId('teacher-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('without an open question, every question is general', async () => {
    const f = fakeAi();
    await open(f.ai, { noQuestion: true });
    expect(screen.getByTestId('teacher-chip-general')).toBeTruthy();
    expect(screen.queryByTestId('teacher-chip-back')).toBeNull();
    await ask('chnwa el limite');
    expect(f.calls[0]).toMatchObject({ context: null, general: true });
  });
});

describe('the input helpers', () => {
  it('writes a pressed formula as he would type it', () => {
    expect(latexToTyped('p(A \\cap F)')).toBe('p(A ∩ F)');
    expect(latexToTyped('p(F/\\overline{A}) = \\frac{1}{4}')).toBe(
      'p(F/A\u0304) = 1/4',
    );
    expect(latexToTyped('\\sqrt{x^{2}+1}')).toBe('√(x²+1)');
  });

  it('puts the keys at the cursor, the bar over the letter before it', () => {
    const key = (id: string) => MATH_KEYS.find(k => k.id === id)!;
    expect(insertKey('B', { start: 1, end: 1 }, key('bar'))).toEqual({
      text: 'B\u0304',
      cursor: 2,
    });
    expect(insertKey('', { start: 0, end: 0 }, key('bar')).text).toBe(
      'A\u0304',
    );
    expect(insertKey('xy', { start: 1, end: 1 }, key('frac'))).toEqual({
      text: 'x()/()y',
      cursor: 2,
    });
    expect(insertKey('a ', { start: 2, end: 2 }, key('cup')).text).toBe('a ∪ ');
  });
});

describe('the keyboard inset', () => {
  const ev = (screenY: number, height: number) =>
    ({
      endCoordinates: { screenX: 0, screenY, width: 390, height },
      duration: 0,
      easing: 'keyboard',
    } as never);

  it('pads the screen by the part of the keyboard that covers it', () => {
    // A view down to the screen's bottom (844): all of a 300 pt keyboard.
    expect(coveredBy(844, keyboardTop(ev(544, 300)))).toBe(300);
    // A parent that already made room (the view ends above the keyboard): nothing.
    expect(coveredBy(544, keyboardTop(ev(544, 300)))).toBe(0);
    // Hidden.
    expect(coveredBy(844, keyboardTop(ev(844, 0)))).toBe(0);
    expect(coveredBy(844, keyboardTop(null))).toBe(0);
  });
});
