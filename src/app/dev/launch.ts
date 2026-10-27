/**
 * Debug builds only (via src/app/dev/index.ts): launch arguments for checks
 * without tap automation.
 *   -devMode on        dev mode on at start, for that run (README "Test mode")
 *   -devTab analyse    dev tools on, open this tab (lesson|demo|proba|analyse|bidi)
 *   -devComponent X    dev tools on, open the demo tab holding component X,
 *                      showing only X's demo cases (screenshots);
 *                      X#n shows only X's n-th case (from 0)
 *   -devScroll 600     demo screens and the exam paper screen start scrolled
 *                      by this many points
 *   -devPart A1        the lesson opens on this part (1b, 2a, A1), in normal mode
 *   -devActions notSure  the opened lesson plays these actions at start
 *                      (comma-separated), e.g. a deep dive in the real lesson
 *   -devActions answerAll  the opened part is played to its done line with the
 *                      content's right answers (a real stored part_done)
 *   -devUntil sum      with answerAll: stop when this main step's card is open
 *                      (screenshots of a card mid-part, e.g. 2.a's sum)
 *   -devThen type:720,notSure  once answerAll stopped at -devUntil: type this
 *                      value on the open card / open «ما نعرفش» (comma-separated)
 *   -devDemo paperSheet  the opened lesson starts with «الورقة» open
 *   -devReset bac2022c-ex4  "start from scratch" for this exercise at launch
 *                      (the real reset: an exercise_reset event, its done
 *                      marks cleared; other exercises untouched)
 *   -devDemo resetDialog  the picker starts with exercise 4's reset dialog open
 *   -devPaperScreen bac2022c-ex4  the exam paper screen of this exercise
 *                      opens at launch (normal mode)
 *   -devPaper grid     the paper behind the feed, picker and «الورقة» sheet
 *                      (flat | grid | ruled) instead of theme.layout.paperStyle
 *   -devDemo cardMenu  the Composants tab opens with a question card's "⋯"
 *                      menu shown (screenshots of the open sheet)
 *   -devDemo longPressMenu | longPressMenuPlain  the tutor long-press menu
 *                      open, with / without its trust label and Report
 *   -devBench events   time 1,000 single-event appends + a reload in a
 *                      throwaway MMKV instance (deleted afterwards)
 *   -aiEveryMistake on  the AI tutor pilot flag on for this run (D22)
 *   -devLlm fake|fakeSlow  a scripted, free AI planner instead of the live
 *                      one (trace panel, provisional answer, fallback)
 *   -devScript real1b  the real 1.b session, played live (rules only with -devLlm off)
 *   -devStopAt walkthrough|walkthroughDone|fresh  where -devScript pauses
 *   -devLlm off        no AI client at all: rules only, never a model call
 *                      (screenshots of rules-only rounds)
 */
import { Settings } from 'react-native';

import { appStore } from '../../storage/appStore';
import { createKvEventStore } from '../../telemetry/eventStore';
import type { Event } from '../../telemetry/events';
import { scenarioLog } from './scenario';

const arg = (name: string): unknown => {
  try {
    return Settings.get(name);
  } catch {
    return undefined; // no native Settings module (Jest)
  }
};

export const devModeAtLaunch = () => String(arg('devMode')) === 'on';
export const aiEveryMistakeAtLaunch = () =>
  String(arg('aiEveryMistake')) === 'on';
/** `-devLlm fake|fakeSlow|off`: known names only. */
export const devLlmAtLaunch = (): 'fake' | 'fakeSlow' | 'off' | null => {
  const v = String(arg('devLlm'));
  return v === 'fake' || v === 'fakeSlow' || v === 'off' ? v : null;
};

const stringArg = (name: string): string | null => {
  const v = arg(name);
  return typeof v === 'string' && v.length > 0 ? v : null;
};
export const devTabAtLaunch = () => stringArg('devTab');
export const devComponentAtLaunch = () => stringArg('devComponent');
export const devPartAtLaunch = () => stringArg('devPart');
export const devDemoAtLaunch = () => stringArg('devDemo');
export const devUntilAtLaunch = () => stringArg('devUntil');
export type DevThen = { type: 'type'; raw: string } | { type: 'notSure' };
/** `-devThen type:720,notSure`: known forms only; anything else is ignored. */
export const devThenAtLaunch = (): DevThen[] =>
  (stringArg('devThen') ?? '').split(',').flatMap((a): DevThen[] => {
    const t = a.trim();
    if (t === 'notSure') {
      return [{ type: 'notSure' }];
    }
    return t.startsWith('type:') && t.length > 5
      ? [{ type: 'type', raw: t.slice(5) }]
      : [];
  });
