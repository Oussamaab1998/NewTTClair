/**
 * Starts a new exercise, then puts it in the app when it is written
 * (docs/NEW_EXERCISE.md):
 *
 *   npm run new-exercise -- <id> --chapter <chapter-id> --subject probability|analysis
 *       [--section <section>] [--number <n>]
 *     creates its files with placeholders (nothing in the app yet: the app
 *     and `npm run check` stay as they were while it is being written):
 *     the exercise and its misconceptions, its maps (trips), its help, its
 *     play test, and its notes in docs/exercises/.
 *
 *   npm run new-exercise -- <id> --register [--chapter <chapter-id>] [--force]
 *     once stages 1 to 3 of `npm run check:exercise -- <id>` pass: adds it
 *     to the app (src/app/exercises.ts), the tour and the help registries,
 *     and its chapter in src/content/curriculumMap.json.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { CURRICULUM } from '../../src/content/curriculum';
import {
  AR_TODO,
  filesOf,
  FR_TODO,
  ID_PATTERN,
  marker,
  readJson,
  REGISTRIES,
  rel,
  ROOT,
} from './files';

const SUBJECTS = ['probability', 'analysis'] as const;
/** An exercise of the app to copy the shape from, by subject. */
const MODEL: Record<(typeof SUBJECTS)[number], string> = {
  probability:
    'bac2022p-sc-ex2 (a probability tree) or bac2022c-ex2 (counting, a law, the binomial law)',
  analysis: 'bac2022c-ex4 (a function: parity, limits, derivative, variations)',
};

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function argOf(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** `bac2023p-se-ex1` → `exBac2023pSeEx1` (the import name in the registries). */
const importName = (id: string): string =>
  'ex' +
  id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

function chapterAndTrack(chapterId: string) {
  for (const track of CURRICULUM.tracks) {
    const chapter = track.chapters.find(c => c.id === chapterId);
    if (chapter) {
      return { track, chapter };
    }
  }
  const near = CURRICULUM.tracks
    .flatMap(t => t.chapters.map(c => c.id))
    .filter(c => c.startsWith(chapterId.split('.')[0] ?? ''))
    .slice(0, 30);
  return fail(
    `No chapter ${chapterId} in src/content/curriculumMap.json.${
      near.length > 0 ? `\nChapters of that track:\n  ${near.join('\n  ')}` : ''
    }`,
  );
}

const write = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(`  created ${rel(file)}`);
};
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

// ---------------------------------------------------------------------------

