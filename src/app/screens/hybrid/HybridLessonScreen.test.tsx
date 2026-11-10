import '../../../i18n';

import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
  act as rtlAct,
} from '@testing-library/react-native';
import React from 'react';

import type { Move, Mover } from '../../../hybrid/mover';
import { loadRecord } from '../../../hybrid/records';
import { createDoneRecord } from '../../../state/doneParts';
import { memoryStore, type KeyValueStore } from '../../../storage/kv';
import { CATALOG } from '../../exercises';
import { startQuestion } from '../../../hybrid/conductor/conductor';
import { passTour } from '../../../hybrid/tour/passTour';
import { HybridLessonScreen } from './HybridLessonScreen';
import { StepCard } from './StepCard';
import { hybridCtx, useHybridSession } from './useHybridSession';

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;

const last = (id: string | RegExp) => screen.getAllByTestId(id).at(-1)!;
const tap = (id: string) => fireEvent.press(last(id));
/** The worksheet keys for a line as written on paper (÷ opens a denominator, = leaves it). */
const KEY: Record<string, string> = {
  '×': '*',
  '÷': 'div',
  '(': 'group',
  ')': 'close',
};
async function write(line: string) {
  for (const ch of line) {
    await tap(`worksheet-key-${KEY[ch] ?? ch}`);
  }
  await tap('worksheet-submit');
}
const flush = () => rtlAct(() => new Promise(r => setTimeout(r, 0)));

async function renderQ(
  o: {
    questionId?: string;
    store?: KeyValueStore;
    mover?: Mover;
  } = {},
) {
  const store = o.store ?? memoryStore();
  const doneRecord = createDoneRecord(memoryStore());
  const onNext = jest.fn();
  const view = await render(
    <HybridLessonScreen
      loaded={loaded!}
      raw={entry.raw}
      questionId={o.questionId ?? '1'}
      onBack={() => {}}
      onNext={onNext}
      store={store}
      doneRecord={doneRecord}
      {...(o.mover && { mover: o.mover })}
    />,
  );
  return { store, doneRecord, onNext, view };
}

/** «نبداو»: the trip's only act (the map is shown, he builds nothing). */
const startTrip = () => tap('trip-start');

describe('HybridLessonScreen: the trip', () => {
  it('shows the exercise from above and the map; «نبداو» is the only thing to tap, and opens step ①', async () => {
    await renderQ();
    const trip = within(screen.getByTestId('trip-screen'));
    // The exercise from above: this question marked, how it feeds the next.
    expect(trip.getByTestId('trip-overview')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-q-1-current')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-q-3b')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-q-1-link')).toBeOnTheScreen();
    expect(trip.queryByTestId('trip-changed')).toBeNull();
    // What we have, what is asked: the exam's lines left to right.
    expect(trip.getByTestId('trip-have-0-fr')).toHaveTextContent(
      '4 rouges + 6 noires = 10 boules',
    );
    expect(trip.getByTestId('trip-goal-fr')).toHaveTextContent(
      'Montrer que P(A) = 0,5',
    );
    // The stations: the first one says where we start; then the end.
    expect(trip.getByTestId('trip-step-c_total-now')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-step-c_total-tag')).toHaveTextContent(
      'نبداو من هنا',
    );
    expect(trip.getByTestId('trip-step-c_fav-later')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-step-c_ratio-later')).toBeOnTheScreen();
    expect(trip.queryByTestId(/^trip-line-/)).toBeNull();
    expect(trip.getByTestId('trip-finish-later')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-after-recipe-later')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-after-similar-later')).toBeOnTheScreen();
    // Nothing to build: «نبداو» is the only thing to tap on the trip.
    expect(trip.getAllByRole('button').map(b => b.props.testID)).toEqual([
      'trip-start',
    ]);
    // No step card, no strip yet; the chat stays in reach.
    expect(screen.queryByTestId('step-card')).toBeNull();
    expect(screen.queryByTestId('hybrid-map')).toBeNull();
    expect(screen.getByTestId('chat-open')).toBeOnTheScreen();

    await startTrip();
    expect(screen.queryByTestId('trip-screen')).toBeNull();
    expect(screen.getByTestId('step-card')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_total-now')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_fav-later')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-end-later')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-now')).toHaveTextContent(
      /نعدّو كل التيراجات/,
    );
    // The map went into «الطريق»: the segment flashes.
    expect(screen.getByTestId('board-tabs-road-flash')).toBeOnTheScreen();
    // The first step starts clean (no reply of the trip on it).
    expect(screen.queryByTestId(/^exchange-/)).toBeNull();
  });

  it('free text during the trip goes to the chat; the trip stays until «نبداو»', async () => {
    await renderQ();
    await tap('chat-open');
    await fireEvent.changeText(
      screen.getByTestId('chat-input'),
      'chnowa hedha',
    );
    await tap('chat-send');
    await flush();
    await waitFor(() =>
      expect(screen.queryByTestId('hybrid-waiting')).toBeNull(),
    );
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
    expect(screen.getByTestId('trip-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-start')).toBeEnabled();
  });

  it('shows the trip again until he starts; after «نبداو» it is not shown again', async () => {
    const { store, view } = await renderQ();
    await view.unmount();
    const again = await renderQ({ store });
    expect(screen.getByTestId('trip-screen')).toBeOnTheScreen();
    await startTrip();
    await again.view.unmount();
    await renderQ({ store });
    expect(screen.queryByTestId('trip-screen')).toBeNull();
    expect(screen.getByTestId('step-card')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_total-now')).toBeOnTheScreen();
  });

  it('question 2 started with question 1: step ① is found already, with his line', async () => {
    const { store } = await renderQ();
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');
    await renderQ({ questionId: '2', store });
    const trip = within(screen.getByTestId('trip-screen'));
    expect(trip.getByTestId('trip-q-2-current')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-changed')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-step-c_total-done')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-reused-c_total')).toHaveTextContent(/1$/);
    expect(trip.getByTestId('trip-line-c_total')).toBeOnTheScreen();
    // We start at the next station.
    expect(trip.getByTestId('trip-step-c_fav-now')).toBeOnTheScreen();
    expect(trip.getByTestId('trip-step-c_fav-tag')).toBeOnTheScreen();
    await startTrip();
    expect(screen.getByTestId('collapsed-c_total-reused')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_total-done')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_fav-now')).toBeOnTheScreen();
  });
});

