import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import {
  createGestureController,
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { memoryStore } from '../../storage/kv';
import { EventSchema } from '../../telemetry/events';
import { fixedClock, type EventLog } from '../../telemetry/log';
import { LocalQueue, readQueueExport } from '../../telemetry/reports';
import { setDevTools } from '../devFlags';
import { LessonScreen } from './LessonScreen';

let log: EventLog;
let queue: LocalQueue;

async function renderLesson(part: '1b' | '2a') {
  queue = new LocalQueue(memoryStore());
  await render(
    <GestureHandlerRootView>
      <LessonScreen
        initialPart={part}
        clock={fixedClock()}
        queue={queue}
        onLog={l => {
          log = l;
        }}
      />
    </GestureHandlerRootView>,
  );
}

const lastByTestId = (id: string) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(lastByTestId(id));
/** Long-press on the first feed block (the statement): its menu (DESIGN.md §3). */
const longPressFirstBlock = async () => {
  const key = String(
    screen.getAllByTestId(/^feed-item-/)[0]!.props.testID,
  ).replace('feed-item-', '');
  await act(async () =>
    fireGestureHandler(getByGestureTestId(`block-${key}-longpress`)),
  );
};

/** The active card's "⋯" menu (the last card in the feed, DESIGN.md §3). */
const openCardMenu = () =>
  fireEvent.press(screen.getAllByTestId(/^card-menu-/).at(-1)!);
const reportsInLog = () => log.all().filter(e => e.t === 'report');

afterEach(() => setDevTools(false));

describe('Report flow (docs/FEEDBACK_AND_TRUST.md), end to end on the lesson screen', () => {
  it('long-press on a lesson block: menu with its trust label, then a report; logged and queued', async () => {
    await renderLesson('1b');
    await longPressFirstBlock();
    // Unreviewed content says so (never "verified").
    expect(screen.getByTestId('report-trust')).toHaveTextContent(
      'مسودّة: مازال ما راجعهاش أستاذ',
    );
    await tap('report-open');
    // Send stays disabled until a reason is chosen.
    await tap('report-send');
    expect(reportsInLog()).toHaveLength(0);
    await tap('report-reason-unclear');
    await fireEvent.changeText(
      screen.getByTestId('report-text'),
      'ما فهمتش الجملة',
    );
    await tap('report-send');
    expect(screen.getByTestId('report-thanks')).toBeOnTheScreen();
    await tap('report-continue');
    expect(screen.queryByTestId('report-sheet')).toBeNull();

    const [report] = reportsInLog();
    expect(report).toMatchObject({
      t: 'report',
      reason: 'unclear',
      source: 'lesson',
      text: 'ما فهمتش الجملة',
      contentVersion: expect.any(String),
    });
    expect(EventSchema.safeParse(report).success).toBe(true);
    expect(queue.count('report')).toBe(1);
    const entry = queue.all()[0]!;
    expect(entry.kind === 'report' && entry.context.device).toMatchObject({
      platform: 'ios',
      locale: expect.any(String),
    });
    // Attached events never carry free text.
    const attached = JSON.stringify(
      entry.kind === 'report' ? entry.context.lastEvents : [],
    );
    expect(attached).not.toContain('ما فهمتش');
    // Round trip through the export format.
    const back = readQueueExport(queue.toJsonl());
    expect(back.errors).toEqual([]);
    expect(back.entries).toHaveLength(1);
  });

  it("the active question's Report is one tap away in its ⋯ menu; its component state goes with the report", async () => {
    await renderLesson('2a');
    // 2.a: type the count, confirm, then the EventPicker task is the active card.
    for (const key of '10') {
      await tap(`keypad-key-${key}`);
    }
    await tap('keypad-check');
    await tap('option-ok');
    await tap('pick-a-b');
    await tap('pick-a-c');
    await openCardMenu();
    const buttons = screen.getAllByTestId(/^block-report-/);
    await fireEvent.press(buttons.at(-1)!);
    expect(screen.getByTestId('report-sheet')).toBeOnTheScreen();
    await tap('report-reason-bug');
    await tap('report-send');
    const [report] = reportsInLog();
    expect(report).toMatchObject({ source: 'component', reason: 'bug' });
    const snap = report?.t === 'report' ? report.snapshot : undefined;
    expect(snap).toMatchObject({ component: 'EventPicker' });
    expect(JSON.stringify(snap)).toContain('a-b');
    expect(JSON.stringify(snap).length).toBeLessThanOrEqual(2048);
    const entry = queue.all()[0]!;
    expect(
      entry.kind === 'report' && entry.context.componentSpec,
    ).toMatchObject({
      component: 'EventPicker',
    });
  });

  it('an ask sends the active component snapshot (capped, valid JSON)', async () => {
    await renderLesson('2a');
    for (const key of '10') {
      await tap(`keypad-key-${key}`);
    }
    await tap('keypad-check');
    await tap('option-ok');
    await tap('pick-b-c');
    await fireEvent.changeText(screen.getByTestId('ask-input'), 'علاش؟');
    await tap('ask-send');
    const ask = log
      .all()
      .filter(e => e.t === 'ask')
      .at(-1);
    const snapshot = ask?.t === 'ask' ? ask.snapshot : undefined;
    expect(snapshot).toMatchObject({
      components: { active: { component: 'EventPicker' } },
    });
    expect(JSON.stringify(snapshot?.components).length).toBeLessThanOrEqual(
      2048,
    );
  });

  it('cancelling the sheet is logged; no report is written', async () => {
    await renderLesson('1b');
    await longPressFirstBlock();
    await tap('report-cancel');
    expect(reportsInLog()).toHaveLength(0);
    expect(
      log
        .all()
        .filter(e => e.t === 'component_event')
        .map(e => e.t === 'component_event' && `${e.component}:${e.name}`),
    ).toEqual(['BlockMenu:opened', 'ReportSheet:dismissed']);
  });

  it('the export button is a dev tool only', async () => {
    await renderLesson('1b');
    expect(screen.queryByTestId('export-queue')).toBeNull();
  });
});

describe('question card "⋯" menu (DESIGN.md §3)', () => {
  const uiEvents = () =>
    log
      .all()
      .flatMap(e =>
        e.t === 'component_event' && e.component === 'CardMenu'
          ? [{ name: e.name, payload: e.payload }]
          : [],
      );

  it('opens and closes on a tap outside, logged with the step key; focus goes back to the card', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await renderLesson('1b');
    await openCardMenu();
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('report-backdrop'));
    expect(screen.queryByTestId('report-trust')).toBeNull();
    expect(uiEvents()).toEqual([
      {
        name: 'opened',
        payload: expect.objectContaining({ stepKey: expect.any(String) }),
      },
      {
        name: 'dismissed',
        payload: expect.objectContaining({ stepKey: expect.any(String) }),
      },
    ]);
    const [opened, dismissed] = uiEvents();
    expect(dismissed?.payload).toEqual(opened?.payload);
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    focus.mockRestore();
  });

  it('closes on the back gesture (logged)', async () => {
    await renderLesson('1b');
    await openCardMenu();
    await fireEvent(screen.getByTestId('report-modal'), 'requestClose');
    expect(screen.queryByTestId('report-trust')).toBeNull();
    expect(uiEvents().map(e => e.name)).toEqual(['opened', 'dismissed']);
  });

  it('a deep-dive mini card offers "back" but never "change method" or "easier"', async () => {
    await renderLesson('1b');
    await tap('not-sure');
    await openCardMenu();
    expect(screen.getByTestId('back-to-question')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-change-method')).toBeNull();
    expect(screen.queryByTestId('request-simpler')).toBeNull();
    // Its Report keeps the id it had as a visible button.
    expect(screen.getAllByTestId(/^block-report-/)).toHaveLength(1);
  });

  it('a done card keeps a "⋯" with its trust label and Report only', async () => {
    await renderLesson('1b');
    const first = screen.getAllByTestId(/^card-menu-/).at(-1)!.props
      .testID as string;
    // The right answer: the card is done (readonly copy).
    await tap('option-none');
    expect(screen.getAllByTestId('question-done').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId(first));
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-change-method')).toBeNull();
    expect(screen.queryByTestId('request-simpler')).toBeNull();
    expect(screen.queryByTestId('back-to-question')).toBeNull();
  });
});