function create(id: string, args: string[]): void {
  const files = filesOf(id);
  const existing = Object.values(files).filter(f => fs.existsSync(f));
  if (existing.length > 0) {
    fail(
      `${id} already has files (nothing was changed):\n  ${existing
        .map(rel)
        .join('\n  ')}\nSee where it stands: npm run check:exercise -- ${id}`,
    );
  }
  const chapterId = argOf(args, '--chapter');
  const subject = argOf(args, '--subject');
  if (!chapterId || !subject) {
    fail(
      'usage: npm run new-exercise -- <id> --chapter <chapter-id> --subject probability|analysis [--section <section>] [--number <n>]',
    );
  }
  if (!(SUBJECTS as readonly string[]).includes(subject)) {
    fail(
      `The app knows the subjects ${SUBJECTS.join(
        ' and ',
      )} (src/content/schema.ts, ExerciseSchema.subject).\nAnother subject needs its engine and components first: ask the owner.`,
    );
  }
  const { track, chapter } = chapterAndTrack(chapterId);
  const section =
    argOf(args, '--section') ??
    (track.sections.length === 1 ? track.sections[0] : undefined);
  if (track.sections.length > 1 && section === undefined) {
    fail(
      `Track ${track.id} has several sections (${track.sections.join(
        ', ',
      )}): add --section.`,
    );
  }
  if (
    section !== undefined &&
    !(track.sections as string[]).includes(section)
  ) {
    fail(
      `Track ${track.id} is for ${track.sections.join(', ')}, not ${section}.`,
    );
  }
  const number = Number(argOf(args, '--number') ?? '1');
  const version = `${id}-0.1.0`;
  const todoAr = { ar: [{ ar: AR_TODO }] };
  console.log(
    `\nNew exercise ${id} (${chapter.id}, year ${track.year}${
      section ? `, ${section}` : ''
    }):`,
  );

  write(
    files.exercise,
    json({
      id,
      contentVersion: version,
      reviewed: false,
      title: { fr: FR_TODO, ar: [{ ar: AR_TODO }] },
      number,
      subject,
      ...(section !== undefined ? { section } : {}),
      statement: { fr: FR_TODO },
      results: [],
      parts: [],
      deepDives: [],
      variants: [],
    }),
  );
  write(files.misconceptions, '[]\n');
  write(
    files.trips,
    json({
      exerciseId: id,
      contentVersion: version,
      reviewed: false,
      overview: { says: todoAr, questions: [] },
      questions: {},
    }),
  );
  write(
    files.help,
    json({
      exerciseId: id,
      contentVersion: version,
      reviewed: false,
      ladders: {},
      glossary: [],
    }),
  );
  write(
    files.playTest,
    `/**
 * ${id} on the board, every question with no AI (docs/NEW_EXERCISE.md,
 * stage 4): the right lines to the end (trip, steps, picks, recipe, similar
 * questions), a typical wrong line, «ما نعرفش». Every expected value comes
 * from the engine, never typed by hand. One test per question, like:
 *
 *   const r = playOn(ID, '1', [line('...'), pick('...')]);
 *   expect(r.reasons).toEqual(['tour_done', 'credit', 'pick_ok']);
 *   expect(r.at).toBe('m1.recipe');
 *
 * Helpers: src/hybrid/conductor/playKit.ts. Examples:
 * src/hybrid/conductor/bac2022pScEx2.test.ts, src/method/ex2Content.test.ts.
 */
const ID = '${id}';

describe(\`\${ID} on the board, no AI\`, () => {
  it.todo('every question plays to its recipe and its similar questions');
});
`,
  );
  write(
    files.notes,
    `# ${id}

- Chapter: \`${chapter.id}\` (${chapter.title.fr}, year ${track.year}${
      section ? `, ${section}` : ''
    })
- Subject: ${subject}
- Source: ${FR_TODO} (the paper, year and session; or «our own exercise»)
- Model in the app: ${MODEL[subject as (typeof SUBJECTS)[number]]}
- Stage: 0, the plan (the owner says yes before stage 1)

## Stage 0: the plan (show it to the owner, wait for a yes)

- The statement, in French as printed: ${FR_TODO}
- The questions, one line each: what is asked, what it uses from the ones before.
- The numbers: every value as the engine computes it (the engine call and its
  result). Never a value typed by hand; an official-correction value that
  differs from the engine is written down here.
- Each question's steps (the plan cards), the line he writes or the card he
  picks at each step, and the components on the board.
- What is new for the app (a component, an engine function, a subject): each
  one is its own approval.
- The owner's answer (date, yes or changes): ${FR_TODO}

## Decisions

## Open questions

## Review

Everything is \`reviewed: false\` until a Tunisian math teacher reads the Arabic.
`,
  );
  console.log(`
Next (docs/NEW_EXERCISE.md):
  0. Write the plan in ${rel(files.notes)} and get the owner's yes.
  1. Write the exercise (model: ${
    MODEL[subject as (typeof SUBJECTS)[number]]
  }), then
       npm run check:exercise -- ${id} --stage 1
`);
}

// ---------------------------------------------------------------------------

/** Writes `line` just above the marker line of `file` (once: an id already there is left alone). */
function insertAt(
  file: string,
  name: string,
  line: string,
  already: string,
): boolean {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(already)) {
    return false;
  }
  const at = text.split('\n').findIndex(l => l.trim().startsWith(marker(name)));
  if (at < 0) {
    fail(
      `No «${marker(name)}» line in ${rel(
        file,
      )}: add it back where the entries end.`,
    );
  }
  const lines = text.split('\n');
  lines.splice(at, 0, line);
  fs.writeFileSync(file, lines.join('\n'));
  return true;
}