describe('HybridLessonScreen: the instant path', () => {
  it('plays question 1 to the end with no AI: the trip, lines, pick, recipe, similar questions', async () => {
    const { store, doneRecord, onNext } = await renderQ();
    expect(screen.queryByTestId('line-input')).toBeNull();

    await startTrip();
    expect(screen.getByTestId('hybrid-map-c_total-now')).toBeOnTheScreen();

    await write('10×9×8÷(3×2×1)=120');
    expect(last('note-credit')).toBeOnTheScreen();
    expect(last('note-recap')).toBeOnTheScreen();
    expect(screen.getByTestId('collapsed-c_total')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_total-done')).toBeOnTheScreen();

    await write('4×15=60');
    await tap('pick-card-r_true');
    expect(screen.getByTestId('exchange-pick_ok')).toBeOnTheScreen();
    await write('60÷120=1÷2');
    // His steps are done; the strip is at the end of the map (the recipe).
    expect(screen.getByTestId('hybrid-map-c_ratio-done')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-end-now')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-now')).toHaveTextContent(/الوصفة/);

    for (const id of ['rc_read', 'rc_total', 'rc_fav', 'rc_divide']) {
      await tap(`plan-card-${id}`);
    }
    await tap('plan-confirm');
    expect(screen.getByTestId('exchange-recipe')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-now')).toHaveTextContent(
      /الأسئلة الشبيهة/,
    );
    // A similar question is without help.
    expect(screen.queryByTestId('hybrid-dont-know')).toBeNull();

    await write('14×13×12÷(3×2×1)=364');
    await tap('similar-done');
    expect(screen.getByTestId('exchange-similar_review')).toBeOnTheScreen();
    await write('12×11×10÷(3×2×1)=220');
    await tap('similar-done');

    expect(screen.getByTestId('hybrid-ended')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-end-done')).toBeOnTheScreen();
    expect(screen.queryByTestId('hybrid-map-now')).toBeNull();
    expect(screen.queryByTestId('step-card')).toBeNull();
    expect(screen.queryByTestId('chat-drawer')).toBeNull();
    // Every act was answered at once, for free.
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'instant:similar_review $0.0000',
    );
    // The question counts as done, and its record is kept.
    expect(Object.keys(doneRecord.all())).toEqual(['bac2022c-sc-ex2/1']);
    expect(loadRecord(store, 'bac2022c-sc-ex2', '1')).toMatchObject({
      done: true,
      values: { total: '120', fav: '60', result: '1/2' },
      recipe: ['rc_read', 'rc_total', 'rc_fav', 'rc_divide'],
    });
    await tap('hybrid-next-question');
    expect(onNext).toHaveBeenCalledWith('2');
  });

  it('the worksheet writes a division over its whole divisor: no reading to ask', async () => {
    await renderQ();
    await startTrip();
    await write('10×9×8÷3×2×1=120');
    expect(screen.queryByTestId('hybrid-readback')).toBeNull();
    expect(screen.getByTestId('collapsed-c_total')).toBeOnTheScreen();
  });

  it('resumes an unfinished question where he left it', async () => {
    const { store, view } = await renderQ();
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');
    await view.unmount();
    await renderQ({ store });
    expect(screen.getByTestId('collapsed-c_total')).toBeOnTheScreen();
    expect(screen.getByTestId('hybrid-map-c_fav-now')).toBeOnTheScreen();
  });
});

