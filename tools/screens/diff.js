#!/usr/bin/env node
/* eslint-env node */
/**
 * Pixel diff of two folders of simulator screenshots.
 *   node tools/screens/diff.js <dirA> <dirB> [--quiet] [--strict]
 * Prints one line per file: identical, DIFF with the pixel count and bounding
 * box, or MISSING. Exit code 1 if any file differs or is missing. A channel
 * difference of 2 or less is noise; `--strict` counts every difference.
 * Masks: the status bar zone (the clock and battery are fixed with
 * `simctl status_bar override`) and the perf-timing lines of the demo tabs
 * (React commit times differ on every run).
 */
const fs = require('fs');
const path = require('path');

const { decode } = require('./png');

/**
 * [filename regex, x, y, width, height] in device pixels (3x), by screenshot
 * width: 1206 = iPhone 17 Pro, 1170 = iPhone 16e. The perf panel of the demo
 * tabs prints React commit times ("FunctionPlot: n=2 median=26.7 ms"): its
 * text lines change on every run and are masked; nothing else on the panel is.
 */
const DEMO = /^(tab-)?(proba|analyse)-/;
const MASKS = [
  { name: /./, width: 0, rect: [0, 0, 1300, 175] }, // status bar zone
  { name: DEMO, width: 1206, rect: [0, 320, 1300, 100] },
  { name: DEMO, width: 1170, rect: [0, 275, 1300, 100] },
  // The unfiltered tabs list the timing of every component on their panel.
  // (They also repeat the first cases, which have their own screenshots.)
  { name: /^tab-(proba|analyse)-00/, width: 1206, rect: [0, 320, 1300, 2400] },
  { name: /^tab-(proba|analyse)-00/, width: 1170, rect: [0, 275, 1300, 2400] },
];

/** A channel that differs by at most this is anti-aliasing noise (253,253,254 vs 253,254,255), not a change. */
const TOLERANCE = 2;

function masked(name, width, x, y) {
  return MASKS.some(({ name: re, width: w, rect: [mx, my, mw, mh] }) => {
    return (
      re.test(name) &&
      (w === 0 || w === width) &&
      x >= mx &&
      x < mx + mw &&
      y >= my &&
      y < my + mh
    );
  });
}

function compare(name, a, b, tolerance) {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    return { same: false, note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  let count = 0;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  const ch = a.channels;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * ch;
      let diff = false;
      for (let c = 0; c < ch; c++) {
        if (Math.abs(a.data[i + c] - b.data[i + c]) > tolerance) {
          diff = true;
          break;
        }
      }
      if (diff && !masked(name, a.width, x, y)) {
        count++;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return count === 0
    ? { same: true }
    : { same: false, note: `${count} px, box x ${x0}-${x1}, y ${y0}-${y1}` };
}

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const quiet = process.argv.includes('--quiet');
  const strict = process.argv.includes('--strict');
  const [dirA, dirB] = args;
  if (!dirA || !dirB) {
    console.error('usage: diff.js <dirA> <dirB> [--quiet] [--strict]');
    process.exit(2);
  }
  const list = d =>
    fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.png')) : [];
  const names = [...new Set([...list(dirA), ...list(dirB)])].sort();
  let same = 0;
  let bad = 0;
  for (const name of names) {
    const pa = path.join(dirA, name);
    const pb = path.join(dirB, name);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) {
      console.log(`MISSING  ${name} (${fs.existsSync(pa) ? 'B' : 'A'} lacks it)`);
      bad++;
      continue;
    }
    const r = compare(
      name,
      decode(fs.readFileSync(pa)),
      decode(fs.readFileSync(pb)),
      strict ? 0 : TOLERANCE,
    );
    if (r.same) {
      same++;
      if (!quiet) {
        console.log(`same     ${name}`);
      }
    } else {
      bad++;
      console.log(`DIFF     ${name}  ${r.note}`);
    }
  }
  console.log(`\n${names.length} files: ${same} identical, ${bad} different or missing`);
  process.exit(bad === 0 ? 0 : 1);
}

main();
