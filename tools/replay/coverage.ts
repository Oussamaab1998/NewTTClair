/**
 * Content coverage (2026-10-23): for every main step and transfer, which
 * kinds of help the content has (procedure table, fresh variant on its own
 * urn, walk-through, simpler twin, deep dive, alternative, authored
 * wrong-answer lines, solution phrases), plus wrong / hint / reveal / "not
 * sure" counts per step from logs, to rank the gaps.
 * `npm run replay -- coverage [log.jsonl ...]`.
 */
import { componentKind } from '../../src/components/registry';
import { stepKey, type LoadedExercise } from '../../src/content/loader';
import type { Step } from '../../src/content/schema';
import type { Event } from '../../src/telemetry/events';

const YES = '✓';
const NO = '✗';
const NA = '–';

export interface CoverageRow {
  key: string;
  kind: string;
  hints: number;
  procedures: string;
  fresh: string;
  walkthrough: string;
  twin: string;
  deepDive: string;
  alternative: string;
  /** "with a line / wrong answers known" (options, values, lines, diagnoses). */
  wrongLines: string;
  phrases: string;
}

type AnyStep = Step & Record<string, unknown>;

export function contentCoverage(loaded: LoadedExercise): CoverageRow[] {
  const ex = loaded.exercise;
  const withLibraryLine = new Set(
    [...loaded.misconceptions.values()].filter(m => m.feedback).map(m => m.id),
  );
  const variantsFor = (key: string, kind: string) =>
    ex.variants.filter(v => v.kind === kind && v.forSteps.includes(key));
  const row = (key: string, s: AnyStep, parent: string): CoverageRow => {
    const answer = loaded.answers.get(key);
    const wrong = [
      ...((s.options as AnyStep[] | undefined) ?? []).filter(
        o => o.misconceptionId !== undefined || o.feedback !== undefined,
      ),
      ...((s.wrongAnswers as AnyStep[] | undefined) ?? []),
      ...((s.knownWrong as AnyStep[] | undefined) ?? []),
      ...((s.diagnoses as AnyStep[] | undefined) ?? []),
    ];
    const lined = wrong.filter(
      w =>
        w.feedback !== undefined ||
        w.meant !== undefined ||
        withLibraryLine.has(String(w.misconceptionId)),
    );
    const asked = s.kind === 'choice' || s.kind === 'typed';
    return {
      key,
      kind: s.kind,
      hints: ((s.hints as unknown[] | undefined) ?? []).length,
      procedures:
        s.kind === 'typed'
          ? answer?.kind === 'number' && (answer.procedures?.length ?? 0) > 0
            ? YES
            : NO
          : NA,
      fresh: ex.variants.some(
        v =>
          v.kind === 'transfer' && v.experiment && v.forSteps.includes(parent),
      )
        ? YES
        : NO,
      walkthrough:
        s.kind === 'component' ? NA : s.walkthrough !== undefined ? YES : NO,
      twin: variantsFor(parent, 'simpler').length > 0 ? YES : NO,
      deepDive: s.deepDiveId !== undefined ? YES : NO,
      alternative: variantsFor(parent, 'alternative').length > 0 ? YES : NO,
      wrongLines: wrong.length > 0 ? `${lined.length}/${wrong.length}` : NO,
      phrases:
        asked || s.kind === 'component'
          ? s.solutionPhrases !== undefined
            ? YES
            : NO
          : NA,
    };
  };
  const rows: CoverageRow[] = [];
  for (const p of ex.parts) {
    for (const s of p.groups.flatMap(g => g.steps)) {
      const counts =
        s.kind === 'choice' ||
        s.kind === 'typed' ||
        s.kind === 'lines' ||
        (s.kind === 'component' && componentKind(s.component) === 'task');
      if (counts) {
        const key = stepKey.main(p.id, s.id);
        rows.push(row(key, s as AnyStep, key));
      }
    }
  }
  for (const v of ex.variants.filter(x => x.kind === 'transfer')) {
    rows.push(
      row(stepKey.variant(v.id), v.step as AnyStep, v.forSteps[0] ?? ''),
    );
  }
  return rows;
}

export interface StepUsage {
  wrong: number;
  hint: number;
  reveal: number;
  notSure: number;
}

/** Wrong answers, hints, reveals and "not sure" per step key in logs. */
export function usageByStep(events: readonly Event[]): Map<string, StepUsage> {
  const by = new Map<string, StepUsage>();
  for (const e of events) {
    if (!['answer', 'hint', 'reveal', 'not_sure'].includes(e.t)) {
      continue;
    }
    const key =
      e.stepId.startsWith('var:') || e.stepId.startsWith('dd:')
        ? e.stepId
        : stepKey.main(e.questionId, e.stepId);
    const u = by.get(key) ?? { wrong: 0, hint: 0, reveal: 0, notSure: 0 };
    if (e.t === 'answer' && !e.correct) {
      u.wrong += 1;
    } else if (e.t === 'hint') {
      u.hint += 1;
    } else if (e.t === 'reveal') {
      u.reveal += 1;
    } else if (e.t === 'not_sure') {
      u.notSure += 1;
    }
    by.set(key, u);
  }
  return by;
}

export function formatCoverage(
  rows: readonly CoverageRow[],
  usage?: ReadonlyMap<string, StepUsage>,
): string {
  const head = [
    'step',
    'kind',
    'hints',
    'procedures',
    'fresh',
    'walk-through',
    'twin',
    'deep dive',
    'alternative',
    'wrong lines',
    'phrases',
    ...(usage ? ['wrong/hint/reveal/not sure in logs'] : []),
  ];
  const lines = rows.map(r => {
    const u = usage?.get(r.key);
    return [
      r.key,
      r.kind,
      String(r.hints),
      r.procedures,
      r.fresh,
      r.walkthrough,
      r.twin,
      r.deepDive,
      r.alternative,
      r.wrongLines,
      r.phrases,
      ...(usage
        ? [u ? `${u.wrong}/${u.hint}/${u.reveal}/${u.notSure}` : '-']
        : []),
    ];
  });
  return [head, head.map(() => '---'), ...lines]
    .map(cells => `| ${cells.join(' | ')} |`)
    .join('\n');
}
