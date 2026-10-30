#!/usr/bin/env node
/* eslint-env node */
/* global Atomics, SharedArrayBuffer */
/**
 * Baseline / after captures of the debug app on an iOS simulator, with the AI
 * off (`-devLlm off`: no client is built, so no model call can happen).
 *   node tools/screens/capture.js <p17|p16e> <outDir> [--only <regex>] [--keep-app]
 * p17 = iPhone 17 Pro (402 pt), p16e = iPhone 16e (390 pt). Metro must be
 * serving the bundle on port 8081 (`npx react-native start`).
 *
 * Order matters and is fixed: the app is reinstalled first (empty storage),
 * the cases that only read run next, and the `-devActions answerAll` cases
 * (they write stored events and done marks) run last. Two runs with the same
 * code are therefore comparable file by file with diff.js.
 * Untracked on purpose (docs/COMPONENTS_PROBABILITY_V2.md section 8, Q11).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEVICES = {
  p17: '27978103-59E7-4963-99A8-91E1319449B9',
  p16e: '7B5AAEAC-353D-4D86-AF96-69A709747C51',
};
const BUNDLE = 'org.reactjs.native.example.NewTTClair';
const APP =
  process.env.APP ||
  path.join(
    os.homedir(),
    'Library/Developer/Xcode/DerivedData/NewTTClair-bgjibhuktxfepibdgzqvdwsqrwwp/Build/Products/Debug-iphonesimulator/NewTTClair.app',
  );
const STEP = 600; // scroll step for the unfiltered tabs (less than the visible height)
const MIN_WAIT_MS = 4500;
const POLL_MS = 1200;

const simctl = (...a) =>
  execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', timeout: 90000 });
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/** [name, launch args] for cases that read only. */
const PROBA = [
  ['Urn', 3],
  ['OutcomeSpace', 2],
  ['EventPicker', 1],
  ['ComplementView', 1],
  ['LawBuilder', 2],
  ['LawChart', 2],
];
const ANALYSE = [
  ['FunctionPlot', 3],
  ['PointOnCurve', 1],
  ['FoldSymmetry', 1],
  ['LimitExplorer', 2],
  ['SecantToTangent', 2],
  ['TangentSlope', 1],
  ['VariationTableBuilder', 1],
  ['PredictReveal', 1],
  ['CompareTwo', 2],
  ['ExampleGenerator', 2],
  ['NumericTwin', 1],
  ['StepThrough', 1],
  ['LinesEditor', 10],
];

