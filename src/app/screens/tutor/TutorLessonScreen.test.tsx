import '../../../i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type {
  MessagesTransport,
  SendResult,
} from '../../../ai/transport/messagesApi';
import type { ContentBlock, MessagesRequest } from '../../../ai/transport/wire';
import { memoryStore } from '../../../storage/kv';
import { CATALOG } from '../../exercises';
import { TutorLessonScreen } from './TutorLessonScreen';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;

let seq = 0;
const ask = (text: string, input: unknown): ContentBlock => ({
  type: 'tool_use',
  id: `toolu_${++seq}`,
  name: 'ask_student',
  input: { message: [{ type: 'ar', text }], input, intent: 'other' },
});

function fake(steps: (ContentBlock[] | 'fail')[]) {
  const bodies: MessagesRequest[] = [];
  const transport: MessagesTransport = {
    send: jest.fn(async (body: MessagesRequest): Promise<SendResult> => {
      bodies.push(JSON.parse(JSON.stringify(body)) as MessagesRequest);
      const next = steps.shift();
      if (!next || next === 'fail') {
        return {
          ok: false,
          error: 'network',
          retryable: true,
          latencyMs: 1,
          attempts: 1,
        };
      }
      return {
        ok: true,
        latencyMs: 1,
        attempts: 1,
        response: {
          id: 'm',
          model: 'claude-sonnet-5-5',
          content: next,
          stopReason: 'tool_use',
          refusalCategory: null,
          usage: {
            input: 1,
            cacheRead: 0,
            cacheWrite5m: 0,
            cacheWrite1h: 0,
            output: 1,
          },
        },
      };
    }),
  };
  return { transport, bodies };
}

const flush = () => new Promise(r => setTimeout(r, 0));

describe('TutorLessonScreen', () => {
  it('shows the tutor message, sends a continue, and shows the next one', async () => {
    const { transport, bodies } = fake([
      [ask('مرحبا، نبداو.', { kind: 'continue' })],
      [ask('قدّاش من تيراج ممكن؟', { kind: 'free' })],
    ]);
    await render(
      <TutorLessonScreen
        loaded={loaded!}
        raw={entry.raw}
        questionId="1"
        onBack={() => {}}
        transport={transport}
        store={memoryStore()}
      />,
    );
    await flush();
    expect(await screen.findByText(/مرحبا، نبداو\./)).toBeTruthy();
    expect(screen.getByTestId('ai-dont-know')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ai-continue'));
    expect(await screen.findByText(/قدّاش من تيراج ممكن؟/)).toBeTruthy();
    // The reply went back as the tool result of the first ask_student.
    const last = bodies[1]!.messages[bodies[1]!.messages.length - 1]!;
    expect((last.content as ContentBlock[])[0]).toMatchObject({
      type: 'tool_result',
    });
  });

  it('sends free text and «ما نعرفش» whatever the input', async () => {
    const { transport, bodies } = fake([
      [ask('اكتب.', { kind: 'free' })],
      [ask('باهي.', { kind: 'free' })],
      [ask('نجرّبو صندوق صغير.', { kind: 'free' })],
    ]);
    await render(
      <TutorLessonScreen
        loaded={loaded!}
        raw={entry.raw}
        questionId="1"
        onBack={() => {}}
        transport={transport}
        store={memoryStore()}
      />,
    );
    await flush();
    await screen.findByText(/اكتب\./);
    await fireEvent.changeText(screen.getByTestId('ai-text'), '10*9*8 = 720');
    await fireEvent.press(screen.getByTestId('ai-send'));
    await screen.findByText(/باهي\./);
    const sent = bodies[1]!.messages[bodies[1]!.messages.length - 1]!
      .content as ContentBlock[];
    expect(JSON.parse(String(sent[0]!.content))).toMatchObject({
      reply: 'free',
      math_segments: [{ engine: { value: '720' } }],
    });
    await fireEvent.press(screen.getByTestId('ai-dont-know'));
    expect(await screen.findByText(/نجرّبو صندوق صغير\./)).toBeTruthy();
  });

  it('shows a retry when the call fails, and retries', async () => {
    const { transport } = fake(['fail', [ask('رجعنا.', { kind: 'free' })]]);
    await render(
      <TutorLessonScreen
        loaded={loaded!}
        raw={entry.raw}
        questionId="1"
        onBack={() => {}}
        transport={transport}
        store={memoryStore()}
      />,
    );
    await flush();
    await fireEvent.press(await screen.findByTestId('ai-retry'));
    expect(await screen.findByText(/رجعنا\./)).toBeTruthy();
  });

  it('shows a component inside the message, then sends what he did and keeps it', async () => {
    const { transport, bodies } = fake([
      // A small box first (the exercise urn has too many draws to tap).
      [
        {
          type: 'tool_use',
          id: 'toolu_case',
          name: 'make_case',
          input: {
            case: { kind: 'urn', reds: 2, blacks: 2, k: 2, j: 1 },
            purpose: 'smaller',
          },
        },
      ],
      [
        ask('اختار تيراج واحد من الصندوق.', {
          kind: 'component',
          name: 'Urn',
          props_json: '{"mode":"select"}',
          case_id: 'C1',
        }),
      ],
      [ask('شنوّة لقيت؟', { kind: 'free' })],
    ]);
    await render(
      <TutorLessonScreen
        loaded={loaded!}
        raw={entry.raw}
        questionId="1"
        onBack={() => {}}
        transport={transport}
        store={memoryStore()}
      />,
    );
    await flush();
    await screen.findByText(/اختار تيراج/);
    // The component is in the tutor's message, not in the dock.
    expect(screen.getByTestId('tutor-component')).toBeTruthy();
    expect(screen.queryByTestId('component-fallback')).toBeNull();
    await fireEvent.press(screen.getByTestId('ai-component-done'));
    expect(await screen.findByText(/شنوّة لقيت؟/)).toBeTruthy();
    const sent = bodies[2]!.messages[bodies[2]!.messages.length - 1]!
      .content as ContentBlock[];
    expect(JSON.parse(String(sent[0]!.content))).toMatchObject({
      reply: 'component',
      component: 'Urn',
    });
    // Still in the thread afterwards, as he left it.
    expect(screen.getByTestId('tutor-component')).toBeTruthy();
  });

  it('offers the next question and the way back when the question ends', async () => {
    const { transport } = fake([
      [
        {
          type: 'tool_use',
          id: 'toolu_end',
          name: 'end_question',
          input: { outcome: 'solved_alone', summary: 'Done.', next_time: '' },
        },
      ],
    ]);
    const onNext = jest.fn();
    const onBack = jest.fn();
    await render(
      <TutorLessonScreen
        loaded={loaded!}
        raw={entry.raw}
        questionId="1"
        onBack={onBack}
        onNext={onNext}
        transport={transport}
        store={memoryStore()}
      />,
    );
    await flush();
    await fireEvent.press(await screen.findByTestId('ai-next-question'));
    expect(onNext).toHaveBeenCalledWith('2');
    await fireEvent.press(screen.getByTestId('ai-back-to-list'));
    expect(onBack).toHaveBeenCalled();
    // No input after the end.
    expect(screen.queryByTestId('ai-dock')).toBeNull();
  });
});
