/**
 * The warm-up before an exercise (src/warmup/warmup.ts): every exercise has
 * its own, read by the engine; a miss brings the easier question; at most
 * five questions; nothing marked; the answers become profile evidence and
 * lines for the tutor.
 */
import fs from 'node:fs';
import path from 'node:path';

import { bannedIn } from '../ai/prompt/lexicon';
import { profileDigest } from '../ai/profile/digest';
import {
  applyWarmup,
  emptyProfile,
  forgetWarmup,
  warmupSeen,
} from '../ai/profile/profile';
import { CATALOG } from '../app/exercises';
import type { Warmup } from '../content/schema';
import { findRunIssues } from '../lesson/rich/runs';
import { parseLatexSubset } from '../lesson/math/latexSubset';
import {
  MAX_ASKED,
  answerWarmup,
  currentQuestion,
  hadGaps,
  startWarmup,
  warmupIssues,
  warmupLines,
  warmupTopics,
} from './warmup';

const ex2 = CATALOG.find(e => e.id === 'bac2022c-ex2')!;
const W = (ex2.result.ok ? ex2.result.loaded.exercise.warmup : undefined)!;

describe('every exercise has its own warm-up', () => {
  it('the four exercises load with one, and it passes its checks', () => {
    for (const e of CATALOG) {
      if (!e.result.ok) {
        throw new Error(e.result.errors.join('\n'));
      }
      const w = e.result.loaded.exercise.warmup;
      expect({ id: e.id, has: w !== undefined }).toEqual({ id: e.id, has: true });
      expect(warmupIssues(w!)).toEqual([]);
      expect(w!.start.length).toBeGreaterThanOrEqual(3);
      expect(w!.reviewed).toBe(false);
    }
  });

  it('its Arabic is Tunisian, holds nothing but Arabic, and its formulas draw', () => {
    const walk = (v: unknown, ar: string[], math: string[]) => {
      if (Array.isArray(v)) {
        v.forEach(x => walk(x, ar, math));
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) {
          if (k === 'ar' && typeof x === 'string') ar.push(x);
          else if (k === 'math' && typeof x === 'string') math.push(x);
          else walk(x, ar, math);
        }
      }
    };
    const dir = path.join(__dirname, '..', 'content', 'exercises');
    for (const e of CATALOG) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, `${e.id}.json`), 'utf8'));
      const ar: string[] = [];
      const math: string[] = [];
      walk(raw.warmup, ar, math);
      for (const t of ar) {
        expect({ t, banned: bannedIn(t) }).toEqual({ t, banned: [] });
        expect(findRunIssues([{ ar: t }])).toEqual([]);
        expect(t).not.toMatch(/[0-9]/);
      }
      for (const m of math) {
        expect(() => parseLatexSubset(m)).not.toThrow();
      }
    }
  });

  it('each question names what it checks: a short French term, no digits', () => {
    for (const e of CATALOG) {
      const w = e.result.ok ? e.result.loaded.exercise.warmup! : null;
      for (const q of w!.questions) {
        expect(q.topic).toMatch(/^[a-zà-öø-ÿœ' ]+$/);
      }
      // The explanation screen: the main questions' topics, once each, in order.
      const topics = warmupTopics(w!);
      expect(new Set(topics).size).toBe(topics.length);
      expect(topics.length).toBeGreaterThanOrEqual(3);
    }
    expect(warmupTopics(W)).toEqual([
      'dénombrement',
      'événement contraire',
      'produit nul',
      'espérance',
    ]);
  });

  it('refuses content the engine cannot read or that points nowhere', () => {
    const bad: Warmup = {
      ...W,
      start: ['w_pairs', 'nowhere'],
      questions: [
        {
          ...W.questions[0]!,
          skill: 'not-a-skill',
          input: { kind: 'line', answer: 'C(4,2)', wrong: [{ expr: '6', means: 'x' }] },
        },
      ],
    };
    const issues = warmupIssues(bad);
    expect(issues.join('\n')).toMatch(/unknown skill/);
    expect(issues.join('\n')).toMatch(/equals the answer/);
    expect(issues.join('\n')).toMatch(/unknown start question nowhere/);
  });
});