function register(id: string, args: string[]): void {
  const files = filesOf(id);
  const missing = [
    files.exercise,
    files.misconceptions,
    files.trips,
    files.help,
  ].filter(f => !fs.existsSync(f));
  if (missing.length > 0) {
    fail(
      `Missing: ${missing
        .map(rel)
        .join(', ')}. Start with: npm run new-exercise -- ${id} --chapter ...`,
    );
  }
  if (!args.includes('--force')) {
    try {
      execFileSync(
        'npx',
        ['tsx', path.join(__dirname, 'check.ts'), id, '--stage', '3'],
        {
          cwd: ROOT,
          stdio: 'pipe',
        },
      );
    } catch (e) {
      const out = String((e as { stdout?: Buffer }).stdout ?? '');
      fail(
        `Stages 1 to 3 do not pass yet, so it stays out of the app (the app and its tests would break):\n${out
          .split('\n')
          .filter(l => /✗|Next/.test(l))
          .join('\n')}\nSee all: npm run check:exercise -- ${id} --stage 3`,
      );
    }
  }
  const notes = fs.existsSync(files.notes)
    ? fs.readFileSync(files.notes, 'utf8')
    : '';
  const chapterId =
    argOf(args, '--chapter') ?? /^- Chapter: `([^`]+)`/m.exec(notes)?.[1];
  if (!chapterId) {
    fail(
      `Which chapter: add --chapter <chapter-id> (or the «- Chapter:» line of ${rel(
        files.notes,
      )}).`,
    );
  }
  chapterAndTrack(chapterId);
  // The chapter in the map file (an empty chapter has no "exercises" yet).
  const map = readJson(REGISTRIES.curriculum) as {
    tracks: { chapters: { id: string; exercises?: { id: string }[] }[] }[];
  };
  const found = map.tracks
    .flatMap(t => t.chapters)
    .find(c => c.id === chapterId);
  if (!found) {
    fail(`No chapter ${chapterId} in ${rel(REGISTRIES.curriculum)}.`);
  }
  const chapter = found as { id: string; exercises: { id: string }[] };
  chapter.exercises ??= [];
  const name = importName(id);
  const done: string[] = [];
  const add = (file: string, at: string, line: string, already: string) => {
    if (insertAt(file, at, line, already)) {
      done.push(`${rel(file)}: ${line.trim()}`);
    }
  };
  add(
    REGISTRIES.catalog,
    'imports',
    `import ${name} from '../content/exercises/${id}.json';`,
    `exercises/${id}.json'`,
  );
  add(
    REGISTRIES.catalog,
    'imports',
    `import ${name}Misconceptions from '../content/exercises/${id}.misconceptions.json';`,
    `exercises/${id}.misconceptions.json'`,
  );
  add(
    REGISTRIES.catalog,
    'entries',
    `  entry(${name}, ${name}Misconceptions),`,
    `entry(${name},`,
  );
  add(
    REGISTRIES.tour,
    'imports',
    `import ${name} from '../../content/trips.${id}.json';`,
    `trips.${id}.json'`,
  );
  add(REGISTRIES.tour, 'sources', `  ${name},`, `  ${name},`);
  add(
    REGISTRIES.help,
    'imports',
    `import ${name} from './${id}.json';`,
    `'./${id}.json'`,
  );
  add(REGISTRIES.help, 'sources', `  '${id}': ${name},`, `'${id}':`);

  if (!chapter.exercises.some(e => e.id === id)) {
    chapter.exercises.push({ id });
    fs.writeFileSync(REGISTRIES.curriculum, json(map));
    done.push(`${rel(REGISTRIES.curriculum)}: ${chapterId} → ${id}`);
  }
  console.log(
    done.length > 0
      ? `\n${id} is in the app:\n  ${done.join('\n  ')}`
      : `\n${id} was already in the app.`,
  );
  console.log(`
Next (docs/NEW_EXERCISE.md, stage 4):
  - its play test: ${rel(files.playTest)}
  - its tutor notes: src/ai/packs/notes.ts (TUTOR_NOTES)
  then: npm run check:exercise -- ${id}
`);
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const id = args.find(
  a =>
    !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true,
);
if (!id || !ID_PATTERN.test(id)) {
  fail(
    'usage:\n  npm run new-exercise -- <id> --chapter <chapter-id> --subject probability|analysis [--section <section>] [--number <n>]\n  npm run new-exercise -- <id> --register [--chapter <chapter-id>] [--force]\nThe id: lowercase words and digits joined by «-» (bac2023p-se-ex1, 3s-se-proba-ex1).',
  );
}
if (args.includes('--register')) {
  register(id, args);
} else {
  create(id, args);
}
