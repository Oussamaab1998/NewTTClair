/**
 * Where he writes on the board: the multi-line worksheet (src/lesson/worksheet)
 * for the step he is on. The page keeps his lines of this step with the
 * engine's mark on each (from the shared session); the tiles are the
 * statement's numbers and the values he earned; a scaffold comes only from
 * his own credited line of that node (a small case, an earlier try), at the
 * level his profile and his «ما نعرفش» on this step call for. The worksheet
 * never writes an ambiguous division, so no readback is asked.
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
const COUNTING_KEYS = new Set(['count', 'law']);

export interface LineEntryProps {
  active: boolean;
  onLine: (raw: string) => void;
  /** The step: its frame id, short name and the main node it settles (null: a similar question). */
  step: { id: string; label: Rich; node: string | null; key: string | null };
  state: ConductorState;
  /** His level on the node's skill (scaffold fading). */
  level: SkillLevel;
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
  const tiles = useMemo(
    () => buildTiles(session.given, session.lines),
    [session.given, session.lines],
  );
  const dontKnows = p.state.progress.dontKnows;
  const scaffold = useMemo(() => {
    const source = p.step.node ? sourceFor(session.lines, p.step.node) : null;
    return source
      ? buildScaffold(source, scaffoldLevel(p.level, dontKnows))
      : null;
  }, [session.lines, p.step.node, p.level, dontKnows]);
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
      counting={p.step.key !== null && COUNTING_KEYS.has(p.step.key)}
      readonly={!p.active}
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
