import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import ex2 from '../../content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../content/loader';
import { buildContent, startLesson } from '../../lesson/session/lesson';
import { stepSync } from '../../lesson/session/orchestrate';
import { createRulesPlanner } from '../../planner/rules';
import { memoryStore } from '../../storage/kv';
import { createKvEventStore } from '../../telemetry/eventStore';
import {
  EventLog,
  fixedClock,
  type EventLog as Log,
} from '../../telemetry/log';
import { LocalQueue } from '../../telemetry/reports';
import { readLog } from '../../../tools/replay/lib';
import { setDevTools } from '../devFlags';
import { LessonScreen } from './LessonScreen';

/** An earlier session on 1.b: two wrong answers on s3 (the deep dive was shown). */
function earlierSession() {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    throw new Error(r.errors.join('\n'));
  }
  const content = buildContent(r.loaded, '1b');
  const rules = createRulesPlanner(content.menu);
  const store = createKvEventStore(memoryStore(), {
    now: () => 1_760_000_100_000,
  });
  const log = new EventLog(
    {
      sessionId: 'earlier',
      studentId: 'local-anon',
      exerciseId: r.loaded.exercise.id,
      contentVersion: r.loaded.exercise.contentVersion,
    },
    fixedClock(),
    store,
  );
  const start = startLesson(content);
  log.append(start.events);
  let s = start.state;
  for (const optionId of ['one', 'two']) {
    s = stepSync(
      content,
      s,
      { type: 'answer', value: { optionId }, at: 1000 },
      log,
      rules,
    );
  }
  return store;
}

describe('the lesson reads stored history (event store, earlier session)', () => {
  it('a second wrong answer avoids the deep dive tried in the earlier session', async () => {
    let log!: Log;
    await render(
      <GestureHandlerRootView>
        <LessonScreen
          initialPart="1b"
          clock={fixedClock(1_760_100_000_000)}
          queue={new LocalQueue(memoryStore())}
          llm={null}
          eventStore={earlierSession()}
          onLog={l => {
            log = l;
          }}
        />
      </GestureHandlerRootView>,
    );
    await fireEvent.press(screen.getAllByTestId('option-one').at(-1)!);
    // The first wrong offers a repair; decline it to stay on the question.
    const decline = screen.queryAllByTestId('card-repair-no').at(-1);
    if (decline) {
      await fireEvent.press(decline);
    }
    await fireEvent.press(screen.getAllByTestId('option-two').at(-1)!);
    const plans = log.all().filter(e => e.t === 'plan');
    expect(plans.at(-1)).toMatchObject({
      decision: { ruleId: 'rule.second_wrong', next: { kind: 'variant' } },
    });
    expect(screen.queryByTestId('deep-dive-start')).toBeNull();
  });
});

describe('event export (dev tools)', () => {
  it('shares the stored events as JSONL, readable by the replay reader', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const store = earlierSession();
    await render(
      <GestureHandlerRootView>
        <LessonScreen
          initialPart="1b"
          clock={fixedClock(1_760_100_000_000)}
          queue={new LocalQueue(memoryStore())}
          llm={null}
          eventStore={store}
        />
      </GestureHandlerRootView>,
    );
    expect(screen.queryByTestId('export-events')).toBeNull();
    await act(async () => setDevTools(true));
    await fireEvent.press(screen.getByTestId('export-events'));
    const message = (share.mock.calls[0]![0] as { message: string }).message;
    const parsed = readLog(message);
    expect(parsed.errors).toEqual([]);
    expect(parsed.events.length).toBe(store.stats().events);
    await act(async () => setDevTools(false));
    share.mockRestore();
  });
});