const READ_ONLY = [
  ['picker', []],
  ...PROBA.flatMap(([c, n]) =>
    range(n, i => [`proba-${c}-${i}`, ['-devComponent', `${c}#${i}`]]),
  ),
  ...ANALYSE.flatMap(([c, n]) =>
    range(n, i => [`analyse-${c}-${i}`, ['-devComponent', `${c}#${i}`]]),
  ),
  ['lesson-1b', ['-devPart', '1b']],
  ['lesson-2a', ['-devPart', '2a']],
  ['lesson-A1', ['-devPart', 'A1']],
  ['lesson-scex2-q1', ['-devPart', 'bac2022c-sc-ex2/1']],
];
/** Unfiltered tabs, walked down by STEP until the screenshot stops changing. */
const TABS = ['lesson', 'demo', 'proba', 'analyse', 'bidi'];
/** Write stored events and done marks: last. */
const MUTATING = [
  ['lesson-2a-until-sum', ['-devPart', '2a', '-devActions', 'answerAll', '-devUntil', 'sum']],
  ['lesson-scex2-q1-until-s4', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll', '-devUntil', 's4']],
  ['lesson-scex2-q1-until-s6', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll', '-devUntil', 's6']],
  ['lesson-scex2-q1-until-s8', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll', '-devUntil', 's8']],
  ['lesson-scex2-q1-end', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll']],
  ['lesson-2a-end', ['-devPart', '2a', '-devActions', 'answerAll']],
  ['lesson-1b-end', ['-devPart', '1b', '-devActions', 'answerAll']],
  ['picker-after-play', []],
  // Phase 4a: the lesson stopped while a picture holds it (a gate), then at the next question.
  ['lesson-scex2-q1-until-boxes', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll', '-devUntil', 'boxes']],
  ['lesson-scex2-q1-until-choice', ['-devPart', 'bac2022c-sc-ex2/1', '-devActions', 'answerAll', '-devUntil', 'choice']],
];

/**
 * `--v2 [width]`: only the probability2 demo cases (GroupBoxes, ChoiceProduct, SlotsPattern, PartWholeBar),
 * each scrolled past the perf panel (a) and further down (b: the replay under
 * the live one); with a width, `-devWidth` clamps the demo column to it
 * (360 pt has no simulator).
 */
const V2 = [
  ['GroupBoxes', 5],
  ['ChoiceProduct', 5],
  ['SlotsPattern', 5],
  ['PartWholeBar', 5],
  ['SpreadSlider', 5],
  ['RepeatedRuns', 5],
  ['VariableTable', 5],
  ['BinomialExplorer', 5],
  ['EventAreaModel', 5],
  ['UrnTemplate', 5],
];
const V2_SCROLL = [270, 870];

/** `--lesson [width]`: question 1 stopped at each picture and the question after it (390 pt, or `-devWidth` width). */
const LESSON_STOPS = ['boxes', 's4', 'choice', 's6'];

function main() {
  const argv = process.argv.slice(2);
  const [dev, outDir] = argv;
  if (!DEVICES[dev] || !outDir) {
    console.error('usage: capture.js <p17|p16e> <outDir> [--only <regex>] [--keep-app]');
    process.exit(2);
  }
  const udid = DEVICES[dev];
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 ? new RegExp(argv[onlyIdx + 1]) : null;
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, '.settle.png');

  const shot = file => simctl('io', udid, 'screenshot', file);
  function launch(args) {
    try {
      simctl('terminate', udid, BUNDLE);
    } catch {
      // not running
    }
    simctl('launch', udid, BUNDLE, '-devLlm', 'off', ...args);
  }
  /** Waits for the screen to stop changing, then writes the final frame. */
  function settle(file) {
    sleep(MIN_WAIT_MS);
    shot(tmp);
    let prev = fs.readFileSync(tmp);
    for (let i = 0; i < 14; i++) {
      sleep(POLL_MS);
      shot(tmp);
      const cur = fs.readFileSync(tmp);
      if (cur.equals(prev)) {
        break;
      }
      prev = cur;
    }
    fs.writeFileSync(file, prev);
    return prev;
  }
  const take = (name, args) => {
    if (only && !only.test(name)) {
      return null;
    }
    launch(args);
    const buf = settle(path.join(outDir, `${name}.png`));
    console.log(`${dev} ${name}`);
    return buf;
  };

  try {
    simctl('boot', udid);
  } catch {
    // already booted
  }
  const v2 = argv.indexOf('--v2');
  const v2Width = v2 >= 0 && /^\d+$/.test(argv[v2 + 1] ?? '') ? argv[v2 + 1] : null;
  simctl('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3', '--cellularMode', 'active');
  if (!argv.includes('--keep-app')) {
    try {
      simctl('uninstall', udid, BUNDLE);
    } catch {
      // not installed
    }
    simctl('install', udid, APP);
  }

  const les = argv.indexOf('--lesson');
  if (les >= 0) {
    const w = /^\d+$/.test(argv[les + 1] ?? '') ? argv[les + 1] : null;
    for (const stop of LESSON_STOPS) {
      take(`lesson${w ? `-w${w}` : ''}-${stop}`, [
        '-devPart',
        'bac2022c-sc-ex2/1',
        '-devActions',
        'answerAll',
        '-devUntil',
        stop,
        ...(w ? ['-devWidth', w] : []),
      ]);
    }
    fs.rmSync(tmp, { force: true });
    return;
  }
  if (v2 >= 0) {
    for (const [c, n] of V2) {
      for (let i = 0; i < n; i++) {
        V2_SCROLL.forEach((y, part) => {
          take(`v2${v2Width ? `w${v2Width}` : ''}-${c}-${i}${'ab'[part]}`, [
            '-devComponent',
            `${c}#${i}`,
            '-devScroll',
            String(y),
            ...(v2Width ? ['-devWidth', v2Width] : []),
          ]);
        });
      }
    }
    fs.rmSync(tmp, { force: true });
    return;
  }
  for (const [name, args] of READ_ONLY) {
    take(name, args);
  }
  for (const tab of TABS) {
    let prev = null;
    for (let i = 0; i < 40; i++) {
      const name = `tab-${tab}-${String(i).padStart(2, '0')}`;
      if (only && !only.test(name)) {
        continue;
      }
      const buf = take(name, ['-devTab', tab, '-devScroll', String(i * STEP)]);
      if (buf && prev && buf.equals(prev)) {
        fs.unlinkSync(path.join(outDir, `${name}.png`));
        break;
      }
      prev = buf;
    }
  }
  for (const [name, args] of MUTATING) {
    take(name, args);
  }
  fs.rmSync(tmp, { force: true });
}

main();
