/**
 * Is this exercise ready, and if not, what is the next thing to do?
 *
 *   npm run check:exercise -- <id>            every stage, then its own tests
 *   npm run check:exercise -- <id> --stage 2  stages 1 and 2 only (the work so far)
 *   npm run check:exercise -- <id> --fast     no jest run at the end
 *
 * It reads the exercise's files from disk (registered in the app or not
 * yet), runs the same rules as the tests (src/content/help/checks.ts,
 * src/hybrid/tour/checks.ts, the loader, the warm-up checks) and prints one
 * ✓ or ✗ per rule, in the order of docs/NEW_EXERCISE.md, each ✗ with where
 * to fix it. A few seconds: run it after every piece of work, not at the end.
 * Exit code 1 when a checked stage has a ✗.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

import { TUTOR_NOTES } from '../../src/ai/packs/notes';
import { bannedIn } from '../../src/ai/prompt/lexicon';
import { CATALOG, loadChecked } from '../../src/app/exercises';
import { CURRICULUM } from '../../src/content/curriculum';
import {
  HELP_CHECKS,
  helpedFrames,
  questionsOf,
} from '../../src/content/help/checks';
import { HELP_SOURCES } from '../../src/content/help/help';
import { HelpFileSchema } from '../../src/content/help/schema';
import type { LoadedExercise } from '../../src/content/loader';
import { questionCtx } from '../../src/hybrid/conductor/conductor';
import { tripIssues, zodLines } from '../../src/hybrid/tour/checks';
import { planStep, tourFor } from '../../src/hybrid/tour/tour';
import { parseLatexSubset } from '../../src/lesson/math/latexSubset';
import { findRunIssues, toPlainText } from '../../src/lesson/rich/runs';
import { warmupIssues, warmupTopics } from '../../src/warmup/warmup';
import {
  filesOf,
  ID_PATTERN,
  ownTests,
  placeholdersIn,
  readJson,
  rel,
  ROOT,
  tripsFileFor,
} from './files';

/** `warn`: worth doing, not required (shown, the exit code stays 0). */
type Status = 'ok' | 'fail' | 'warn' | 'wait';
interface Row {
  status: Status;
  title: string;
  /** What is wrong, one line each. */
  detail?: string[];
  /** Where to fix it. */
  fix?: string;
}
interface Stage {
  n: number;
  title: string;
  rows: Row[];
}

const row = (title: string, issues: readonly string[], fix?: string): Row => ({
  status: issues.length === 0 ? 'ok' : 'fail',
  title,
  ...(issues.length > 0 ? { detail: [...issues] } : {}),
  ...(issues.length > 0 && fix !== undefined ? { fix } : {}),
});
const warn = (r: Row): Row =>
  r.status === 'fail' ? { ...r, status: 'warn' } : r;
const wait = (title: string, why: string): Row => ({
  status: 'wait',
  title,
  detail: [why],
});

function readFile(file: string): { raw: unknown } | { error: string } {
  if (!fs.existsSync(file)) {
    return { error: `missing: ${rel(file)}` };
  }
  try {
    return { raw: readJson(file) };
  } catch (e) {
    return { error: `${rel(file)} is not JSON: ${(e as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Stage 1: the exercise.

function walkTexts(v: unknown, ar: string[], math: string[]): void {
  if (Array.isArray(v)) {
    v.forEach(x => walkTexts(x, ar, math));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === 'ar' && typeof x === 'string') {
        ar.push(x);
      } else if (k === 'math' && typeof x === 'string') {
        math.push(x);
      } else {
        walkTexts(x, ar, math);
      }
    }
  }
}

function warmupRows(loaded: LoadedExercise, raw: unknown): string[] {
  const w = loaded.exercise.warmup;
  if (!w) {
    return ['no warm-up yet (the exercise JSON\'s "warmup", docs/WARMUP.md)'];
  }
  const out = [...warmupIssues(w)];
  if (w.start.length < 3) {
    out.push(`starts with ${w.start.length} questions, at least 3`);
  }
  if (w.reviewed) {
    out.push('reviewed: true (a teacher has not read it yet: false)');
  }
  for (const q of w.questions) {
    if (!/^[a-zà-öø-ÿœ' ]+$/.test(q.topic)) {
      out.push(`${q.id}: topic «${q.topic}» is not a short French term`);
    }
  }
  const topics = warmupTopics(w);
  if (new Set(topics).size !== topics.length || topics.length < 3) {
    out.push(`main topics ${topics.join(', ')}: 3 or more, each once`);
  }
  const ar: string[] = [];
  const math: string[] = [];
  walkTexts((raw as { warmup?: unknown }).warmup, ar, math);
  for (const t of ar) {
    for (const b of bannedIn(t)) {
      out.push(`banned «${b.phrase}» (say «${b.use}»): ${t}`);
    }
    if (/[0-9]/.test(t) || findRunIssues([{ ar: t }]).length > 0) {
      out.push(`not Arabic only (digits, Latin or math go in "math"): ${t}`);
    }
  }
  for (const m of math) {
    try {
      parseLatexSubset(m);
    } catch {
      out.push(`the renderer cannot draw ${m}`);
    }
  }
  return out;
}

function boardRows(loaded: LoadedExercise, raw: unknown): string[] {
  return questionsOf(raw).flatMap(q => {
    const ctx = questionCtx(loaded, raw as never, q);
    const out: string[] = [];
    if (!planStep(ctx)) {
      out.push(`${q}: no plan frame (the steps' cards)`);
    }
    if (helpedFrames(ctx).length === 0) {
      out.push(`${q}: no step where he writes a line or picks a card`);
    }
    return out;
  });
}

