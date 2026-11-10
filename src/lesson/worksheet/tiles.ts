/**
 * Number tiles above the worksheet keys: the numbers of the statement and the
 * values he earned with his own credited lines, to tap into a line instead of
 * typing them again. Never anything else: no expected value, no number the
 * engine knows but he did not write (hard rule 6: no answer before the
 * ladder). Equal values are shown once (the statement's writing wins).
 */
import type { StudentLine } from '../../ai/session/state';
import { parseNumeric } from '../../engine/format';
import { fromExpression, type Node } from '../lines/editor';

export interface Tile {
  /** As shown: "10", "0,5", "7/15". */
  text: string;
  /** What a tap inserts (a fraction is a stacked fraction). */
  nodes: Node[];
  source: 'given' | 'earned';
}

/** At most this many tiles (one row on a phone); the newest earned values stay. */
export const MAX_TILES = 8;

/** A value he earned: the result of a line the engine credited. */
const earned = (line: StudentLine): string | null =>
  line.match?.verdict === 'credit' ? line.verdict.value : null;

export function buildTiles(
  given: readonly string[],
  lines: readonly StudentLine[],
): Tile[] {
  const seen = new Set<string>();
  const tile = (raw: string, source: Tile['source']): Tile | null => {
    const text = raw.trim().replace('.', ',');
    const value = parseNumeric(text);
    const nodes = fromExpression(text, [], { line: true });
    if (!value.ok || !nodes) {
      return null;
    }
    const key = `${value.value[0]}/${value.value[1]}`;
    if (seen.has(key)) {
      return null;
    }
    seen.add(key);
    return { text, nodes, source };
  };
  const fromStatement = given.flatMap(g => tile(g, 'given') ?? []);
  const fromHim = lines.flatMap(l => {
    const v = earned(l);
    return (v !== null && tile(v, 'earned')) || [];
  });
  const room = Math.max(0, MAX_TILES - fromStatement.length);
  return [
    ...fromStatement.slice(0, MAX_TILES),
    ...(room > 0 ? fromHim.slice(-room) : []),
  ];
}