describe('HybridLessonScreen: the AI tiers', () => {
  it('with no move, an act for the AI shows the prepared reply (with its hint)', async () => {
    await renderQ();
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');
    await write('4×6=24');
    await flush();
    await waitFor(() =>
      expect(screen.queryByTestId('hybrid-waiting')).toBeNull(),
    );
    const x = last('exchange-undiagnosed');
    expect(within(x).getByTestId('feedback-info')).toBeOnTheScreen();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'deep:undiagnosed $0.0000',
    );
    expect(screen.getByTestId('hybrid-map-c_fav-now')).toBeOnTheScreen();
  });

  it("shows the AI's move instead, and the route does not move", async () => {
    const move: Move = {
      blocks: [{ type: 'ar', runs: [{ ar: 'شوف السطر متاعك مرّة أخرى' }] }],
      component: null,
      tier: 'deep',
      costUsd: 0.012,
    };
    const mover = jest.fn<ReturnType<Mover>, Parameters<Mover>>(
      async () => move,
    );
    await renderQ({ mover });
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');
    expect(mover).not.toHaveBeenCalled();
    await write('4×6=24');
    await flush();
    expect(
      await screen.findByText(/شوف السطر متاعك مرّة أخرى/),
    ).toBeOnTheScreen();
    expect(mover).toHaveBeenCalledTimes(1);
    expect(mover.mock.calls[0]![1].out).toMatchObject({
      tier: 'deep',
      reason: 'undiagnosed',
    });
    const x = last('exchange-undiagnosed');
    expect(within(x).getByTestId('hybrid-ai-mark')).toBeOnTheScreen();
    expect(within(x).queryByTestId('feedback-info')).toBeNull();
    expect(screen.getByTestId('hybrid-map-c_fav-now')).toBeOnTheScreen();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      'deep:undiagnosed $0.0120',
    );
  });

  it('free text goes to the chat drawer, not the step card', async () => {
    await renderQ();
    await startTrip();
    await tap('chat-open');
    await fireEvent.changeText(
      screen.getByTestId('chat-input'),
      'ma fhemtch chnowa n7seb',
    );
    await tap('chat-send');
    await flush();
    await waitFor(() =>
      expect(screen.queryByTestId('hybrid-waiting')).toBeNull(),
    );
    const drawer = screen.getByTestId('chat-drawer');
    expect(within(drawer).getByText(/ma fhemtch/)).toBeOnTheScreen();
    expect(within(drawer).getByTestId('exchange-free_text')).toBeOnTheScreen();
    const card = screen.getByTestId('step-card');
    expect(within(card).queryByTestId('exchange-free_text')).toBeNull();
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
  });
});

