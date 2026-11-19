/**
 * Where an exercise's files live, the skeleton's placeholders and the marker
 * lines the skeleton command writes next to (docs/NEW_EXERCISE.md). Shared by
 * `npm run new-exercise` (new.ts) and `npm run check:exercise` (check.ts).
 */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');
export const rel = (p: string): string => path.relative(ROOT, p);

/** The skeleton's Arabic placeholder: Arabic only, so the schema reads it; the check refuses it. */
export const AR_TODO = 'يتكتب بعد';
/** The skeleton's French and English placeholder. */
export const FR_TODO = 'À ÉCRIRE';

/** Ids are lowercase words and digits joined by «-» (bac2023p-se-ex1, 3s-se-proba-ex1). */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The first exercises' play tests, written before the naming rule (`<id>.play.test.ts`). */
const OLDER_PLAY_TESTS: Record<string, string> = {
  'bac2022c-sc-ex2': 'src/hybrid/conductor/conductor.test.ts',
  'bac2022p-sc-ex2': 'src/hybrid/conductor/bac2022pScEx2.test.ts',
  'bac2022c-ex2': 'src/method/ex2Content.test.ts',
  'bac2022c-ex4': 'src/method/ex4Content.test.ts',
};

export function filesOf(id: string) {
  const content = path.join(ROOT, 'src', 'content');
  const older = OLDER_PLAY_TESTS[id];
  return {
    exercise: path.join(content, 'exercises', `${id}.json`),
    misconceptions: path.join(
      content,
      'exercises',
      `${id}.misconceptions.json`,
    ),
    trips: path.join(content, `trips.${id}.json`),
    help: path.join(content, 'help', `${id}.json`),
    notes: path.join(ROOT, 'docs', 'exercises', `${id.toUpperCase()}.md`),
    /** Plays every question to its end on the board, with no AI. */
    playTest:
      older !== undefined
        ? path.join(ROOT, older)
        : path.join(ROOT, 'src', 'hybrid', 'conductor', `${id}.play.test.ts`),
  };
}

/** The registries a new exercise is added to, each at its marker line. */
export const REGISTRIES = {
  catalog: path.join(ROOT, 'src', 'app', 'exercises.ts'),
  tour: path.join(ROOT, 'src', 'hybrid', 'tour', 'tour.ts'),
  help: path.join(ROOT, 'src', 'content', 'help', 'help.ts'),
  tutorNotes: path.join(ROOT, 'src', 'ai', 'packs', 'notes.ts'),
  curriculum: path.join(ROOT, 'src', 'content', 'curriculumMap.json'),
};

/** `// new-exercise: imports` and the like: the skeleton command writes just above them. */
export const marker = (name: string): string => `// new-exercise: ${name}`;

export const readJson = (file: string): unknown =>
  JSON.parse(fs.readFileSync(file, 'utf8'));

/** Where a trips file names this exercise (older files are named differently: trips.sc-ex2.json). */
export function tripsFileFor(id: string): string | null {
  const own = filesOf(id).trips;
  if (fs.existsSync(own)) {
    return own;
  }
  const dir = path.dirname(own);
  for (const f of fs.readdirSync(dir)) {
    if (!/^trips\..+\.json$/.test(f)) {
      continue;
    }
    try {
      const raw = readJson(path.join(dir, f)) as { exerciseId?: unknown };
      if (raw.exerciseId === id) {
        return path.join(dir, f);
      }
    } catch {
      // A broken file is reported by the check of its own exercise.
    }
  }
  return null;
}

/** The exercise's own tests: its play test and the test files whose name holds its id. */
export function ownTests(id: string): string[] {
  const play = filesOf(id).playTest;
  const out: string[] = fs.existsSync(play) ? [play] : [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (
        /\.test\.tsx?$/.test(e.name) &&
        e.name.includes(id) &&
        !out.includes(p)
      ) {
        out.push(p);
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  return out.sort();
}

/** The placeholders still in a file, as «where: text» lines (JSON paths). */
export function placeholdersIn(raw: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, at: string) => {
    if (typeof v === 'string') {
      if (v.includes(AR_TODO) || v.includes(FR_TODO)) {
        out.push(at || '(file)');
      }
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${at}[${i}]`));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        walk(x, at ? `${at}.${k}` : k);
      }
    }
  };
  walk(raw, '');
  return out;
}
