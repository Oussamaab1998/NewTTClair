/**
 * Scaffolds for the worksheet, built ONLY from his own earlier line: a
 * `StudentLine` the session recorded and the engine credited (a small case,
 * an earlier question). Never from the expected answer, the graph or the
 * plan: `buildScaffold` takes a StudentLine and nothing else, so a value he
 * has not written cannot get into a scaffold (tested).
 *
 * Levels, from most to least support (support fades as he gets surer):
 *   3  the same shape as his line, every number a blank, the rest locked;
 *   2  his line shown above an empty line;
 *   1  a "you wrote one like this" chip (a tap shows his line);
 *   0  nothing.
 */
import type { SkillLevel } from '../../ai/profile/profile';
import type { StudentLine } from '../../ai/session/state';
import { fromExpression, serialize, type Node } from '../lines/editor';

export type ScaffoldLevel = 0 | 1 | 2 | 3;

/**
 * Support from his profile on this skill (weak 3, shaky 2, ok 1, solid 0; a
 * skill never seen gets the chip), plus one per «ما نعرفش» on this step,
 * capped at 3.
 */
const BASE: Record<SkillLevel, ScaffoldLevel> = {
  weak: 3,
  shaky: 2,
  ok: 1,
  solid: 0,
  unknown: 1,
};

export function scaffoldLevel(
  profile: SkillLevel,
  dontKnowsOnStep: number,
): ScaffoldLevel {
  const extra = Math.max(0, Math.floor(dontKnowsOnStep));
  return Math.min(3, BASE[profile] + extra) as ScaffoldLevel;
}

/** His line as the page draws it. */
export interface OwnLine {
  /** The StudentLine id (L3...). */
  id: string;
  nodes: Node[];
}

export type Scaffold =
  | { level: 3; from: OwnLine; template: Node[] }
  | { level: 1 | 2; from: OwnLine };

/** `P(A) = ...`, `p(X=0)=...`: the label is not part of the shape. */
const LABEL = /^\s*[pPEV]\s*\([^()]{1,20}\)\s*=\s*/;

/** His raw line as editor nodes (× written as x between digits too), or null. */
export function ownNodes(raw: string): Node[] | null {
  let text = raw.replace(LABEL, '');
  for (let prev = ''; prev !== text; ) {
    prev = text;
    text = text.replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2');
  }
  return fromExpression(text, ['n', 'k'], { line: true });
}

/** Only a line the engine credited is ever shown back as a model. */
const credited = (line: StudentLine) => line.match?.verdict === 'credit';

/**
 * His most recent credited line on this plan node (the same step in a small
 * case or an earlier question has the same node id), or null.
 */
export function sourceFor(
  lines: readonly StudentLine[],
  node: string,
): StudentLine | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;
    if (
      line.match?.verdict === 'credit' &&
      line.match.node === node &&
      ownNodes(line.raw)
    ) {
      return line;
    }
  }
  return null;
}

export function buildScaffold(
  line: StudentLine,
  level: ScaffoldLevel,
): Scaffold | null {
  const nodes = level === 0 || !credited(line) ? null : ownNodes(line.raw);
  if (!nodes) {
    return null;
  }
  const from = { id: line.id, nodes };
  return level === 3
    ? { level, from, template: blanks(nodes) }
    : { level: level as 1 | 2, from };
}

const isNumberSym = (n: Node | undefined) =>
  n?.k === 'sym' && /^[0-9,]$/.test(n.v);

/** The same shape with every number a blank; signs, letters and structure locked. */
export function blanks(nodes: readonly Node[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i]!;
    if (isNumberSym(n)) {
      while (isNumberSym(nodes[i])) {
        i += 1;
      }
      out.push({ k: 'hole', fill: [] });
      continue;
    }
    switch (n.k) {
      case 'sym':
        out.push({ k: 'sym', v: n.v, lock: true });
        break;
      case 'frac':
        out.push({
          k: 'frac',
          num: blanks(n.num),
          den: blanks(n.den),
          lock: true,
        });
        break;
      case 'pow':
        out.push({ k: 'pow', exp: blanks(n.exp), lock: true });
        break;
      case 'group':
        out.push({ k: 'group', body: blanks(n.body), lock: true });
        break;
      case 'choose':
        out.push({ k: 'choose', n: blanks(n.n), r: blanks(n.r), lock: true });
        break;
      case 'hole':
        out.push({ k: 'hole', fill: [] });
        break;
    }
    i += 1;
  }
  return out;
}

/** Two lines have the same shape when they differ only by their numbers. */
export const shapeOf = (nodes: readonly Node[]): string =>
  serialize(blanks(nodes));
