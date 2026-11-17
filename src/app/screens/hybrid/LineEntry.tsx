/**
 * Where he writes on the board: the multi-line worksheet (src/lesson/worksheet)
 * for the step he is on. The page keeps his lines of this step with the
 * engine's mark on each (from the shared session); the tiles are the
 * statement's numbers (those a figure prints first: the branches of a tree
 * are not in the text) and the values he earned; a scaffold comes only from
 * his own credited line of that node (a small case, an earlier try), at the
 * level his profile and his «ما نعرفش» on this step call for (never from a
 * small tree example: counted whole, its line is a count over a count, not
 * the shape of the question's line). The worksheet never writes an
 * ambiguous division, so no readback is asked.
 */
import React, { useMemo, useState } from 'react';

import type { StudentLine } from '../../../ai/session/state';
import type { SkillLevel } from '../../../ai/profile/profile';
import type { Rich } from '../../../content/schema';
import type { ConductorState } from '../../../hybrid/conductor/types';
import {
  emptyPage,
  fixLine,
  markLine,
  writeLine,
  type LineMark,
  type Page,
} from '../../../lesson/worksheet/model';
import {
  buildScaffold,
  scaffoldLevel,
  sourceFor,
} from '../../../lesson/worksheet/scaffold';
import { buildTiles } from '../../../lesson/worksheet/tiles';
import { Worksheet } from '../../../lesson/worksheet/Worksheet';

/** Keys n, k, ! and C(n, k) on the steps that build a counting formula. */
const FORMULA_KEYS = new Set(['count', 'law']);
/**
 * Keys ! and C(n, k), no letters, on the steps that count draws: the exam
 * copy says C_{10}^{3} (fix list B5).
 */
const NUMBER_COUNT_KEYS = new Set(['total', 'fav']);

const countingFor = (key: string | null): boolean | 'numbers' =>
  key === null
    ? false
    : FORMULA_KEYS.has(key)
    ? true
    : NUMBER_COUNT_KEYS.has(key)
    ? 'numbers'
    : false;

export interface LineEntryProps {
  active: boolean;
  onLine: (raw: string) => void;
  /** The step: its frame id, short name and the main node it settles (null: a similar question). */
  step: { id: string; label: Rich; node: string | null; key: string | null };
  state: ConductorState;
  /** His level on the node's skill (scaffold fading). */
  level: SkillLevel;
  /** An answer is on its way: the keys, tiles and «نثبّت» are off and dimmed. */
  disabled?: boolean;
  /** His line is the act being answered: «نثبّت» shows a spinner. */
  busy?: boolean;
  /** Numbers the exercise's figure gives ("2/3"): tiles before the statement's; keep the array stable. */
  givens?: readonly string[];
  /** A step written with a letter: the keys of x (e, powers) or of n (powers, C). */
  letters?: 'x' | 'n' | null;
  testID?: string;
}

/**
 * The engine's mark of a line he wrote (shape on the page, not colour
 * alone), on the graph it was judged on (the question's, or a small case's).
 */
function markOf(
  line: StudentLine | undefined,
  credited: Readonly<Record<string, string[]>>,
): LineMark {
  const m = line?.match;
  if (!m) {
    return line ? 'neutral' : 'pending';
  }
  if (m.verdict === 'credit') {
    return (credited[line?.graph ?? 'main'] ?? []).includes(m.node)
      ? 'right'
      : 'neutral';
  }
  return m.verdict === 'slip' || m.verdict === 'known_wrong'
    ? 'wrong'
    : 'neutral';
}

export function LineEntry(p: LineEntryProps) {
  const [page, setPage] = useState<Page>(emptyPage);
  const session = p.state.session;
  const givens = p.givens;
  const tiles = useMemo(
    () =>
      buildTiles(
        // Equal values are shown once (buildTiles), whichever list they are in.
        givens && givens.length > 0
          ? [...givens, ...session.given]
          : session.given,
        session.lines,
      ),
    [givens, session.given, session.lines],
  );
  const dontKnows = p.state.progress.dontKnows;
  const scaffold = useMemo(() => {
    // A line of a small tree example is no model for the question's line.
    const models = session.lines.filter(
      l => l.graph === null || session.cases[l.graph]?.kind !== 'tree',
    );
    const source = p.step.node ? sourceFor(models, p.step.node) : null;
    return source
      ? buildScaffold(source, scaffoldLevel(p.level, dontKnows))
      : null;
  }, [session.lines, session.cases, p.step.node, p.level, dontKnows]);
  // Each line of the page gets the mark of the session line with its text.
  const marked = useMemo(() => {
    const byRaw = new Map(session.lines.map(l => [l.raw, l]));
    return page.lines.reduce(
      (pg, l) => markLine(pg, l.id, markOf(byRaw.get(l.raw), session.credited)),
      page,
    );
  }, [page, session.lines, session.credited]);
  return (
    <Worksheet
      step={{ id: p.step.id, label: p.step.label }}
      prompt={null}
      lines={marked.lines}
      tiles={tiles}
      scaffold={scaffold}
      counting={countingFor(p.step.key)}
      {...(p.letters && { letters: p.letters })}
      readonly={!p.active}
      disabled={p.disabled ?? false}
      busy={p.busy ?? false}
      onSubmit={(raw, info) => {
        const next = info.fixes
          ? fixLine(page, info.fixes, info.nodes)
          : writeLine(page, { id: p.step.id, label: p.step.label }, info.nodes);
        if (next) {
          setPage(next.page);
        }
        p.onLine(raw);
      }}
      {...(p.testID !== undefined && { testID: p.testID })}
    />
  );
}