/** `-devScript real1b` (screenshots): the real 1.b session played live by the scripted student. */
export const devScriptAtLaunch = (): 'real1b' | null =>
  stringArg('devScript') === 'real1b' ? 'real1b' : null;
/** `-devStopAt walkthrough|walkthroughDone|fresh`: where `-devScript` pauses. */
export const devStopAtLaunch = ():
  | 'walkthrough'
  | 'walkthroughDone'
  | 'fresh'
  | null => {
  const v = stringArg('devStopAt');
  return v === 'walkthrough' || v === 'walkthroughDone' || v === 'fresh'
    ? v
    : null;
};
/** `-devLongPress blockId:mode` (screenshots): that tutor block's ask, as a long-press would send it. */
export const devLongPressAtLaunch = (): {
  blockId: string;
  mode: 'explain' | 'why' | 'example';
} | null => {
  const [blockId, mode] = (stringArg('devLongPress') ?? '').split(':');
  return blockId && (mode === 'explain' || mode === 'why' || mode === 'example')
    ? { blockId, mode }
    : null;
};
export const devPaperScreenAtLaunch = () => stringArg('devPaperScreen');
/** `-devHelpLayout chips|choice`: the help layout under the active question (screenshots). */
export const devHelpLayoutAtLaunch = (): 'chips' | 'choice' | null => {
  const v = stringArg('devHelpLayout');
  return v === 'chips' || v === 'choice' ? v : null;
};
/** `-devHelpChoiceOpen on`: the «ما نعرفش» choice starts open (screenshots). */
export const devHelpChoiceOpenAtLaunch = () =>
  String(arg('devHelpChoiceOpen')) === 'on';
/** `-devScrollEnd on`: the lesson feed stays at its end (screenshots of the footer). */
export const devScrollEndAtLaunch = () => String(arg('devScrollEnd')) === 'on';
/** `-devWidth 360`: clamps the lesson column (screenshots of a narrow phone; not a real device). */
export const devWidthAtLaunch = (): number | null => {
  const v = Number(arg('devWidth'));
  return Number.isFinite(v) && v >= 280 && v <= 600 ? v : null;
};
export const devResetAtLaunch = () => stringArg('devReset');
/** `-devPaper flat|grid|ruled`: known names only; anything else is ignored. */
export const devPaperAtLaunch = (): 'flat' | 'grid' | 'ruled' | null => {
  const v = stringArg('devPaper');
  return v === 'flat' || v === 'grid' || v === 'ruled' ? v : null;
};
type DevAction =
  | 'notSure'
  | 'answerAll'
  | 'wrong'
  | 'declineOffer'
  | 'acceptOffer'
  | 'back';
/** `-devActions notSure|answerAll[,…]`: known names only; anything else is ignored. */
export const devActionsAtLaunch = (): DevAction[] =>
  (stringArg('devActions') ?? '')
    .split(',')
    .map(a => a.trim())
    .filter(
      (a): a is DevAction =>
        a === 'notSure' ||
        a === 'answerAll' ||
        a === 'wrong' ||
        a === 'declineOffer' ||
        a === 'acceptOffer' ||
        a === 'back',
    );
export const devScrollAtLaunch = (): number => {
  const v = Number(arg('devScroll'));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function runDevBench() {
  if (arg('devBench') !== 'events') {
    return;
  }
  const kv = appStore('tteclair-bench');
  const store = createKvEventStore(kv);
  store.clear();
  const base = {
    sessionId: 'bench',
    studentId: 'bench',
    exerciseId: 'bac2022c-ex2',
    contentVersion: 'ex2-0.5.0',
    questionId: '2a',
    stepId: 's10',
  };
  const n = 1000;
  const times: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const e: Event = {
      ...base,
      id: `b${i}`,
      ts: Date.now(),
      t: 'component_event',
      component: 'EventPicker',
      name: 'toggle',
      payload: { instanceId: 'q2a-s10', outcomeId: 'a-b', selected: true },
    };
    const t0 = Date.now();
    store.append([e]);
    times.push(Date.now() - t0);
  }
  const t1 = Date.now();
  const loaded = store.load().length;
  const loadMs = Date.now() - t1;
  times.sort((a, b) => a - b);
  scenarioLog('bench', {
    appends: n,
    totalMs: times.reduce((s, x) => s + x, 0),
    p50Ms: times[Math.floor(n * 0.5)],
    p99Ms: times[Math.floor(n * 0.99)],
    maxMs: times[n - 1],
    loadMs,
    loaded,
    stats: store.stats(),
  });
  store.clear();
}
