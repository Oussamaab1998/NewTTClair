/**
 * Pure layout of ProbabilityTree: where the root, the branches, the values
 * written on them and the labels at their ends go for a given width. Always
 * left to right (the root at the left, as on the exam paper), never mirrored.
 * Text is not measured: widths are estimated from the glyph ratios below, on
 * the generous side, and whatever can be centred is centred, so a small error
 * never clips. Sizes come from theme.tree. No React.
 */
import { theme } from '../../theme';
import type { ProbabilityTreeProps, TreeLeafProps } from './schemas';
import {
  countForm,
  parseTreeLabel,
  valueForm,
  type ValueForm,
} from './treeText';

// What a branch writes (its label, its value) lives in treeText.ts, free of
// the theme, so the model can be read outside the app (the harness tools).
export {
  countForm,
  parseTreeLabel,
  valueForm,
  valueParts,
  type TreeLabel,
  type ValueForm,
} from './treeText';

const T = theme.tree;

// Typesetting ratios of the math face (STIX Two Text), in ems: not theme values.
/** Height of a capital letter or a digit. */
const CAP = 0.66;
const DIGIT = 0.5;
const CAPITAL = 0.7;
const WIDE = 0.92;
const NARROW = 0.34;
const OTHER = 0.52;
const BOLD = 1.06;
/** An italic capital leans: its top starts this far to the right. */
const LEAN = 0.08;
/** Side of a "?" box. */
const BOX = 1.4;
/** The tick: where it turns, and how far its long stroke rises, as parts of its width. */
const TICK_TURN = 0.35;
const TICK_RISE = 0.55;

export interface Pt {
  x: number;
  y: number;
}
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Labels and values

/** Estimated width of a run of the math face. */
export function textWidth(text: string, size: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    em += /[0-9?]/.test(ch)
      ? DIGIT
      : /[MWmw]/.test(ch)
      ? WIDE
      : /[IJijltf.,;:'| ]/.test(ch)
      ? NARROW
      : /[A-Z]/.test(ch)
      ? CAPITAL
      : OTHER;
  }
  return em * size * (bold ? BOLD : 1);
}

// ---------------------------------------------------------------------------
// The laid-out tree

interface Found {
  /** A value the student found: bold, with a tick beside it. */
  found: boolean;
  tick: Pt[] | null;
}
export type LaidValue = { size: number; box: Box } & (
  | ({
      kind: 'frac';
      num: string;
      den: string;
      x: number;
      numY: number;
      denY: number;
      bar: Seg;
    } & Found)
  | ({ kind: 'plain'; text: string; x: number; y: number } & Found)
  | { kind: 'unknown'; x: number; y: number; ask: boolean }
);

export interface LaidLabel {
  text: string;
  italic: boolean;
  size: number;
  /** Start of the text and its baseline. */
  x: number;
  y: number;
  overline: Seg | null;
  box: Box;
}

export interface LaidEdge {
  id: string;
  level: 1 | 2;
  /** The end of a path: no branch leaves it. */
  leaf: boolean;
  marked: boolean;
  /** The branch line, cut where its value sits and before its arrowhead. */
  segments: Seg[];
  /** Marked: the filled arrowhead at the end of the branch. */
  head: Pt[] | null;
  value: LaidValue | null;
  label: LaidLabel;
  /** Counts mode: the people at the end of the branch. */
  count: LaidValue | null;
  /** The row of the end of the branch, from the end of its line (the touch target of a leaf). */
  row: Box;
}

export interface TreeLayout {
  width: number;
  height: number;
  rowHeight: number;
  root: {
    x: number;
    y: number;
    /** Counts mode: the people at the root; the text ends at `x`. */
    count: {
      text: string;
      size: number;
      x: number;
      y: number;
      box: Box;
    } | null;
  };
  /** In reading order: a branch, then the branches leaving its end. */
  edges: LaidEdge[];
}

export interface TreeLayoutOptions {
  /** Rows at least this far apart (interactive: a touch target). */
  minRow?: number;
  /** The end of a path is at least this wide, its label centred in it (interactive: a touch target). */
  leafSlot?: number;
  /** More branches drawn marked (the path the student selected). */
  alsoMarked?: readonly string[];
}

function formSize(
  f: ValueForm,
  size: number,
  found: boolean,
): { w: number; h: number } {
  const cap = CAP * size;
  const tick = found ? T.gap + T.tick : 0;
  switch (f.kind) {
    case 'frac':
      return {
        w:
          Math.max(
            textWidth(f.num, size, found),
            textWidth(f.den, size, found),
          ) +
          T.gap +
          tick,
        h: 2 * (cap + T.barGap),
      };
    case 'plain':
      return {
        w: textWidth(f.text, size, found) + tick,
        h: cap + 2 * T.barGap,
      };
    case 'unknown':
      return { w: BOX * size, h: BOX * size };
  }
}