/** Question ids are unique across the app (a part is found by its id alone); titles tell the cards apart. */
function clashes(id: string, loaded: LoadedExercise): string[] {
  const out: string[] = [];
  const title = toPlainText(loaded.exercise.title.ar);
  for (const e of CATALOG) {
    if (e.id === id || !e.result.ok) {
      continue;
    }
    const other = e.result.loaded.exercise;
    const same = loaded.exercise.parts
      .map(p => p.id)
      .filter(p => other.parts.some(o => o.id === p));
    if (same.length > 0) {
      out.push(
        `question ids ${same.join(', ')} are also ${
          e.id
        }'s (prefix them: «t1» → «s3t1»)`,
      );
    }
    if (toPlainText(other.title.ar) === title) {
      out.push(`the Arabic title «${title}» is also ${e.id}'s`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

function curriculumIssues(id: string, loaded: LoadedExercise): string[] {
  const parts = loaded.exercise.parts.map(p => p.id);
  const links = CURRICULUM.tracks.flatMap(track =>
    track.chapters.flatMap(c =>
      c.exercises
        .filter(e => e.id === id)
        .map(link => ({ track, chapter: c.id, parts: link.parts ?? parts })),
    ),
  );
  if (links.length === 0) {
    return ['no chapter links it (src/content/curriculumMap.json)'];
  }
  const out: string[] = [];
  const covered = new Set<string>();
  for (const l of links) {
    const section = loaded.exercise.section;
    if (section !== undefined && !l.track.sections.includes(section)) {
      out.push(
        `${l.chapter}: its track is for ${
          l.track.sections.join(', ') || 'every section'
        }, the exercise is ${section}`,
      );
    }
    for (const p of l.parts) {
      if (!parts.includes(p)) {
        out.push(
          `${l.chapter}: names a question ${p} the exercise does not have`,
        );
      }
      covered.add(p);
    }
  }
  const missing = parts.filter(p => !covered.has(p));
  if (missing.length > 0) {
    out.push(`no chapter for ${missing.join(', ')}`);
  }
  return out;
}

function notesIssues(id: string, raw: unknown): string[] {
  const notes = TUTOR_NOTES[id];
  if (!notes) {
    return ['no tutor notes (src/ai/packs/notes.ts, TUTOR_NOTES)'];
  }
  return questionsOf(raw).flatMap(q => {
    const n = notes[q];
    if (!n) {
      return [`${q}: no notes`];
    }
    return placeholdersIn(n).length > 0
      ? [`${q}: the route still has a placeholder`]
      : [];
  });
}

function runJest(files: readonly string[]): string[] {
  try {
    execFileSync('npx', ['jest', '--silent', ...files.map(f => rel(f))], {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return [];
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    const text = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
    const failed = text
      .split('\n')
      .filter(l => /●|Tests:|FAIL/.test(l))
      .map(l => l.trim())
      .filter((l, i, a) => a.indexOf(l) === i);
    return failed.length > 0 ? failed : ['jest failed (run it to see why)'];
  }
}

// ---------------------------------------------------------------------------

function check(id: string, fast: boolean): Stage[] {
  const files = filesOf(id);
  const stages: Stage[] = [];

  // Stage 1.
  const s1: Row[] = [];
  const ex = readFile(files.exercise);
  const mis = readFile(files.misconceptions);
  s1.push(
    row(
      'the exercise file',
      'error' in ex
        ? [ex.error]
        : (ex.raw as { id?: unknown }).id === id
        ? []
        : [`its "id" is not ${id}`],
      `npm run new-exercise -- ${id}`,
    ),
  );
  s1.push(
    row(
      'its misconceptions file',
      'error' in mis
        ? [mis.error]
        : Array.isArray(mis.raw)
        ? []
        : ['not a JSON array'],
    ),
  );
  let loaded: LoadedExercise | null = null;
  const raw = 'raw' in ex ? ex.raw : undefined;
  if ('raw' in ex && 'raw' in mis) {
    const r = loadChecked(ex.raw, mis.raw);
    if (r.ok) {
      loaded = r.loaded;
    }
    s1.push(
      row(
        'it loads (schema, engine values, method graphs)',
        r.ok ? [] : r.errors,
        rel(files.exercise),
      ),
    );
  } else {
    s1.push(
      wait(
        'it loads (schema, engine values, method graphs)',
        'needs both files',
      ),
    );
  }
  const needs1 = 'waits for stage 1: the exercise must load';
  if (loaded) {
    s1.push(
      row(
        'its own question ids and title (no other exercise of the app has them)',
        clashes(id, loaded),
        rel(files.exercise),
      ),
    );
    s1.push(
      row(
        'reviewed: false (a teacher reads it before release)',
        loaded.exercise.reviewed ? ['reviewed is true'] : [],
      ),
    );
    s1.push(
      row(
        'every question is led on the board (a plan, steps to write or pick)',
        boardRows(loaded, raw),
        rel(files.exercise),
      ),
    );
    s1.push(
      row(
        'its warm-up (3+ questions, Tunisian Arabic, drawable formulas)',
        warmupRows(loaded, raw),
        rel(files.exercise),
      ),
    );
  } else {
    s1.push(wait('every question is led on the board', needs1));
    s1.push(wait('its warm-up', needs1));
  }
  if (raw !== undefined) {
    s1.push(
      row(
        'nothing left from the skeleton',
        placeholdersIn(raw),
        rel(files.exercise),
      ),
    );
  }
  stages.push({ n: 1, title: 'the exercise', rows: s1 });

  // Stage 2.
  const s2: Row[] = [];
  const tripsFile = tripsFileFor(id);
  const trips = tripsFile
    ? readFile(tripsFile)
    : { error: `missing: ${rel(files.trips)}` };
  s2.push(
    row(
      'the maps file',
      'error' in trips ? [trips.error] : [],
      `npm run new-exercise -- ${id}`,
    ),
  );
  if ('raw' in trips) {
    s2.push(
      loaded
        ? row(
            'one map per question, its steps the plan cards',
            tripIssues(loaded, raw, trips.raw),
            tripsFile ? rel(tripsFile) : undefined,
          )
        : wait('one map per question, its steps the plan cards', needs1),
    );
    s2.push(
      row(
        'nothing left from the skeleton',
        placeholdersIn(trips.raw),
        tripsFile ? rel(tripsFile) : undefined,
      ),
    );
  }
  stages.push({ n: 2, title: 'the maps (trips)', rows: s2 });

  // Stage 3.
  const s3: Row[] = [];
  const helpRaw = readFile(files.help);
  const help = 'raw' in helpRaw ? HelpFileSchema.safeParse(helpRaw.raw) : null;
  s3.push(
    row(
      'the help file parses',
      'error' in helpRaw
        ? [helpRaw.error]
        : help && !help.success
        ? zodLines(help.error.issues)
        : help && help.success && help.data.exerciseId !== id
        ? [`its exerciseId is ${help.data.exerciseId}`]
        : [],
      rel(files.help),
    ),
  );
  if (help?.success) {
    for (const c of HELP_CHECKS) {
      s3.push(
        loaded
          ? row(
              c.title,
              c.run({ loaded, raw, help: help.data }),
              rel(files.help),
            )
          : wait(c.title, needs1),
      );
    }
    s3.push(
      row(
        'nothing left from the skeleton',
        'raw' in helpRaw ? placeholdersIn(helpRaw.raw) : [],
        rel(files.help),
      ),
    );
  }
  stages.push({
    n: 3,
    title: 'the help (3 levels per step, glossary)',
    rows: s3,
  });

  // Stage 4.
  const s4: Row[] = [];
  const register = `npm run new-exercise -- ${id} --register`;
  const firstQuestion = raw !== undefined ? questionsOf(raw)[0] : undefined;
  s4.push(
    row(
      'in the app (src/app/exercises.ts)',
      CATALOG.some(e => e.id === id) ? [] : ['not in CATALOG'],
      register,
    ),
  );
  s4.push(
    row(
      'its help is read (src/content/help/help.ts)',
      HELP_SOURCES[id] !== undefined ? [] : ['not in HELP_SOURCES'],
      register,
    ),
  );
  s4.push(
    row(
      'its maps are read (src/hybrid/tour/tour.ts)',
      firstQuestion !== undefined && tourFor(id, firstQuestion) !== null
        ? []
        : ['not in SOURCES (or the file does not parse)'],
      register,
    ),
  );
  s4.push(
    loaded
      ? row(
          'in its chapter (src/content/curriculumMap.json)',
          curriculumIssues(id, loaded),
          register,
        )
      : wait('in its chapter', needs1),
  );
  s4.push(
    raw !== undefined
      ? warn(
          row(
            'tutor notes for every question, for the AI teacher (src/ai/packs/notes.ts)',
            notesIssues(id, raw),
            'src/ai/packs/notes.ts',
          ),
        )
      : wait('tutor notes', needs1),
  );
  const tests = ownTests(id);
  const play = files.playTest;
  const playText = fs.existsSync(play) ? fs.readFileSync(play, 'utf8') : null;
  s4.push(
    row(
      'its own test plays every question to its end',
      playText === null
        ? [`missing: ${rel(play)}`]
        : /\bit\.todo\(|\btest\.todo\(/.test(playText)
        ? [`${rel(play)} still has todo tests`]
        : [],
      rel(play),
    ),
  );
  if (!fast && tests.length > 0) {
    s4.push(
      row(
        `its own tests pass (${tests.length} file${
          tests.length > 1 ? 's' : ''
        })`,
        runJest(tests),
      ),
    );
  }
  stages.push({ n: 4, title: 'in the app', rows: s4 });
  return stages;
}

// ---------------------------------------------------------------------------

const tty = process.stdout.isTTY;
const paint = (code: number, s: string) =>
  tty ? `\u001b[${code}m${s}\u001b[0m` : s;
const MARK: Record<Status, string> = {
  ok: paint(32, '✓'),
  fail: paint(31, '✗'),
  warn: paint(33, '⚠'),
  wait: paint(90, '·'),
};
const MAX_DETAIL = 8;

function main(): number {
  const args = process.argv.slice(2);
  const id = args.find(a => !a.startsWith('--'));
  const stageArg = args.indexOf('--stage');
  const upTo = stageArg >= 0 ? Number(args[stageArg + 1]) : 4;
  const fast = args.includes('--fast');
  if (!id || !ID_PATTERN.test(id) || !(upTo >= 1 && upTo <= 4)) {
    console.error(
      'usage: npm run check:exercise -- <exercise-id> [--stage 1-4] [--fast]',
    );
    return 2;
  }
  const stages = check(id, fast || upTo < 4).filter(s => s.n <= upTo);
  console.log(
    `\n${paint(1, id)}: is it ready${
      upTo < 4 ? ` (stages 1 to ${upTo})` : ''
    }\n`,
  );
  let first: { stage: Stage; row: Row } | null = null;
  for (const stage of stages) {
    const bad = stage.rows.filter(r => r.status === 'fail').length;
    console.log(
      paint(1, `Stage ${stage.n}: ${stage.title}`) +
        (bad > 0 ? paint(31, `  (${bad} to fix)`) : ''),
    );
    for (const r of stage.rows) {
      console.log(`  ${MARK[r.status]} ${r.title}`);
      if (r.status === 'fail' || r.status === 'warn') {
        if (r.status === 'fail') {
          first ??= { stage, row: r };
        }
        const d = r.detail ?? [];
        for (const line of d.slice(0, MAX_DETAIL)) {
          console.log(paint(90, `      ${line}`));
        }
        if (d.length > MAX_DETAIL) {
          console.log(paint(90, `      … and ${d.length - MAX_DETAIL} more`));
        }
        if (r.fix) {
          console.log(paint(36, `      → ${r.fix}`));
        }
      } else if (r.status === 'wait') {
        console.log(paint(90, `      ${r.detail?.[0] ?? ''}`));
      }
    }
    console.log('');
  }
  if (first) {
    console.log(
      `Next: stage ${first.stage.n}, ${first.row.title}${
        first.row.fix ? ` (${first.row.fix})` : ''
      }.`,
    );
    return 1;
  }
  console.log(
    upTo < 4
      ? `Stages 1 to ${upTo} are done. Next: stage ${
          upTo + 1
        } (docs/NEW_EXERCISE.md).`
      : 'Ready. Last: npm run check, then try it on the simulator (docs/NEW_EXERCISE.md, stage 5).',
  );
  return 0;
}

process.exit(main());
