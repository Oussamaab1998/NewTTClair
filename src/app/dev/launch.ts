/**
 * Debug builds only (via src/app/dev/index.ts): launch arguments for checks
 * without tap automation.
 *   -devTools 1        dev tools on at start
 *   -devTab analyse    dev tools on, open this tab (lesson|demo|proba|analyse|bidi)
 *   -devComponent X    dev tools on, open the demo tab holding component X,
 *                      showing only X's demo cases (screenshots);
 *                      X#n shows only X's n-th case (from 0)
 *   -devScroll 600     demo screens start scrolled by this many points
 *   -devPart A1        the lesson opens on this part (1b, 2a, A1)
 *   -devBench events   time 1,000 single-event appends + a reload in a
 *                      throwaway MMKV instance (deleted afterwards)
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

export const devToolsAtLaunch = () => String(arg('devTools')) === '1';

const stringArg = (name: string): string | null => {
  const v = arg(name);
  return typeof v === 'string' && v.length > 0 ? v : null;
};
export const devTabAtLaunch = () => stringArg('devTab');
export const devComponentAtLaunch = () => stringArg('devComponent');
export const devPartAtLaunch = () => stringArg('devPart');
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
