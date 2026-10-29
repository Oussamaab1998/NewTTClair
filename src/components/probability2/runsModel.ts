/**
 * Pure model of RepeatedRuns: how many of N runs pass each stage (exact whole
 * numbers from the engine), which cells they are (a contiguous block in
 * reading order), the tally of a law over N runs, the calculation lines, the
 * finding and the `reveals` declaration. No React.
 */
import { divisionLine, productLine, sumLine } from '../../engine/calcLines';
import { frac, type Fraction } from '../../engine/rational';
import {
  cellsForStage,
  repeatedRuns,
  tally,
  type TallyResult,
} from '../../engine/runs';
import { parseRat, ratToString } from '../../engine/rationalFormat';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { RepeatedRunsPropsSchema, type RepeatedRunsProps } from './schemas';

type TallyOk = Extract<TallyResult, { ok: true }>;

export interface RunsModel {
  mode: RepeatedRunsProps['mode'];
  N: number;
  cols: number;
  /** fraction_of_total and two_stage: N, then the runs that pass stage 1, stage 2. */
  counts: number[];
  probs: Fraction[];
  /** tally mode. */
  tally: TallyOk | null;
  /** The last stage a "next" button reaches: 1 (fraction), 2 (two_stage and tally). */
  lastStage: number;
}

export function runsModel(p: RepeatedRunsProps): RunsModel {
  if (p.mode === 'tally') {
    const t = tally(
      p.tally!.values,
      p.tally!.probabilities.map(x => parseRat(x)!),
      p.N,
    );
    if (!t.ok) {
      throw new Error(`tally: ${t.reason}`);
    }
    return { mode: p.mode, N: p.N, cols: p.cols, counts: [p.N], probs: [], tally: t, lastStage: 2 };
  }
  const probs = p.stages!.map(s => parseRat(s.p)!);
  const r = repeatedRuns(p.N, probs);
  if (!r.ok) {
    throw new Error(`runs: ${r.reason}`);
  }
  return {
    mode: p.mode,
    N: p.N,
    cols: p.cols,
    counts: r.counts,
    probs,
    tally: null,
    lastStage: probs.length,
  };
}

/** The cells lit at a stage: none at 0, then the first c1 cells, then the first c2 (inside them). */
export function stageCells(m: RunsModel, stage: number): number[] {
  if (stage <= 0 || m.mode === 'tally') {
    return [];
  }
  return cellsForStage(m.N, m.counts[Math.min(stage, m.counts.length - 1)]!);
}

/** The calculation shown at a stage (the stage-1 line, then the stage-2 line; the tally's S and its average). */
export function runsCalc(m: RunsModel, stage: number): string[] {
  if (m.tally) {
    const lines: string[] = [];
    if (stage >= 1) {
      lines.push(sumLine(m.tally.rows.map(r => r.total)));
    }
    if (stage >= 2) {
      lines.push(divisionLine(m.tally.total, m.N));
    }
    return lines;
  }
  return m.probs.slice(0, stage).map((p, i) => productLine([p, m.counts[i]!]));
}

export function runsFinding(
  m: RunsModel,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found';
  const base = { route: route.slice(0, 12), how };
  if (m.tally) {
    return makeFinding({
      findingId: 'runs.tally',
      numbers: {
        runs: String(m.N),
        total: String(m.tally.total),
        average: ratToString(m.tally.average),
      },
      correct: null,
      ...(own && { calc: runsCalc(m, 2) }),
      ...base,
    });
  }
  if (m.mode === 'fraction_of_total') {
    return makeFinding({
      findingId: 'runs.fraction',
      numbers: { runs: String(m.N), count: String(m.counts[1]) },
      correct: own ? true : null,
      ...(own && { calc: runsCalc(m, 1) }),
      ...base,
    });
  }
  return makeFinding({
    findingId: 'runs.two_stage',
    numbers: {
      runs: String(m.N),
      stage1: String(m.counts[1]),
      stage2: String(m.counts[2]),
    },
    correct: null,
    ...(own && { calc: runsCalc(m, 2) }),
    ...base,
  });
}

// ---------------------------------------------------------------------------
// Reveals

const parseRuns = (props: Record<string, unknown>): RunsModel | null => {
  const r = RepeatedRunsPropsSchema.safeParse(props);
  return r.success ? runsModel(r.data) : null;
};

export const REPEATED_RUNS_REVEALS: readonly RevealRule[] = [
  {
    value: 'runs',
    note: 'N cells are drawn, one per run, so N is on screen',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseRuns(p);
      return m ? [frac(m.N)] : [];
    },
  },
  {
    value: 'stage_counts',
    note: 'how many runs pass each stage (1/6 of 36 = 6, then 1), written after a confirmed shading or a step',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseRuns(p);
      return m && !m.tally ? m.counts.slice(1).map(c => frac(c)) : [];
    },
  },
  {
    value: 'tally_runs',
    note: 'the table lists the runs of each value (N times its probability)',
    by: 'props',
    minHint: 0,
    values: p => {
      const m = parseRuns(p);
      return m?.tally ? m.tally.rows.map(r => frac(r.runs)) : [];
    },
  },
  {
    value: 'tally_total',
    note: 'the total S and the average S / N (the expected value), written after the table is read step by step',
    by: 'state',
    lockedBy: () => false,
    minHint: 0,
    values: p => {
      const m = parseRuns(p);
      return m?.tally
        ? [frac(m.tally.total), m.tally.average, ...m.tally.rows.map(r => frac(r.total))]
        : [];
    },
  },
];
