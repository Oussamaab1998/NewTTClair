/**
 * Every exercise of the app (CATALOG) is complete, whoever wrote it and
 * whenever (docs/NEW_EXERCISE.md): it loads, it has its own question ids and
 * title, its maps (trips) fit it, and it has a play test. The help, the
 * warm-up and the chapter are checked over the same list by help.test.ts,
 * warmup.test.ts and curriculum.test.ts. `npm run check:exercise -- <id>`
 * runs these rules on one exercise while it is being written.
 */
import fs from 'node:fs';

import { filesOf, rel } from '../../tools/exercise/files';
import { HELP_SOURCES } from '../content/help/help';
import { tripIssues } from '../hybrid/tour/checks';
import { TRIP_FILE_ISSUES, tripFileFor } from '../hybrid/tour/tour';
import { toPlainText } from '../lesson/rich/runs';
import { CATALOG } from './exercises';

const IDS = CATALOG.map(e => e.id);

const loadedOf = (id: string) => {
  const e = CATALOG.find(x => x.id === id)!;
  if (!e.result.ok) {
    throw new Error(`${id} does not load:\n${e.result.errors.join('\n')}`);
  }
  return { loaded: e.result.loaded, raw: e.raw };
};

test('every exercise of the app loads', () => {
  expect(
    CATALOG.filter(e => !e.result.ok).map(e => [
      e.id,
      e.result.ok ? [] : e.result.errors.slice(0, 5),
    ]),
  ).toEqual([]);
});

// Question ids: ExercisePicker.test.tsx («part ids are unique across exercises»).
test('exercise ids and Arabic titles are unique across the app', () => {
  expect(new Set(IDS).size).toBe(IDS.length);
  const titles = IDS.map(id =>
    toPlainText(loadedOf(id).loaded.exercise.title.ar),
  );
  expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([]);
});

test('every trips file parses; every help file belongs to an exercise of the app', () => {
  expect(TRIP_FILE_ISSUES).toEqual([]);
  expect(Object.keys(HELP_SOURCES).filter(id => !IDS.includes(id))).toEqual([]);
});

describe.each(IDS)('%s', id => {
  test(`${id}: its maps fit it (one per question, the plan cards, earlier results)`, () => {
    const { loaded, raw } = loadedOf(id);
    const file = tripFileFor(id);
    expect(
      file === null
        ? ['no trips file in src/hybrid/tour/tour.ts SOURCES']
        : tripIssues(loaded, raw, file),
    ).toEqual([]);
  });

  test(`${id}: it has a play test, with every question written`, () => {
    const play = filesOf(id).playTest;
    const text = fs.existsSync(play) ? fs.readFileSync(play, 'utf8') : null;
    expect({
      play: rel(play),
      exists: text !== null,
      todo: /\b(?:it|test)\.todo\(/.test(text ?? ''),
    }).toEqual({
      play: rel(play),
      exists: true,
      todo: false,
    });
  });
});