/** A value centred on (cx, cy). */
function place(
  f: ValueForm,
  cx: number,
  cy: number,
  size: number,
  flags: { found: boolean; ask: boolean },
): LaidValue {
  const cap = CAP * size;
  if (f.kind === 'unknown') {
    const side = BOX * size;
    return {
      kind: 'unknown',
      size,
      x: cx,
      y: cy + cap / 2,
      ask: flags.ask,
      box: { x: cx - side / 2, y: cy - side / 2, w: side, h: side },
    };
  }
  const { found } = flags;
  const { w, h } = formSize(f, size, found);
  const box: Box = { x: cx - w / 2, y: cy - h / 2, w, h };
  const beside = found ? T.gap + T.tick : 0;
  // the digits are centred in what the tick leaves
  const x = cx - beside / 2;
  const tx = box.x + w - T.tick;
  const tick: Pt[] | null = found
    ? [
        { x: tx, y: cy },
        { x: tx + T.tick * TICK_TURN, y: cy + T.tick * TICK_TURN },
        { x: tx + T.tick, y: cy - T.tick * TICK_RISE },
      ]
    : null;
  if (f.kind === 'frac') {
    const half = (w - beside) / 2;
    return {
      kind: 'frac',
      num: f.num,
      den: f.den,
      size,
      x,
      numY: cy - T.barGap,
      denY: cy + T.barGap + cap,
      bar: { x1: x - half, y1: cy, x2: x + half, y2: cy },
      found,
      tick,
      box,
    };
  }
  return {
    kind: 'plain',
    text: f.text,
    size,
    x,
    y: cy + cap / 2,
    found,
    tick,
    box,
  };
}

/** The line, without the part under `box` (centred on it at `at`) and without its last `trim` points. */
function cut(line: Seg, at: number, box: Box | null, trim: number): Seg[] {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy);
  const end = length > 0 ? Math.max(0, 1 - trim / length) : 1;
  const piece = (a: number, b: number): Seg[] =>
    b > a
      ? [
          {
            x1: line.x1 + dx * a,
            y1: line.y1 + dy * a,
            x2: line.x1 + dx * b,
            y2: line.y1 + dy * b,
          },
        ]
      : [];
  if (!box) {
    return piece(0, end);
  }
  const reach = Math.min(
    dx !== 0 ? (box.w / 2 + T.valueClear) / Math.abs(dx) : Infinity,
    dy !== 0 ? (box.h / 2 + T.valueClear) / Math.abs(dy) : Infinity,
  );
  return [
    ...piece(0, Math.min(end, at - reach)),
    ...piece(Math.max(0, at + reach), end),
  ];
}

/** The arrowhead whose tip is the end of the line. */
function headAt(line: Seg): Pt[] {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const bx = line.x2 - ux * T.headLength;
  const by = line.y2 - uy * T.headLength;
  return [
    { x: line.x2, y: line.y2 },
    { x: bx - uy * T.headHalf, y: by + ux * T.headHalf },
    { x: bx + uy * T.headHalf, y: by - ux * T.headHalf },
  ];
}

/**
 * Lays the tree out in a box `width` wide. The leaves share the height in
 * even rows; a node sits at the middle of its branches; the two levels get
 * the same branch length, whatever is left once the labels have their room.
 */