describe('HybridLessonScreen: the sheets', () => {
  it('«الطريق» during the trip: the same map, nothing done yet', async () => {
    await renderQ();
    await tap('board-tabs-road');
    const sheet = within(screen.getByTestId('road-tab'));
    expect(sheet.getByTestId('trip-q-1-current')).toBeOnTheScreen();
    expect(sheet.getByTestId('trip-step-c_total-now')).toBeOnTheScreen();
    expect(sheet.getByTestId('trip-step-c_total-tag')).toHaveTextContent(
      'نبداو من هنا',
    );
    expect(sheet.queryByTestId(/^trip-line-/)).toBeNull();
  });

  it('«الطريق» follows him: done ✓ with his line, the station now, the later ones; the strip opens it', async () => {
    await renderQ();
    await startTrip();
    await tap('hybrid-map');
    let road = within(screen.getByTestId('road-tab'));
    expect(road.getByTestId('trip-step-c_total-now')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_total-tag')).toHaveTextContent(
      'توّا هنا',
    );
    expect(road.getByTestId('trip-step-c_fav-later')).toBeOnTheScreen();
    await tap('board-close');

    await write('10×9×8÷(3×2×1)=120');
    await write('4×15=60');
    await tap('pick-card-r_true');
    expect(screen.getByTestId('hybrid-map-now')).toHaveTextContent(/نقسمو/);
    await tap('hybrid-map');
    road = within(screen.getByTestId('road-tab'));
    expect(road.getByTestId('trip-step-c_total-done')).toBeOnTheScreen();
    expect(road.getByTestId('trip-line-c_total')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_fav-done')).toBeOnTheScreen();
    expect(road.getByTestId('trip-line-c_fav')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_ratio-now')).toBeOnTheScreen();
    expect(road.getByTestId('trip-finish-later')).toBeOnTheScreen();
    expect(road.getByTestId('trip-after-recipe-later')).toBeOnTheScreen();
    await tap('board-close');

    await write('60÷120=1÷2');
    await tap('hybrid-map');
    road = within(screen.getByTestId('road-tab'));
    expect(road.getByTestId('trip-step-c_ratio-done')).toBeOnTheScreen();
    expect(road.getByTestId('trip-finish-done')).toBeOnTheScreen();
    expect(road.getByTestId('trip-after-recipe-now')).toBeOnTheScreen();
    expect(road.getByTestId('trip-after-similar-later')).toBeOnTheScreen();
  });

  it('show his steps, the exam paper and what he found: only what he earned', async () => {
    await renderQ();
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');

    await tap('board-tabs-exercise');
    expect(screen.getByTestId('exercise-tab')).toBeOnTheScreen();
    expect(screen.getByTestId('board-q-1-current')).toBeOnTheScreen();
    // The data of the statement are marked; the map showed the words (none tapped).
    expect(
      screen.getAllByTestId(/^exercise-statement-text-data-/),
    ).toHaveLength(3);
    expect(screen.queryByTestId(/^exercise-statement-text-tapped-/)).toBeNull();
    // P(A) = 1/2 is given by the statement; p(B) is not his yet.
    expect(screen.getByTestId('board-result-p_A_1_2-given')).toBeOnTheScreen();
    expect(screen.queryByTestId(/^board-result-p_B_2_2/)).toBeNull();

    await tap('sheet-tabs-road');
    const road = within(screen.getByTestId('road-tab'));
    expect(road.getByTestId('trip-have-1')).toBeOnTheScreen();
    expect(road.getByTestId('trip-goal-fr')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_total-done')).toBeOnTheScreen();
    expect(road.getByTestId('trip-line-c_total')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_fav-now')).toBeOnTheScreen();
    expect(road.getByTestId('trip-step-c_ratio-later')).toBeOnTheScreen();
    expect(road.queryByTestId('trip-line-c_fav')).toBeNull();
    expect(road.queryByTestId('road-method-card')).toBeNull();
    // The exercise from above is folded to one line; a tap opens it.
    expect(road.getByTestId('trip-overview-toggle')).toHaveTextContent(
      /السؤال1من4/,
    );
    expect(road.queryByTestId('trip-q-2')).toBeNull();
    await fireEvent.press(road.getByTestId('trip-overview-toggle'));
    expect(road.getByTestId('trip-q-2')).toBeOnTheScreen();

    await tap('sheet-tabs-found');
    expect(screen.getByTestId('found-q-1')).toBeOnTheScreen();
    for (const fill of screen.getAllByTestId('skeleton-fill-total')) {
      expect(fill).toHaveTextContent('120');
    }
    expect(screen.queryByTestId('skeleton-fill-fav')).toBeNull();
    expect(screen.getAllByTestId('skeleton-blank-fav').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByTestId('skeleton-blank-result')).toBeOnTheScreen();
    expect(screen.queryByTestId('found-card-1')).toBeNull();

    await tap('board-close');
    expect(screen.queryByTestId('board-sheet')).toBeNull();
  });

  it('question 2 shows question 1 in «اللي لقيناه» from its record', async () => {
    const { store } = await renderQ();
    await startTrip();
    await write('10×9×8÷(3×2×1)=120');
    await write('4×15=60');
    await tap('pick-card-r_true');
    await write('60÷120=1÷2');
    await renderQ({ questionId: '2', store });
    await tap('board-tabs-found');
    const q1 = screen.getByTestId('found-q-1');
    expect(
      within(q1).getAllByTestId('skeleton-fill-result')[0],
    ).toHaveTextContent('1/2');
    expect(screen.getByTestId('found-q-2')).toBeOnTheScreen();
  });
});

describe('HybridLessonScreen: the small case', () => {
  it('shows «الصندوق الصغير»: he lists its groups, his lines go under it, then back to the question', async () => {
    const move: Move = {
      blocks: [{ type: 'ar', runs: [{ ar: 'نجرّبو على صندوق صغير' }] }],
      component: null,
      tier: 'deep',
      costUsd: 0.012,
      case: { id: 'C1', spec: { kind: 'urn', reds: 2, blacks: 3, k: 3, j: 1 } },
    };
    let calls = 0;
    const mover: Mover = async () => (++calls === 1 ? move : null);
    await renderQ({ mover });
    await startTrip();
    expect(screen.queryByTestId('case-panel')).toBeNull();
    await write('4×6=24');
    await flush();
    await waitFor(() =>
      expect(screen.getByTestId('case-panel')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('case-balls')).toHaveTextContent(
      'R1  R2  N1  N2  N3',
    );
    expect(screen.getByTestId('case-drawn')).toHaveTextContent('3');

    // He lists one group (the engine checks it on the case: r1, r2, n1).
    for (const id of ['r1', 'r2', 'n1']) {
      await tap(`list-ball-${id}`);
    }
    await tap('list-add');
    await tap('list-done');
    await flush();
    await waitFor(() =>
      expect(screen.queryByTestId('hybrid-waiting')).toBeNull(),
    );
    expect(last('exchange-case_line')).toBeOnTheScreen();

    // A line about the case goes under «الصندوق الصغير» on his page.
    await write('5×4×3÷(3×2×1)=10');
    await flush();
    await waitFor(() =>
      expect(screen.queryByTestId('hybrid-waiting')).toBeNull(),
    );
    const labels = screen.getAllByTestId(/^worksheet-step-\d+$/);
    expect(labels.at(-1)).toHaveTextContent(/الصندوق الصغير/);
    expect(labels[0]).not.toHaveTextContent(/الصندوق الصغير/);

    await tap('case-back');
    expect(screen.queryByTestId('case-panel')).toBeNull();
    expect(screen.getByTestId('dev-overlay-last')).toHaveTextContent(
      /^instant:case_back/,
    );
    expect(screen.getByTestId('hybrid-map-c_total-now')).toBeOnTheScreen();
  });
});

describe('the readback choice of the conductor', () => {
  it('a line sent without a reading is asked about; his choice is sent with the line', async () => {
    const store = memoryStore();
    const { result } = await renderHook(() =>
      useHybridSession({
        loaded: loaded!,
        raw: entry.raw,
        questionId: '1',
        store,
        doneRecord: createDoneRecord(memoryStore()),
      }),
    );
    expect(result.current.touring).toBe(true);
    expect(result.current.frame).toBeNull();
    for (const a of passTour(result.current.ctx)) {
      await rtlAct(async () => {
        result.current.send(a);
      });
    }
    expect(result.current.touring).toBe(false);
    expect(result.current.road.ready).toBe(true);
    await rtlAct(async () => {
      result.current.send({ kind: 'line', raw: '720/3*2*1=120' });
    });
    expect(result.current.readback).toEqual({
      literal: '720/3*2*1=120',
      grouped: '720/(3*2*1)=120',
    });
    expect(result.current.frame?.frameId).toBe('m1.c_total');
    await rtlAct(async () => {
      result.current.chooseReadback('grouped');
    });
    expect(result.current.readback).toBeNull();
    expect(result.current.state.nodeLines.total).toBe('720/(3*2*1)=120');
    expect(result.current.frame?.frameId).toBe('m1.c_fav');
  });

  it('the step card shows both readings and sends the one he taps', async () => {
    const ctx = hybridCtx(loaded!, entry.raw, '1')!;
    const step = ctx.frames.get('m1.c_total')!;
    const onReadback = jest.fn();
    await render(
      <StepCard
        frame={{
          frameId: step.id,
          type: 'lines',
          prompt: null,
          header: null,
          hintsLeft: 2,
        }}
        step={step}
        stage={0}
        similarLines={[]}
        next={null}
        exchanges={[]}
        readback={{ literal: '720/3*2*1=120', grouped: '720/(3*2*1)=120' }}
        waiting={false}
        state={startQuestion(ctx)}
        levelOf={() => 'unknown'}
        experiment={undefined}
        live={{
          onEvent: () => {},
          onResult: () => {},
          handle: { current: null },
        }}
        onAct={() => {}}
        onReadback={onReadback}
        onFinishMove={() => {}}
        onFinishPicture={() => {}}
      />,
    );
    expect(screen.getByTestId('hybrid-readback')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('hybrid-readback-literal'));
    expect(onReadback).toHaveBeenCalledWith('literal');
  });
});