describe('every block type can still reach Report (no per-block icon, DESIGN.md §3)', () => {
  /** The feed item key of the block that contains this element. */
  const keyOf = (testID: string) => {
    let node = screen.getAllByTestId(testID).at(-1)!;
    while (node && !String(node.props.testID ?? '').startsWith('feed-item-')) {
      node = node.parent!;
    }
    return String(node.props.testID).replace('feed-item-', '');
  };
  const longPress = (gestureTestID: string) =>
    act(async () => fireGestureHandler(getByGestureTestId(gestureTestID)));
  const reportsOf = () => reportsInLog().map(r => r.t === 'report' && r);

  it('tutor text: «بلّغ على غلطة» is the last row of the long-press menu, then the report', async () => {
    await renderLesson('1b');
    await longPress('tutor-q1b-s1-longpress');
    expect(screen.getByTestId('longpress-trust')).toHaveTextContent(
      'مسودّة: مازال ما راجعهاش أستاذ',
    );
    const modal = screen.getByTestId('longpress-modal');
    await tap('longpress-report');
    // iOS: the report sheet opens once the long-press menu is gone.
    expect(screen.queryByTestId('report-send')).toBeNull();
    // The Jest Modal mock unmounts when hidden: call what iOS calls then.
    await act(async () => (modal.props.onDismiss as () => void)());
    await tap('report-reason-wording');
    await tap('report-send');
    expect(reportsOf()).toEqual([
      expect.objectContaining({ blockId: 'q1b-s1', reason: 'wording' }),
    ]);
  });

  it('a feedback block: long-press opens its menu (trust label + Report)', async () => {
    await renderLesson('1b');
    await tap('option-one');
    await longPress(`block-${keyOf('feedback-warning')}-longpress`);
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
    await tap('report-open');
    expect(screen.getByTestId('report-send')).toBeOnTheScreen();
  });

  it('a feedback block: a scroll starting on it cancels the long-press', async () => {
    await renderLesson('1b');
    await tap('option-one');
    const gesture = getByGestureTestId(
      `block-${keyOf('feedback-warning')}-longpress`,
    );
    await act(async () => {
      const c = createGestureController(gesture);
      c.begin();
      c.fail();
    });
    expect(screen.queryByTestId('report-trust')).toBeNull();
  });

  it('a choice card: long-press on its title only', async () => {
    await renderLesson('1b');
    await tap('option-one');
    await longPress('card-repair-title-longpress');
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
  });

  it("a visual (2.a urn): a row in the next card's ⋯, with its own snapshot", async () => {
    await renderLesson('2a');
    await openCardMenu();
    const rows = screen.getAllByTestId(/^card-report-visual-/);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveTextContent('بلّغ على هذا الجزء');
    await fireEvent.press(rows[0]!);
    await tap('report-reason-bug');
    await tap('report-send');
    const [report] = reportsInLog();
    expect(report).toMatchObject({ source: 'component', reason: 'bug' });
    expect(report?.t === 'report' && report.snapshot).toMatchObject({
      component: 'Urn',
    });
  });

  it('screen readers: a "report" action on a display block and on tutor text', async () => {
    await renderLesson('1b');
    const statement = String(
      screen.getAllByTestId(/^feed-item-/)[0]!.props.testID,
    ).replace('feed-item-', '');
    await fireEvent(
      screen.getByTestId(`block-${statement}-longpress-target`),
      'accessibilityAction',
      { nativeEvent: { actionName: 'report' } },
    );
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
    await tap('report-cancel');
    await fireEvent(screen.getByTestId('tutor-q1b-s1'), 'accessibilityAction', {
      nativeEvent: { actionName: 'report' },
    });
    expect(screen.getByTestId('report-trust')).toBeOnTheScreen();
    const vias = log
      .all()
      .flatMap(e =>
        e.t === 'component_event' && e.component === 'BlockMenu'
          ? [e.payload.via]
          : [],
      );
    expect(vias).toEqual(['a11y', 'a11y']);
  });
});

describe('end-of-question feedback card (D19)', () => {
  it('appears after the done line; a face + optional note is logged and queued', async () => {
    await renderLesson('1b');
    expect(screen.queryByTestId('feedback-card')).toBeNull();
    // Play 1.b to the end.
    await tap('option-none');
    for (const k of '3') {
      await tap(`keypad-key-${k}`);
    }
    await tap('keypad-check');
    await tap('option-p3_10');
    for (const k of '0,7') {
      await tap(`keypad-key-${k}`);
    }
    await tap('keypad-check');
    expect(screen.getByTestId('lesson-done')).toBeOnTheScreen();
    expect(screen.getByTestId('feedback-card')).toBeOnTheScreen();
    await tap('feedback-liked');
    await fireEvent.changeText(
      screen.getByTestId('feedback-note'),
      'مليح برشا',
    );
    await tap('feedback-send');
    expect(screen.getByTestId('feedback-thanks')).toBeOnTheScreen();
    const fb = log.all().filter(e => e.t === 'feedback');
    expect(fb).toMatchObject([
      { choice: 'liked', text: 'مليح برشا', stepId: 'none' },
    ]);
    expect(queue.all()).toMatchObject([
      { kind: 'feedback', event: { choice: 'liked' } },
    ]);
  });
});
