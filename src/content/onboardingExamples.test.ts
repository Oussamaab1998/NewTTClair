import { CATALOG } from '../app/exercises';
import { runEngineCall } from '../engine/calls';
import { arrangements } from '../engine/combinatorics';
import treeExercise from './exercises/bac2022p-sc-ex2.json';
import { add, choose, frac, mul, type Fraction } from '../engine/rational';
import { CURRICULUM, trackFor } from './curriculum';
import {
  ONBOARDING,
  OnboardingContentSchema,
  examplesFor,
} from './onboardingExamples';
import raw from './onboardingContent.json';

const show = ([n, d]: Fraction) => (d === 1 ? `${n}` : `${n}/${d}`.replace('-', '−'));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('onboarding examples', () => {
  it('parse, unreviewed until a teacher checks the derja', () => {
    expect(ONBOARDING.reviewed).toBe(false);
    expect(OnboardingContentSchema.safeParse(raw).success).toBe(true);
  });

  it('every chapter list has both examples, from its own chapters', () => {
    for (const t of CURRICULUM.tracks) {
      const sections = t.sections.length ? t.sections : [null];
      for (const s of sections) {
        expect([t.id, examplesFor(t.year, s) !== null]).toEqual([t.id, true]);
      }
      const pick = ONBOARDING.tracks[t.id]!;
      expect(pick.analysis[1].startsWith(`${t.id}.`)).toBe(true);
      expect(pick.practice[1].startsWith(`${t.id}.`)).toBe(true);
    }
    expect(Object.keys(ONBOARDING.tracks).sort()).toEqual(
      CURRICULUM.tracks.map(t => t.id).sort(),
    );
  });

  it('a real exam example names an exercise of its own section', () => {
    for (const [trackId, pick] of Object.entries(ONBOARDING.tracks)) {
      const track = CURRICULUM.tracks.find(t => t.id === trackId)!;
      for (const ex of [
        ONBOARDING.analysis[pick.analysis[0]]!,
        ONBOARDING.practice[pick.practice[0]]!,
      ]) {
        if (ex.exercise === undefined) {
          expect(ex.source.startsWith('Exemple')).toBe(true);
          continue;
        }
        const entry = CATALOG.find(e => e.id === ex.exercise);
        const section = (entry?.raw as { section?: string } | undefined)?.section;
        expect([ex.exercise, track.sections]).toEqual([
          ex.exercise,
          expect.arrayContaining([section]),
        ]);
      }
    }
  });

  it('the Bac Maths examples are the app\'s own exercises (statement and source)', () => {
    const bac = examplesFor('4s', 'mathematiques')!;
    expect(bac.analysis.exercise).toBe('bac2022c-ex4');
    expect(bac.practice.exercise).toBe('bac2022c-ex2');
    expect(trackFor('4s', 'mathematiques')?.id).toBe('4s-m');
  });

  describe('every number is the engine\'s', () => {
    const P = ONBOARDING.practice;
    const A = ONBOARDING.analysis;

    it('1ère: affine function through (1, 5) and (3, 9); median of the marks', () => {
      const a = (9 - 5) / (3 - 1);
      const b = 5 - a * 1;
      expect([a, b, a * 3 + b]).toEqual([2, 3, 9]);
      expect(A['a-1s']!.statement).toContain('f(1) = 5 et f(3) = 9');
      const marks = [12, 8, 15, 10, 14];
      const sorted = [...marks].sort((x, y) => x - y);
      expect(marks[2]).toBe(15); // the middle before sorting: the mistake
      expect(sorted[2]).toBe(12);
      expect(P['p-1s']!.wrong).toBe('Me = 15');
      expect(P['p-1s']!.fixed).toBe(`${sorted.join(' < ')}  ⇒  Me = 12`);
    });

    it('2ème: vertex (2, −1) of x² − 4x + 3; 5 × 4 × 3 three-digit numbers', () => {
      const f = (x: number) => x * x - 4 * x + 3;
      expect([f(2), f(1), f(3)]).toEqual([-1, 0, 0]); // symmetric around 2
      expect(arrangements(5, 3)).toBe(60);
      expect(5 ** 3).toBe(125);
      expect(P['p-2s']!.wrong).toBe(`N = 5 × 5 × 5 = ${5 ** 3}`);
      expect(P['p-2s']!.fixed).toBe(`N = 5 × 4 × 3 = ${arrangements(5, 3)}`);
    });

    it('3ème: f′ of x³ − 3x + 1 vanishes at ±1; same colour = (3 + 1)/10 = 2/5', () => {
      const fPrime = (x: number) => 3 * x * x - 3;
      expect([fPrime(-1), fPrime(1)]).toEqual([0, 0]);
      const total = choose(5, 2);
      const red = choose(3, 2);
      const white = choose(2, 2);
      expect([total, red, white]).toEqual([10, 3, 1]);
      expect(P['p-3s']!.given).toBe(`card(Ω) = C₅² = ${total}`);
      expect(P['p-3s']!.wrong).toBe(`p = ${red}/${total}`);
      expect(P['p-3s']!.fixed).toBe(
        `p = (${red} + ${white})/${total} = ${show(frac(red + white, total))}`,
      );
    });

    it('Bac Maths: only the two 0 balls give the same number: 1/10', () => {
      const balls = [-1, 0, 0, 1, 2];
      let same = 0;
      let all = 0;
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          all += 1;
          same += balls[i] === balls[j] ? 1 : 0;
        }
      }
      expect([all, same]).toEqual([choose(5, 2), 1]);
      expect(P['p-bm']!.wrong).toBe(`p(A) = ${2 * same}/${all}`);
      expect(P['p-bm']!.fixed).toBe(`p(A) = ${show(frac(same, all))}`);
    });

    it('Bac Sc. exp.: p(A ∩ F) = 2/3 × 1/4 = 1/6, the tree exercise\'s own engine call', () => {
      const call = treeExercise.values.vAF;
      expect([call.args.pA, call.args.pFgA]).toEqual([[2, 3], [1, 4]]);
      const r = runEngineCall(call, {});
      expect(r.ok && show(r.value as Fraction)).toBe(show(mul(frac(2, 3), frac(1, 4))));
      expect(P['p-bse']!.fixed).toBe(
        `p(A ∩ F) = 2/3 × 1/4 = ${show(r.ok ? (r.value as Fraction) : frac(0))}`,
      );
    });

    it('Bac technique / info: E(X) = 3 × 1/6 − 1 × 5/6 = −1/3', () => {
      const e = add(mul(frac(3), frac(1, 6)), mul(frac(-1), frac(5, 6)));
      expect(show(e)).toBe('−1/3');
      expect(P['p-bt']!.fixed).toBe(`E(X) = 3 × 1/6 − 1 × 5/6 = ${show(e)}`);
      expect(P['p-bt']!.wrong).toBe(`E(X) = (3 − 1)/2 = ${(3 - 1) / 2}`);
    });
  });

  it('rejects an example linked to another list\'s chapter, or Latin inside Arabic', () => {
    const wrongChapter = clone(raw);
    wrongChapter.tracks['1s'].analysis[1] = '4s-m.coniques';
    const r1 = OnboardingContentSchema.safeParse(wrongChapter);
    expect(r1.success ? [] : r1.error.issues.map(i => i.message)).toEqual([
      '1s: chapter 4s-m.coniques is not in this list',
    ]);
    const latin = clone(raw);
    latin.practice['p-1s'].hint = [{ ar: 'رتّب les notes' }];
    const r2 = OnboardingContentSchema.safeParse(latin);
    expect(r2.success ? [] : r2.error.issues.map(i => i.message)).toEqual([
      'p-1s: latin_in_ar_run',
    ]);
  });
});