describe('the walk', () => {
  it('right answers go straight through the main questions', () => {
    let s = startWarmup(W);
    for (const raw of ['C(4,2)=6', '1-1/4=3/4']) {
      s = answerWarmup(W, s, { kind: 'line', raw }).state;
    }
    s = answerWarmup(W, s, { kind: 'pick', cardId: 'k0' }).state;
    s = answerWarmup(W, s, { kind: 'line', raw: '0*1/2+2*1/2=1' }).state;
    expect(s.done).toBe(true);
    expect(s.asked.map(a => `${a.id}:${a.verdict}`)).toEqual([
      'w_pairs:right',
      'w_comp:right',
      'w_zero:right',
      'w_mean:right',
    ]);
    expect(hadGaps(s)).toBe(false);
  });

  it('a miss asks the easier question next, and names the known slip', () => {
    let s = startWarmup(W);
    s = answerWarmup(W, s, { kind: 'line', raw: '4*3=12' }).state;
    expect(currentQuestion(W, s)?.id).toBe('w_list');
    expect(s.asked[0]).toMatchObject({
      verdict: 'wrong',
      means: 'counted ordered draws',
    });
    s = answerWarmup(W, s, { kind: 'dont_know' }).state;
    expect(currentQuestion(W, s)?.id).toBe('w_comp');
    expect(hadGaps(s)).toBe(true);
  });

  it('an unreadable line is not an answer', () => {
    const s = startWarmup(W);
    const r = answerWarmup(W, s, { kind: 'line', raw: '4*' });
    expect(r.readable).toBe(false);
    expect(r.state).toBe(s);
  });

  it(`never more than ${MAX_ASKED} questions, and skip ends it`, () => {
    let s = startWarmup(W);
    while (!s.done) {
      s = answerWarmup(W, s, { kind: 'dont_know' }).state;
    }
    expect(s.asked.length).toBeLessThanOrEqual(MAX_ASKED);
    const skipped = answerWarmup(W, startWarmup(W), { kind: 'skip' }).state;
    expect(skipped.done).toBe(true);
    expect(skipped.asked.every(a => a.verdict === 'skipped')).toBe(true);
  });
});

describe('the profile and the tutor', () => {
  it('the answers are kept once per exercise, as evidence on each skill', () => {
    let s = startWarmup(W);
    s = answerWarmup(W, s, { kind: 'line', raw: '4*3=12' }).state;
    s = answerWarmup(W, s, { kind: 'line', raw: '3' }).state;
    const p = applyWarmup(emptyProfile(0), 'bac2022c-ex2', s.asked, 1);
    expect(warmupSeen(p, 'bac2022c-ex2')).toBe(true);
    expect(warmupSeen(p, 'bac2022c-ex4')).toBe(false);
    expect(p.skills['combinations-count']).toMatchObject({
      attempts: 1,
      slips: { warmup: 1 },
    });
    expect(p.skills['listing-systematically']).toMatchObject({
      attempts: 1,
      firstTry: 1,
    });
    expect(warmupSeen(forgetWarmup(p, 'bac2022c-ex2'), 'bac2022c-ex2')).toBe(false);
  });

  it('the tutor reads them first, for this exercise only', () => {
    let s = startWarmup(W);
    s = answerWarmup(W, s, { kind: 'line', raw: '4*3=12' }).state;
    const p = applyWarmup(emptyProfile(0), 'bac2022c-ex2', s.asked, 1);
    const d = profileDigest(p, null, 'bac2022c-ex2');
    expect(d).toMatch(/Warm-up before this exercise/);
    expect(d).toMatch(/combinations-count \(4s\): wrong \(wrote 4\*3=12\): counted ordered draws/);
    expect(profileDigest(p, null, 'bac2022c-ex4')).not.toMatch(/Warm-up/);
    expect(warmupLines(s.asked)).toHaveLength(1);
  });
});