export function treeLayout(
  props: ProbabilityTreeProps,
  width: number,
  opts: TreeLayoutOptions = {},
): TreeLayout {
  const counts = props.rootCount !== undefined;
  const labelSize = props.compact
    ? theme.font.size.small
    : theme.font.size.bodyLarge;
  const valueSize = props.compact
    ? theme.font.size.caption
    : theme.font.size.small;
  const cap = CAP * labelSize;
  const marked = new Set([...props.mark, ...(opts.alsoMarked ?? [])]);

  // rows
  const rows = props.branches.reduce(
    (n, b) => n + (b.children?.length ?? 1),
    0,
  );
  const [share, lo, hi] = props.compact
    ? [T.compactHeight, T.compactRowMin, T.compactRowMax]
    : [T.height, T.rowMin, T.rowMax];
  const rowHeight = Math.max(
    opts.minRow ?? 0,
    Math.min(hi, Math.max(lo, share / rows)),
  );
  let row = 0;
  const nodes = props.branches.map(b => {
    const ys = (b.children ?? [b]).map(
      () => T.padY + rowHeight * (row++ + 1 / 2),
    );
    return { b, ys, y: (ys[0]! + ys[ys.length - 1]!) / 2 };
  });
  const rootY = (nodes[0]!.y + nodes[nodes.length - 1]!.y) / 2;

  // columns
  const isFound = (e: TreeLeafProps) => e.show === 'found';
  const endWidth = (e: TreeLeafProps): number => {
    const c = countForm(e, counts);
    return (
      textWidth(parseTreeLabel(e.latex).text, labelSize) +
      (c
        ? T.gap + formSize(c, labelSize, isFound(e) && c.kind !== 'unknown').w
        : 0)
    );
  };
  const second = props.branches.flatMap(b => b.children ?? []);
  const deep = second.length > 0;
  // interactive: the end of a path is a bordered target, its label centred with some air
  const air = opts.leafSlot === undefined ? 0 : 2 * T.gap;
  const slot = opts.leafSlot === undefined ? 0 : opts.leafSlot - 2 * T.gap;
  const lone = props.branches.some(b => !b.children);
  const w1 = Math.max(
    Math.max(...props.branches.map(endWidth)) + (lone ? air : 0),
    lone ? slot : 0,
  );
  const w2 = deep ? Math.max(Math.max(...second.map(endWidth)) + air, slot) : 0;
  const rootText =
    props.rootCount === undefined ? null : String(props.rootCount);
  const rootWidth = rootText === null ? 0 : textWidth(rootText, labelSize);
  const rootX =
    T.padX + (rootText === null ? 0 : rootWidth + T.gap) + T.rootDot;
  const free =
    width - rootX - T.padX - T.gap - w1 - (deep ? 2 * T.gap + w2 : 0);
  const span = Math.max(T.minSpan, free / (deep ? 2 : 1));
  const end1 = rootX + span;
  const start2 = end1 + T.gap + w1 + T.gap;
  const end2 = start2 + span;

  // Where the values of the branches leaving one node sit along them: all at
  // the same place when two fractions fit one above the other, else by turns
  // far and near, so two values never read as one tall fraction. It depends
  // on the rows only, so a value never moves when another one appears.
  const fraction = 2 * (CAP * valueSize + T.barGap);
  const valuesAt = (ys: readonly number[]): number[] => {
    let spacing = Infinity;
    for (let i = 1; i < ys.length; i++) {
      spacing = Math.min(spacing, ys[i]! - ys[i - 1]!);
    }
    const tight = T.valueAt * spacing < fraction + T.valueRoom;
    return ys.map((_, i) =>
      !tight ? T.valueAt : i % 2 === 0 ? T.valueAtFar : T.valueAtNear,
    );
  };

  const edge = (
    e: TreeLeafProps,
    level: 1 | 2,
    from: Pt,
    to: Pt,
    at: number,
    leaf: boolean,
  ): LaidEdge => {
    const column = level === 1 ? w1 : w2;
    const line: Seg = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    const isMarked = marked.has(e.id);
    const flags = { found: isFound(e), ask: props.ask === e.id };
    const form = valueForm(e, counts);
    const value = form
      ? place(
          form,
          from.x + (to.x - from.x) * at,
          from.y + (to.y - from.y) * at,
          valueSize,
          flags,
        )
      : null;
    const label = parseTreeLabel(e.latex);
    const centred =
      leaf && opts.leafSlot !== undefined ? (column - endWidth(e)) / 2 : 0;
    const lx = to.x + T.gap + centred;
    const lw = textWidth(label.text, labelSize);
    const lean = label.italic ? LEAN * labelSize : 0;
    const overY = to.y - cap / 2 - T.barGap;
    const cForm = countForm(e, counts);
    const cFlags = {
      ...flags,
      found: flags.found && cForm?.kind !== 'unknown',
    };
    const count = cForm
      ? place(
          cForm,
          lx + lw + T.gap + formSize(cForm, labelSize, cFlags.found).w / 2,
          to.y,
          labelSize,
          cFlags,
        )
      : null;
    return {
      id: e.id,
      level,
      leaf,
      marked: isMarked,
      segments: cut(
        line,
        at,
        value ? value.box : null,
        isMarked ? T.headLength : 0,
      ),
      head: isMarked ? headAt(line) : null,
      value,
      label: {
        text: label.text,
        italic: label.italic,
        size: labelSize,
        x: lx,
        y: to.y + cap / 2,
        overline: label.overline
          ? { x1: lx + lean, y1: overY, x2: lx + lean + lw, y2: overY }
          : null,
        box: {
          x: lx,
          y: overY - T.ruleWidth,
          w: lw + lean,
          h: cap + T.barGap + T.ruleWidth,
        },
      },
      count,
      row: {
        x: to.x,
        y: to.y - rowHeight / 2,
        w: Math.min(width - to.x, column + 2 * T.gap),
        h: rowHeight,
      },
    };
  };

  const root: Pt = { x: rootX, y: rootY };
  const edges: LaidEdge[] = [];
  const firstAt = valuesAt(nodes.map(n => n.y));
  nodes.forEach((n, i) => {
    const kids = n.b.children;
    edges.push(edge(n.b, 1, root, { x: end1, y: n.y }, firstAt[i]!, !kids));
    const secondAt = valuesAt(n.ys);
    kids?.forEach((c, j) =>
      edges.push(
        edge(
          c,
          2,
          { x: start2, y: n.y },
          { x: end2, y: n.ys[j]! },
          secondAt[j]!,
          true,
        ),
      ),
    );
  });

  const countX = rootX - T.rootDot - T.gap;
  return {
    width,
    height: rows * rowHeight + 2 * T.padY,
    rowHeight,
    root: {
      ...root,
      count:
        rootText === null
          ? null
          : {
              text: rootText,
              size: labelSize,
              x: countX,
              y: rootY + cap / 2,
              box: {
                x: countX - rootWidth,
                y: rootY - cap / 2,
                w: rootWidth,
                h: cap,
              },
            },
    },
    edges,
  };
}
