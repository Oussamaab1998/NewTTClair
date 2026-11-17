import { memoryStore } from '../../../storage/kv';
import { partKey } from '../../../state/doneParts';
import { CATALOG } from '../../exercises';
import { chapterList, chapterRow, startFilter } from './chapters';
import {
  STUDENT_CLASS_KEY,
  loadStudentClass,
  saveStudentClass,
} from './studentClass';

const done = (...keys: [string, string][]) =>
  new Set(keys.map(([e, q]) => partKey(e, q)));

describe('chapter list', () => {
  it('Bac Sc. exp.: two chapters with exercises, the programme by domain in book order', () => {
    const list = chapterList(
      { year: '4s', section: 'sciences-experimentales' },
      new Set(),
    )!;
    expect(list.track.id).toBe('4s-se');
    expect(list.available.map(r => r.chapter.id)).toEqual([
      '4s-se.probabilites-ensemble-fini',
      '4s-se.variables-aleatoires',
    ]);
    expect(list.groups.map(g => [g.domain, g.rows.length])).toEqual([
      ['analysis', 9],
      ['sequences', 1],
      ['complex', 2],
      ['space', 2],
      ['probability', 2],
      ['statistics', 1],
    ]);
  });

  it('a chapter covers only its parts of an exercise, and counts them', () => {
    const list = chapterList(
      { year: '4s', section: 'sciences-experimentales' },
      done(['bac2022c-sc-ex2', '1'], ['bac2022c-sc-ex2', '3a']),
    )!;
    const [finite, variables] = list.available;
    expect(
      finite!.exercises.map(x => [x.entry.id, x.parts, x.partial, x.state, x.next]),
    ).toEqual([
      ['bac2022c-sc-ex2', ['1', '2'], true, 'started', '2'],
      ['bac2022p-sc-ex2', ['t1', 't2', 't3', 't4'], false, 'new', 't1'],
    ]);
    expect([finite!.doneParts, finite!.totalParts]).toEqual([1, 6]);
    expect(
      variables!.exercises.map(x => [x.parts, x.done, x.state, x.next]),
    ).toEqual([[['3a', '3b'], ['3a'], 'started', '3b']]);
  });

  it('all parts done: read again from the first', () => {
    const row = chapterRow(
      '4s-se.variables-aleatoires',
      done(['bac2022c-sc-ex2', '3a'], ['bac2022c-sc-ex2', '3b']),
    )!;
    expect(row.exercises.map(x => [x.state, x.next])).toEqual([['done', '3a']]);
  });

  it('classes without exercises yet: the programme only', () => {
    for (const cls of [
      { year: '1s', section: null },
      { year: '2s', section: 'technologies-informatique' },
      { year: '3s', section: 'mathematiques' },
      { year: '4s', section: 'sciences-informatique' },
    ] as const) {
      const list = chapterList(cls, new Set())!;
      expect([list.track.id, list.available]).toEqual([list.track.id, []]);
      expect(list.groups.length).toBeGreaterThan(3);
    }
  });

  it('never offers an exercise that does not load', () => {
    const broken = CATALOG.map(e =>
      e.id === 'bac2022c-ex2'
        ? { ...e, result: { ok: false as const, errors: ['broken'] } }
        : e,
    );
    const list = chapterList(
      { year: '4s', section: 'mathematiques' },
      new Set(),
      broken,
    )!;
    expect(list.available.map(r => r.chapter.id)).toEqual([
      '4s-m.fonction-exponentielle',
    ]);
  });

  it('a pair that is not a class has no list; an unknown chapter has no row', () => {
    expect(chapterList({ year: '1s', section: 'mathematiques' }, new Set())).toBeNull();
    expect(chapterList({ year: '4s', section: null }, new Set())).toBeNull();
    expect(chapterRow('4s-m.nope', new Set())).toBeNull();
  });

  it('starts on the home card domain when the list has it', () => {
    const bac = chapterList({ year: '4s', section: 'mathematiques' }, new Set())!;
    const first = chapterList({ year: '1s', section: null }, new Set())!;
    expect(startFilter(bac, 'probability')).toBe('probability');
    expect(startFilter(first, 'probability')).toBe('all');
    expect(startFilter(bac, undefined)).toBe('all');
  });
});

describe('student class store', () => {
  it('saves and loads the class', () => {
    const kv = memoryStore();
    expect(loadStudentClass(kv)).toBeNull();
    saveStudentClass(kv, { year: '3s', section: 'sciences-techniques' });
    expect(loadStudentClass(kv)).toEqual({ year: '3s', section: 'sciences-techniques' });
    saveStudentClass(kv, { year: '1s', section: null });
    expect(loadStudentClass(kv)).toEqual({ year: '1s', section: null });
  });

  it('treats damaged or impossible records as never picked', () => {
    const kv = memoryStore();
    for (const raw of [
      '{',
      '{"year":"5s","section":null}',
      '{"year":"4s","section":"lettres"}',
      '{"year":"1s","section":"mathematiques"}',
      '{"year":"4s","section":null}',
    ]) {
      kv.set(STUDENT_CLASS_KEY, raw);
      expect([raw, loadStudentClass(kv)]).toEqual([raw, null]);
    }
  });
});
