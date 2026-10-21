/// <reference types="node" />
/**
 * Replay CLI. Usage (npm run replay -- <command> ...):
 *   table   <log.jsonl> [--unknowns <file>]     decision points and the rules planner's choice
 *   convert <legacy.jsonl> --map <map.json> --out <log.jsonl>
 *                                               prototype log -> current format (+ .unknowns.json)
 *   agree   <log.jsonl> <labels.json> [--unknowns <file>]
 *                                               planner vs labels, per decision point
 *   reports <queue.jsonl>                       exported report / question queue as a table
 *   guard                                       output guard on the hand-written planner fixtures
 */
import { readFileSync, writeFileSync } from 'node:fs';

import ex2 from '../../src/content/exercises/bac2022c-ex2.json';
import ex2Misconceptions from '../../src/content/exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from '../../src/content/loader';
import {
  LEGACY_VERSION,
  LabelsSchema,
  LegacyMapSchema,
  agreement,
  convertLegacy,
  formatAgreement,
  formatTable,
  readLog,
  replayDecisions,
  type Unknowns,
} from './lib';
import { readQueueExport } from '../../src/telemetry/reports';
import { formatReports } from './reports';
import {
  formatGuardRows,
  runGuardFixtures,
} from '../../src/planner/llm/fixtures/guardFixtures';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function loaded() {
  const r = loadExercise(ex2, ex2Misconceptions);
  if (!r.ok) {
    fail(`content does not load:\n${r.errors.join('\n')}`);
  }
  return r.loaded;
}

function readEvents(path: string, unknownsPath?: string) {
  const { events, errors } = readLog(readFileSync(path, 'utf8'));
  for (const e of errors) {
    process.stderr.write(`${path}:${e.line}: skipped (${e.issue})\n`);
  }
  const guessPath = unknownsPath ?? path.replace(/\.jsonl$/, '.unknowns.json');
  let unknowns: Unknowns | undefined;
  try {
    unknowns = JSON.parse(readFileSync(guessPath, 'utf8')) as Unknowns;
  } catch {
    unknowns = undefined;
  }
  return { events, unknowns };
}

function banner(
  events: { contentVersion: string }[],
  unknowns?: Unknowns,
): string {
  const lines: string[] = [];
  if (events.some(e => e.contentVersion === LEGACY_VERSION)) {
    lines.push(
      'NOTE: legacy log converted with a GUESSED step map (old ids -> current steps). Rows on mapped steps are only as good as that guess.',
    );
  }
  if (unknowns) {
    lines.push(
      `Unknown in the source log: ${Object.entries(unknowns.global)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')}`,
    );
  }
  return lines.join('\n');
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'convert': {
    const [input] = args;
    const mapPath = flag(args, '--map');
    const outPath = flag(args, '--out');
    if (!input || !mapPath || !outPath) {
      fail('usage: convert <legacy.jsonl> --map <map.json> --out <log.jsonl>');
    }
    const map = LegacyMapSchema.parse(
      JSON.parse(readFileSync(mapPath, 'utf8')),
    );
    const r = convertLegacy(readFileSync(input, 'utf8'), map, loaded());
    for (const e of r.errors) {
      process.stderr.write(`${e}\n`);
    }
    writeFileSync(
      outPath,
      `${r.events.map(e => JSON.stringify(e)).join('\n')}\n`,
    );
    const unknownsPath = outPath.replace(/\.jsonl$/, '.unknowns.json');
    writeFileSync(unknownsPath, `${JSON.stringify(r.unknowns, null, 2)}\n`);
    process.stdout.write(
      `wrote ${r.events.length} events to ${outPath} and ${unknownsPath}\n`,
    );
    break;
  }
  case 'table': {
    const [input] = args;
    if (!input) {
      fail('usage: table <log.jsonl>');
    }
    const { events, unknowns } = readEvents(input, flag(args, '--unknowns'));
    const rows = replayDecisions(
      events,
      loaded(),
      unknowns ? { unknowns } : {},
    );
    process.stdout.write(
      `${banner(events, unknowns)}\n\n${formatTable(rows)}\n`,
    );
    break;
  }
  case 'agree': {
    const [input, labelsPath] = args;
    if (!input || !labelsPath) {
      fail('usage: agree <log.jsonl> <labels.json>');
    }
    const { events, unknowns } = readEvents(input, flag(args, '--unknowns'));
    const labels = LabelsSchema.parse(
      JSON.parse(readFileSync(labelsPath, 'utf8')),
    );
    const rows = replayDecisions(
      events,
      loaded(),
      unknowns ? { unknowns } : {},
    );
    process.stdout.write(
      `${banner(events, unknowns)}\n\n${formatAgreement(
        agreement(rows, labels),
        labels,
      )}\n`,
    );
    break;
  }
  case 'reports': {
    const [input] = args;
    if (!input) {
      fail('usage: reports <queue.jsonl>');
    }
    const { entries, errors } = readQueueExport(readFileSync(input, 'utf8'));
    process.stdout.write(`${formatReports(entries, errors)}\n`);
    break;
  }
  case 'guard': {
    runGuardFixtures().then(rows =>
      process.stdout.write(`${formatGuardRows(rows)}\n`),
    );
    break;
  }
  default:
    fail(
      'commands: table | convert | agree | reports | guard (see tools/replay/README.md)',
    );
}
