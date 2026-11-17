/**
 * The onboarding's examples (owner-approved mockup v2): for each chapter list
 * of the curriculum map, one analysis question shown as a map (screen 2) and
 * one probability or statistics question written line by line (screen 3).
 * Data in onboardingContent.json; every number is checked against the engine
 * by the tests. reviewed: false until a teacher checks the derja.
 */
import { z } from 'zod';

import { ArRunsSchema, findRunIssues } from '../lesson/rich/runs';
import { type SectionId, type Year, chapterById, trackFor } from './curriculum';
import raw from './onboardingContent.json';

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);
const Text = z.string().min(1);

const AnalysisSchema = z.strictObject({
  /** "Exemple · 1ère année", or the real exam's session. */
  source: Text,
  /** The real exam exercise it comes from, when it does. */
  exercise: Id.optional(),
  /** French, as on the exam paper. */
  statement: Text,
  have: ArRunsSchema,
  goal: ArRunsSchema,
  /** The goal as a formula (its own LTR line). */
  goalMath: Text,
  road: ArRunsSchema,
});

const PracticeSchema = z.strictObject({
  source: Text,
  exercise: Id.optional(),
  statement: Text,
  /** Line 1 (right), line 2 (the mistake), line 3 (the fix): exam-paper French. */
  given: Text,
  wrong: Text,
  hint: ArRunsSchema,
  /** What the student types (Arabizi). */
  question: Text,
  /** TTeClair's answer to that exact confusion. */
  reply: ArRunsSchema,
  fixed: Text,
  /** The skill remembered («تسجّلت»), as its French name. */
  skill: Text,
});

const Pick = z.tuple([Id, Id]); // [example id, chapter id]

export const OnboardingContentSchema = z
  .strictObject({
    contentVersion: Text,
    reviewed: z.boolean(),
    note: z.string().optional(),
    analysis: z.record(Id, AnalysisSchema),
    practice: z.record(Id, PracticeSchema),
    tracks: z.record(Id, z.strictObject({ analysis: Pick, practice: Pick })),
  })
  .superRefine((c, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const [track, t] of Object.entries(c.tracks)) {
      if (!c.analysis[t.analysis[0]]) {
        issue(`${track}: unknown analysis example ${t.analysis[0]}`);
      }
      if (!c.practice[t.practice[0]]) {
        issue(`${track}: unknown practice example ${t.practice[0]}`);
      }
      for (const chapter of [t.analysis[1], t.practice[1]]) {
        if (!chapterById(chapter)?.id.startsWith(`${track}.`)) {
          issue(`${track}: chapter ${chapter} is not in this list`);
        }
      }
    }
    const runs = [
      ...Object.entries(c.analysis).flatMap(([id, a]) =>
        [a.have, a.goal, a.road].map(r => [id, r] as const),
      ),
      ...Object.entries(c.practice).flatMap(([id, p]) =>
        [p.hint, p.reply].map(r => [id, r] as const),
      ),
    ];
    for (const [id, r] of runs) {
      for (const problem of findRunIssues(r)) {
        issue(`${id}: ${problem.problem}`);
      }
    }
  });
export type OnboardingContent = z.infer<typeof OnboardingContentSchema>;
export type AnalysisExample = OnboardingContent['analysis'][string];
export type PracticeExample = OnboardingContent['practice'][string];

/** Parsed at import: broken content is a build bug, caught by tests. */
export const ONBOARDING: OnboardingContent = OnboardingContentSchema.parse(raw);

/** The two examples for a class; null when the class has no chapter list. */
export function examplesFor(
  year: Year,
  section: SectionId | null,
): { analysis: AnalysisExample; practice: PracticeExample } | null {
  const track = trackFor(year, section);
  const pick = track ? ONBOARDING.tracks[track.id] : undefined;
  const analysis = pick ? ONBOARDING.analysis[pick.analysis[0]] : undefined;
  const practice = pick ? ONBOARDING.practice[pick.practice[0]] : undefined;
  return analysis && practice ? { analysis, practice } : null;
}
