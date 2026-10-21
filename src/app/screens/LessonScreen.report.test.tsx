import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
const reportsInLog = () => log.all().filter(e => e.t === 'report');

afterEach(() => setDevTools(false));

describe('Report flow (docs/FEEDBACK_AND_TRUST.md), end to end on the lesson screen', () => {
  it('"..." on a lesson block: menu with its trust label, then a report; logged and queued', async () => {
    await renderLesson('1b');
    const menus = screen.getAllByTestId(/^block-menu-/);
    expect(menus.length).toBeGreaterThan(0);
    await fireEvent.press(menus[0]!);
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

  it('the active question has a visible Report button; its component state goes with the report', async () => {
    await renderLesson('2a');
    // 2.a: type the count, confirm, then the EventPicker task is the active card.
    for (const key of '10') {
      await tap(`keypad-key-${key}`);
    }
    await tap('keypad-check');
    await tap('option-ok');
    await tap('pick-a-b');
    await tap('pick-a-c');
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
    await fireEvent.press(screen.getAllByTestId(/^block-menu-/)[0]!);
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
