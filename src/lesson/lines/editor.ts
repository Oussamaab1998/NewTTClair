/**
 * Structured math editor model (no React): a tree of symbols, fraction
 * slots, exponent slots and parenthesis groups. Groups are created as a pair,
 * so parentheses are always balanced; slots serialize with their own
 * parentheses, so "e^-2x" can never be read as e^(-2)·x.
 * JSON-only state (snapshots, replay).
 *
 * Exponent rule (so an exponent never swallows the rest of a line):
 * + and × and the fraction key leave the exponent first; − stays inside only
 * at the start of the exponent (e^{-x}), elsewhere it leaves too; digits,
 * letters, power and parentheses stay inside; → always leaves it.
 * The fraction key wraps the term left of the cursor (back to the last + or −
 * of the slot) as the numerator; with nothing there it inserts an empty one.
 * ")" leaves the nearest parenthesis group.
 *
 * 2D moves (innermost structure wins): ↓ leaves an exponent to its base, or
 * goes from a numerator to its denominator; ↑ enters the exponent next to
 * the cursor, or goes from a denominator to its numerator. Widen selects the
 * atom left of the cursor, then its term, its slot, the enclosing structure;
 * with a selection the fraction key and "( )" wrap it, ⌫ deletes it, any
 * other key ends it and acts after it. ⌫ deletes one piece (a power, a group
 * or a fraction is one piece); in an empty slot it dissolves the structure and
 * keeps the rest; at the start of a filled slot it only steps out to the left.
 * Rules in docs/EDITOR.md.
 *
 * Written lines (the worksheet): "=" lives at the top level only (typed in a
 * slot, it leaves every structure first) and splits the line into sides that
 * the term, widen and wrap rules never cross; "," is the decimal comma; ÷ is
 * the fraction key, so a divisor is always one stacked denominator and
 * "990 ÷ 3 × 2 × 1" cannot be written ambiguously; n, k, ! and C(n, r) write
 * counting formulas (C serialises as C((n),(r)), read by the engine's
 * counting notation).
 *
 * Scaffolds: a `hole` is a blank he fills; a node with `lock` is part of the
 * scaffold and cannot be edited or deleted. In a line with locks or holes
 * only the inside of a hole is writable: a key pressed elsewhere writes in the
 * next blank, a sign or ÷ the scaffold already has next is stepped over, "="
 * goes to the blank after the scaffold's "=", ⌫ never deletes a locked piece
 * (it goes back to the previous blank) and "clear" empties the blanks.
 */

import {
  parseExpression,
  precedence,
  type Node as Expr,
} from '../../engine/expression';

export type Node =
  | { k: 'sym'; v: string; lock?: true }
  | { k: 'frac'; num: Node[]; den: Node[]; lock?: true }
  /** Superscript applied to the node before it. */
  | { k: 'pow'; exp: Node[]; lock?: true }
  | { k: 'group'; body: Node[]; lock?: true }
  /** C(n, r): r chosen among n, drawn C with n below and r above (C_n^r). */
  | { k: 'choose'; n: Node[]; r: Node[]; lock?: true }
  /** A blank of a scaffold: he writes in it; it is never locked. */
  | { k: 'hole'; fill: Node[] };

export type SlotName = 'num' | 'den' | 'exp' | 'body' | 'n' | 'r' | 'fill';
export type PathStep = { i: number; slot: SlotName };
export interface Cursor {
  path: PathStep[];
  at: number;
}
/** A run of whole atoms [from, to) in one slot. */
export interface Selection {
  path: PathStep[];
  from: number;
  to: number;
}
export interface EditorState {
  root: Node[];
  cursor: Cursor;
  /** Set by widen; any other key ends it. */
  sel?: Selection;
  /** The node a wrap just made (shown briefly). */
  flash?: { path: PathStep[]; index: number };
  /** A structural change this key made (the card offers its undo). */
  change?: Change;
}

export type Change =
  | 'fraction'
  | 'power'
  | 'group'
  | 'remove_fraction'
  | 'remove_power'
  | 'remove_group';

const removal = (n: Node): Change | undefined =>
  n.k === 'frac'
    ? 'remove_fraction'
    : n.k === 'pow'
    ? 'remove_power'
    : n.k === 'group'
    ? 'remove_group'
    : undefined;

/** Symbols a key can insert (digits, variables, e, operators). */
export const SYMBOLS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'x',
  't',
  'e',
  '+',
  '-',
  '*',
  // Written lines (worksheet keys only).
  'n',
  'k',
  ',',
  '=',
  '!',
] as const;
export type Sym = (typeof SYMBOLS)[number];
export type Key =
  | Sym
  | 'frac'
  /** ÷: the fraction key under its school name (same behaviour). */
  | 'div'
  | 'pow'
  | 'group'
  /** An empty C(n, r), the cursor in n. */
  | 'choose'
  | 'left'
  | 'right'
  /** Leaves the nearest parenthesis group (the cursor goes after it). */
  | 'close'
  | 'up'
  | 'down'
  | 'widen'
  | 'back'
  | 'clear'
  /** A tap: the cursor goes to `at` in that slot (default: its end). */
  | { focus: PathStep[]; at?: number }
  /** A number tile: these nodes go in at the cursor. */
  | { insert: Node[] };

export const emptyEditor = (): EditorState => ({
  root: [],
  cursor: { path: [], at: 0 },
});

const slotsOf = (n: Node): SlotName[] =>
  n.k === 'frac'
    ? ['num', 'den']
    : n.k === 'pow'
    ? ['exp']
    : n.k === 'group'
    ? ['body']
    : n.k === 'choose'
    ? ['n', 'r']
    : n.k === 'hole'
    ? ['fill']
    : [];

/** The nodes of one slot of a composite (empty for a symbol). */
function slotOf(n: Node, slot: SlotName): Node[] {
  switch (n.k) {
    case 'frac':
      return slot === 'den' ? n.den : n.num;
    case 'pow':
      return n.exp;
    case 'group':
      return n.body;
    case 'choose':
      return slot === 'r' ? n.r : n.n;
    case 'hole':
      return n.fill;
    default:
      return [];
  }
}

function getSlot(root: Node[], path: readonly PathStep[]): Node[] {
  let cur = root;
  for (const { i, slot } of path) {
    cur = slotOf(cur[i]!, slot);
  }
  return cur;
}

/** Immutable update of the slot at `path`. */
function setSlot(
  root: Node[],
  path: readonly PathStep[],
  f: (slot: Node[]) => Node[],
): Node[] {
  if (path.length === 0) {
    return f(root);
  }
  const [{ i, slot }, ...rest] = path as [PathStep, ...PathStep[]];
  return root.map((n, k) =>
    k === i
      ? ({
          ...n,
          [slot]: setSlot(slotOf(n, slot), rest, f),
        } as Node)
      : n,
  );
}

const make = (key: 'frac' | 'pow' | 'group' | 'choose'): Node =>
  key === 'frac'
    ? { k: 'frac', num: [], den: [] }
    : key === 'pow'
    ? { k: 'pow', exp: [] }
    : key === 'choose'
    ? { k: 'choose', n: [], r: [] }
    : { k: 'group', body: [] };

const isSym = (n: Node | undefined, ...vs: string[]) =>
  n?.k === 'sym' && vs.includes(n.v);

const isDigit = (n: Node | undefined) => n?.k === 'sym' && /^[0-9]$/.test(n.v);

/** A term goes back to the last + or − of its slot, or to the "=" of its side. */
const TERM_EDGE = ['+', '-', '='];

/** Keys that leave an exponent before acting (see the rule above). */
function leavesExponent(key: Key, at: number): boolean {
  return (
    key === '+' ||
    key === '*' ||
    key === 'frac' ||
    key === 'right' ||
    (key === '-' && at > 0)
  );
}

/** The fraction key with a term left of the cursor: it becomes the numerator. */
function wrapTerm({ root, cursor: { path, at } }: EditorState) {
  const slot = getSlot(root, path);
  let start = at;
  while (start > 0 && !isSym(slot[start - 1], ...TERM_EDGE)) {
    start -= 1;
  }
  // Right after a sign ("2×"): nothing to wrap, an empty fraction follows it.
  const [from, end] = trimSigns(slot, start, at);
  if (from === end || end < at) {
    return null;
  }
  const node: Node = { k: 'frac', num: slot.slice(from, at), den: [] };
  return {
    root: setSlot(root, path, sl => [
      ...sl.slice(0, from),
      node,
      ...sl.slice(at),
    ]),
    cursor: { path: [...path, { i: from, slot: 'den' as const }], at: 0 },
    change: 'fraction' as const,
  };
}

/**
 * A wrapped part never takes a sign at its edges: a trailing sign (and a
 * leading + or ×) stays outside the new fraction or parentheses; a leading −
 * stays inside (−x is one thing). An "=" never goes inside.
 */
function trimSigns(
  slot: readonly Node[],
  from: number,
  to: number,
): [number, number] {
  let f = from;
  let t = to;
  while (f < t && isSym(slot[f], '+', '*', '=')) {
    f += 1;
  }
  while (t > f && isSym(slot[t - 1], '+', '-', '*', '=')) {
    t -= 1;
  }
  return [f, t];
}

/** The side of a line ("=" splits it) holding [from, to): [start, end). */
function sideOf(
  slot: readonly Node[],
  from: number,
  to: number,
): [number, number] {
  let start = from;
  while (start > 0 && !isSym(slot[start - 1], '=')) {
    start -= 1;
  }
  let end = to;
  while (end < slot.length && !isSym(slot[end], '=')) {
    end += 1;
  }
  return [start, end];
}

/** Atoms of a slot as [start, end): a number (decimal comma included), a
 * letter, a sign, a group, a fraction or a C(n, r), each with the powers and
 * factorials that follow it. */
function atoms(slot: readonly Node[]): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < slot.length) {
    const start = i;
    const n = slot[i]!;
    i += 1;
    while (
      isDigit(n) &&
      (isDigit(slot[i]) || (isSym(slot[i], ',') && isDigit(slot[i + 1])))
    ) {
      i += 1;
    }
    if (!isSym(n, ...SIGNS)) {
      while (slot[i]?.k === 'pow' || isSym(slot[i], '!')) {
        i += 1;
      }
    }
    out.push([start, i]);
  }
  return out;
}

const select = (
  root: Node[],
  path: PathStep[],
  from: number,
  to: number,
): EditorState => ({ root, cursor: { path, at: to }, sel: { path, from, to } });

/** The enclosing structure as an atom of the parent slot (a power with its base). */
function enclosing(root: Node[], path: PathStep[]): EditorState | null {
  const last = path[path.length - 1];
  if (!last) {
    return null;
  }
  const parent = path.slice(0, -1);
  const atom = atoms(getSlot(root, parent)).find(
    ([a, b]) => a <= last.i && last.i < b,
  )!;
  return select(root, parent, atom[0], atom[1]);
}

function widen(s: EditorState): EditorState {
  const { root, cursor, sel } = s;
  if (!sel) {
    const slot = getSlot(root, cursor.path);
    const as = atoms(slot);
    let pick =
      as.find(([a, b]) => a < cursor.at && cursor.at <= b) ??
      as.find(([a]) => a === cursor.at);
    // A sign alone is never what to wrap: take the operand before it.
    if (pick && isSym(slot[pick[0]], ...SIGNS)) {
      const start = pick[0];
      pick = as.find(([, b]) => b === start) ?? pick;
    }
    return pick
      ? select(root, cursor.path, pick[0], pick[1])
      : enclosing(root, cursor.path) ?? s;
  }
  const slot = getSlot(root, sel.path);
  let start = sel.from;
  while (start > 0 && !isSym(slot[start - 1], ...TERM_EDGE)) {
    start -= 1;
  }
  let end = sel.to;
  while (end < slot.length && !isSym(slot[end], ...TERM_EDGE)) {
    end += 1;
  }
  const [from, to] = trimSigns(slot, start, end);
  if (from < sel.from || to > sel.to) {
    return select(root, sel.path, from, to);
  }
  // The whole slot (one side of an "="), without a dangling sign at its end.
  const [side, sideEnd] = sideOf(slot, sel.from, sel.to);
  const [, whole] = trimSigns(slot, side, sideEnd);
  if (sel.from > side || sel.to < whole) {
    return select(root, sel.path, side, whole);
  }
  return enclosing(root, sel.path) ?? s;
}

/** A key with a selection: wrap or delete it, else end it and act after it. */
function applyToSelection(s: EditorState, sel: Selection, key: Key) {
  const { root } = s;
  const { path } = sel;
  const wrapping = key === 'frac' || key === 'group';
  const [from, to] = wrapping
    ? trimSigns(getSlot(root, path), sel.from, sel.to)
    : [sel.from, sel.to];
  if (wrapping && from === to) {
    // Only signs were selected: as if nothing was, right after them.
    return apply({ root, cursor: { path, at: sel.to } }, key);
  }
  const picked = getSlot(root, path).slice(from, to);
  // A scaffold's locked parts are never wrapped or deleted.
  if (
    (wrapping || key === 'back') &&
    scaffolded(root) &&
    (!writable(root, path) || picked.some(n => n.k === 'hole' || n.lock))
  ) {
    return { root, cursor: s.cursor };
  }
  const replace = (nodes: Node[]) =>
    setSlot(root, path, sl => [
      ...sl.slice(0, from),
      ...nodes,
      ...sl.slice(to),
    ]);
  const flash = { path, index: from };
  switch (key) {
    case 'widen':
      return widen(s);
    case 'frac':
      return {
        root: replace([{ k: 'frac', num: picked, den: [] }]),
        cursor: { path: [...path, { i: from, slot: 'den' as const }], at: 0 },
        flash,
        change: 'fraction' as const,
      };
    case 'group':
      return {
        root: replace([{ k: 'group', body: picked }]),
        cursor: { path, at: from + 1 },
        flash,
        change: 'group' as const,
      };
    case 'back':
      return { root: replace([]), cursor: { path, at: from } };
    case 'left':
      return { root, cursor: { path, at: from } };
    case 'right':
      return { root, cursor: { path, at: to } };
    default:
      return apply({ root, cursor: { path, at: to } }, key);
  }
}

/** ↓: leave an exponent to its base, or go from a numerator to its
 * denominator (from r, drawn above, to n in a C(n, r)). */
function down(s: EditorState): EditorState {
  const { root, cursor } = s;
  for (let k = cursor.path.length - 1; k >= 0; k -= 1) {
    const step = cursor.path[k]!;
    const outer = cursor.path.slice(0, k);
    if (step.slot === 'exp') {
      return { root, cursor: { path: outer, at: step.i } };
    }
    if (step.slot === 'num') {
      return moveTo(s, [...outer, { i: step.i, slot: 'den' }]);
    }
    if (step.slot === 'r') {
      return moveTo(s, [...outer, { i: step.i, slot: 'n' }]);
    }
  }
  return s;
}

/** ↑: enter the exponent next to the cursor, or go from a denominator to its
 * numerator (from n to r in a C(n, r)). */
function up(s: EditorState): EditorState {
  const { root, cursor } = s;
  const slot = getSlot(root, cursor.path);
  const pow =
    slot[cursor.at]?.k === 'pow'
      ? cursor.at
      : slot[cursor.at - 1]?.k === 'pow'
      ? cursor.at - 1
      : -1;
  if (pow >= 0) {
    const exp = [...cursor.path, { i: pow, slot: 'exp' as const }];
    return { root, cursor: { path: exp, at: getSlot(root, exp).length } };
  }
  for (let k = cursor.path.length - 1; k >= 0; k -= 1) {
    const step = cursor.path[k]!;
    if (step.slot === 'den') {
      return moveTo(s, [
        ...cursor.path.slice(0, k),
        { i: step.i, slot: 'num' },
      ]);
    }
    if (step.slot === 'n') {
      return moveTo(s, [...cursor.path.slice(0, k), { i: step.i, slot: 'r' }]);
    }
  }
  return s;
}

/** Numerator <-> denominator: the cursor goes to the end of the other slot. */
function moveTo(s: EditorState, target: PathStep[]): EditorState {
  return {
    root: s.root,
    cursor: { path: target, at: getSlot(s.root, target).length },
  };
}

export function apply(s: EditorState, key: Key): EditorState {
  if (key === 'div') {
    return apply(s, 'frac');
  }
  if (s.sel) {
    return applyToSelection(s, s.sel, key);
  }
  return (scaffolded(s.root) && overScaffold(s, key)) || applyPlain(s, key);
}

/** One key without a selection (a scaffold's redirects are already done). */
function applyPlain(s: EditorState, key: Exclude<Key, 'div'>): EditorState {
  const { root, cursor } = s;
  const { path, at } = cursor;
  const slot = getSlot(root, path);
  const parent = path.slice(0, -1);
  const last = path[path.length - 1];

  // "=" lives at the top level: typed in a slot, it leaves every structure.
  if (key === '=' && path.length > 0) {
    return applyPlain({ root, cursor: { path: [], at: path[0]!.i + 1 } }, key);
  }
  if (last?.slot === 'exp' && leavesExponent(key, at)) {
    const out = { root, cursor: { path: parent, at: last.i + 1 } };
    return key === 'right' ? out : apply(out, key);
  }
  if (typeof key === 'object') {
    if ('insert' in key) {
      return writable(root, path)
        ? {
            root: setSlot(root, path, sl => [
              ...sl.slice(0, at),
              ...key.insert,
              ...sl.slice(at),
            ]),
            cursor: { path, at: at + key.insert.length },
          }
        : s;
    }
    const len = getSlot(root, key.focus).length;
    return {
      root,
      cursor: { path: key.focus, at: Math.min(key.at ?? len, len) },
    };
  }
  switch (key) {
    case 'clear':
      return scaffolded(root)
        ? scaffoldEditor(emptyHoles(root))
        : emptyEditor();
    case 'up':
      return up(s);
    case 'down':
      return down(s);
    case 'widen':
      return widen(s);
    case 'close': {
      const k = path.map(p => p.slot).lastIndexOf('body');
      return k < 0
        ? s
        : { root, cursor: { path: path.slice(0, k), at: path[k]!.i + 1 } };
    }
    case 'frac':
    case 'pow':
    case 'group':
    case 'choose': {
      if (!writable(root, path)) {
        return s;
      }
      const wrapped = key === 'frac' ? wrapTerm(s) : null;
      if (wrapped) {
        return wrapped;
      }
      const node = make(key);
      return {
        root: setSlot(root, path, sl => [
          ...sl.slice(0, at),
          node,
          ...sl.slice(at),
        ]),
        cursor: { path: [...path, { i: at, slot: slotsOf(node)[0]! }], at: 0 },
        // The undo chip of the analysis lines (no C(n, r) key there).
        ...(key !== 'choose' && {
          change:
            key === 'frac'
              ? ('fraction' as const)
              : key === 'pow'
              ? ('power' as const)
              : ('group' as const),
        }),
      };
    }
    case 'left': {
      if (at > 0) {
        const prev = slot[at - 1]!;
        const slots = slotsOf(prev);
        if (slots.length > 0) {
          const name = slots[slots.length - 1]!;
          const inner = [...path, { i: at - 1, slot: name }];
          return {
            root,
            cursor: { path: inner, at: getSlot(root, inner).length },
          };
        }
        return { root, cursor: { path, at: at - 1 } };
      }
      if (!last) {
        return s;
      }
      // The slot before this one in the same structure (numerator, n), at its end.
      const names = slotsOf(getSlot(root, parent)[last.i]!);
      const before = names[names.indexOf(last.slot) - 1];
      if (before) {
        const other = [...parent, { i: last.i, slot: before }];
        return {
          root,
          cursor: { path: other, at: getSlot(root, other).length },
        };
      }
      return { root, cursor: { path: parent, at: last.i } };
    }
    case 'right': {
      if (at < slot.length) {
        const next = slot[at]!;
        const slots = slotsOf(next);
        if (slots.length > 0) {
          return {
            root,
            cursor: { path: [...path, { i: at, slot: slots[0]! }], at: 0 },
          };
        }
        return { root, cursor: { path, at: at + 1 } };
      }
      if (!last) {
        return s;
      }
      // The slot after this one in the same structure (denominator, r), at its start.
      const names = slotsOf(getSlot(root, parent)[last.i]!);
      const after = names[names.indexOf(last.slot) + 1];
      if (after) {
        return {
          root,
          cursor: { path: [...parent, { i: last.i, slot: after }], at: 0 },
        };
      }
      return { root, cursor: { path: parent, at: last.i + 1 } };
    }
    case 'back': {
      // A scaffold: nothing locked is deleted, a blank is never dissolved.
      if (
        scaffolded(root) &&
        (!writable(root, path) ||
          (at === 0 && last && getSlot(root, parent)[last.i]!.k === 'hole'))
      ) {
        return toPreviousHole(s);
      }
      if (at > 0) {
        // One piece: a symbol, or a whole power / group / fraction.
        const change = removal(slot[at - 1]!);
        return {
          root: setSlot(root, path, sl => [
            ...sl.slice(0, at - 1),
            ...sl.slice(at),
          ]),
          cursor: { path, at: at - 1 },
          ...(change && { change }),
        };
      }
      if (!last) {
        return s;
      }
      if (slot.length > 0) {
        // At the start of a filled slot: step out to the left of the structure.
        return { root, cursor: { path: parent, at: last.i } };
      }
      // An empty slot dissolves its structure; the other slot's content stays.
      const owner = getSlot(root, parent)[last.i]!;
      const names = slotsOf(owner);
      const kept = names
        .filter(name => name !== last.slot)
        .flatMap(name => slotOf(owner, name));
      const change = removal(owner);
      return {
        root: setSlot(root, parent, sl => [
          ...sl.slice(0, last.i),
          ...kept,
          ...sl.slice(last.i + 1),
        ]),
        // After a returning numerator; before a returning denominator.
        cursor: {
          path: parent,
          at: names.indexOf(last.slot) > 0 ? last.i + kept.length : last.i,
        },
        ...(change && { change }),
      };
    }
    default:
      return writable(root, path)
        ? {
            root: setSlot(root, path, sl => [
              ...sl.slice(0, at),
              { k: 'sym', v: key },
              ...sl.slice(at),
            ]),
            cursor: { path, at: at + 1 },
          }
        : s;
  }
}

const isLocked = (n: Node) => 'lock' in n && n.lock === true;

/** A line with a scaffold: it holds locked parts or blanks. */
export function scaffolded(root: readonly Node[]): boolean {
  return root.some(n => n.k === 'hole' || isLocked(n));
}

/** Everywhere in a plain line; in a scaffold, only inside a blank. */
function writable(root: readonly Node[], path: readonly PathStep[]): boolean {
  let locked = scaffolded(root);
  let slot: readonly Node[] = root;
  for (const { i, slot: name } of path) {
    const n = slot[i]!;
    locked = n.k === 'hole' ? false : locked || isLocked(n);
    slot = slotOf(n, name);
  }
  return !locked;
}

const samePath = (a: readonly PathStep[], b: readonly PathStep[]) =>
  a.length === b.length &&
  a.every((p, k) => p.i === b[k]!.i && p.slot === b[k]!.slot);

const startsWith = (path: readonly PathStep[], prefix: readonly PathStep[]) =>
  prefix.length <= path.length &&
  samePath(path.slice(0, prefix.length), prefix);

/** A scaffold in reading order: its blanks, its locked signs, the bar of a locked fraction. */
type Cell =
  | { kind: 'hole'; path: PathStep[] }
  | { kind: 'sym'; v: string }
  | { kind: 'bar' };

interface Stream {
  cells: Cell[];
  /** The cell right after the cursor (when it is not in a blank). */
  at: number;
  /** The blank the cursor is in, if any. */
  hole: number | null;
  /** The cursor is at the end of that blank, which is not empty. */
  afterFilled: boolean;
}

function stream(root: readonly Node[], cursor: Cursor): Stream {
  const cells: Cell[] = [];
  const found = { at: -1, hole: -1, afterFilled: false };
  const here = (path: PathStep[], i: number) => {
    if (found.at < 0 && cursor.at === i && samePath(path, cursor.path)) {
      found.at = cells.length;
    }
  };
  const walk = (nodes: readonly Node[], path: PathStep[]) => {
    nodes.forEach((n, i) => {
      here(path, i);
      if (n.k === 'hole') {
        const fill = [...path, { i, slot: 'fill' as const }];
        if (found.hole < 0 && startsWith(cursor.path, fill)) {
          found.hole = cells.length;
          found.afterFilled =
            cursor.path.length === fill.length &&
            n.fill.length > 0 &&
            cursor.at === n.fill.length;
        }
        cells.push({ kind: 'hole', path: fill });
      } else if (n.k === 'sym') {
        if (isLocked(n)) {
          cells.push({ kind: 'sym', v: n.v });
        }
      } else {
        slotsOf(n).forEach((name, j) => {
          if (j > 0 && n.k === 'frac' && isLocked(n)) {
            cells.push({ kind: 'bar' });
          }
          walk(slotOf(n, name), [...path, { i, slot: name }]);
        });
      }
    });
    here(path, nodes.length);
  };
  walk(root, []);
  return {
    cells,
    at: found.at < 0 ? cells.length : found.at,
    hole: found.hole < 0 ? null : found.hole,
    afterFilled: found.afterFilled,
  };
}

/** The cursor at the end of the first blank from cell `from` on, or null. */
function intoHole(
  root: Node[],
  cells: readonly Cell[],
  from: number,
): EditorState | null {
  const cell = cells.slice(from).find(c => c.kind === 'hole');
  return cell?.kind === 'hole'
    ? { root, cursor: { path: cell.path, at: getSlot(root, cell.path).length } }
    : null;
}

/** ⌫ in a scaffold where nothing may be deleted: to the end of the previous blank. */
function toPreviousHole(s: EditorState): EditorState {
  const { cells, at, hole } = stream(s.root, s.cursor);
  for (let c = (hole ?? at) - 1; c >= 0; c -= 1) {
    const cell = cells[c]!;
    if (cell.kind === 'hole') {
      return intoHole(s.root, cells, c)!;
    }
  }
  return s;
}

/** Signs and ÷ he may type over when the scaffold has them next. */
const OVER: readonly string[] = ['+', '-', '*', '=', 'frac'];
const MOVES: readonly string[] = [
  'left',
  'right',
  'up',
  'down',
  'widen',
  'close',
  'back',
  'clear',
];

/** A key in a scaffold outside a blank, or a sign the scaffold already has (null: act as usual). */
function overScaffold(
  s: EditorState,
  key: Exclude<Key, 'div'>,
): EditorState | null {
  if (typeof key === 'object' ? 'focus' in key : MOVES.includes(key)) {
    return null;
  }
  const { root } = s;
  const { cells, at, hole, afterFilled } = stream(root, s.cursor);
  const typed = typeof key === 'string' ? key : '';
  if (hole !== null && key !== '=' && !(afterFilled && OVER.includes(typed))) {
    return null; // in a blank: he writes there
  }
  const from = hole === null ? at : hole + 1;
  const next = cells[from];
  const same =
    (next?.kind === 'sym' && next.v === typed) ||
    (next?.kind === 'bar' && typed === 'frac');
  if (same) {
    return intoHole(root, cells, from + 1) ?? s;
  }
  if (key === '=') {
    // "=" is the scaffold's: the blank after its next "=".
    const eq = cells.findIndex(
      (c, i) => i >= from && c.kind === 'sym' && c.v === '=',
    );
    return (eq >= 0 && intoHole(root, cells, eq + 1)) || s;
  }
  if (hole !== null) {
    return null; // a sign inside a blank (10 − 3)
  }
  // A locked spot: what he types goes in the next blank.
  const moved = intoHole(root, cells, from);
  return moved ? applyPlain(moved, key) : s;
}

/** A scaffold line ready to fill: the cursor in its first blank. */
export function scaffoldEditor(root: Node[]): EditorState {
  return (
    intoHole(root, stream(root, { path: [], at: 0 }).cells, 0) ?? {
      root,
      cursor: { path: [], at: root.length },
    }
  );
}

/** The same nodes with every blank emptied. */
export function emptyHoles(nodes: readonly Node[]): Node[] {
  return nodes.map(n => {
    if (n.k === 'hole') {
      return { k: 'hole', fill: [] };
    }
    let out: Node = n;
    for (const name of slotsOf(n)) {
      out = { ...out, [name]: emptyHoles(slotOf(n, name)) } as Node;
    }
    return out;
  });
}

/** True when every blank of a scaffold line is still empty (he wrote nothing). */
export function holesEmpty(nodes: readonly Node[]): boolean {
  return nodes.every(n =>
    n.k === 'hole'
      ? n.fill.length === 0
      : slotsOf(n).every(name => holesEmpty(slotOf(n, name))),
  );
}

/**
 * Safe-parser syntax; every slot keeps its own parentheses. A C(n, r) is
 * C((n),(r)) (the engine's counting notation); a blank is written like a
 * group, so the string does not keep the scaffold (the nodes do).
 */
export function serialize(nodes: readonly Node[]): string {
  return nodes
    .map(n => {
      switch (n.k) {
        case 'sym':
          return n.v;
        case 'frac':
          return `((${serialize(n.num)})/(${serialize(n.den)}))`;
        case 'pow':
          return `^(${serialize(n.exp)})`;
        case 'group':
          return `(${serialize(n.body)})`;
        case 'choose':
          return `C((${serialize(n.n)}),(${serialize(n.r)}))`;
        case 'hole':
          return `(${serialize(n.fill)})`;
      }
    })
    .join('');
}

/**
 * The line as the engine reads a written line (`10*9*8/(3*2*1)=120`,
 * `C(10,3)`, `5!`): the same value as `serialize`, with parentheses only where
 * the reading needs them. A denominator of more than one atom is always in
 * parentheses, and a fraction next to a factor (× after it, a number or a
 * group touching it) is grouped whole, so no "/" is ever followed by a bare
 * product (`(990/3)*2*1`, never `990/3*2*1`: nothing to read back). What is
 * sent when he submits a line.
 */
export function toLine(nodes: readonly Node[]): string {
  return nodes
    .map((n, i) => {
      switch (n.k) {
        case 'sym':
          return n.v;
        case 'frac': {
          const num = toLine(n.num);
          const den = toLine(n.den);
          const top = n.num.some(m => isSym(m, '+', '-')) ? `(${num})` : num;
          const bottom = oneAtom(n.den) ? den : `(${den})`;
          const alone =
            (i === 0 || isSym(nodes[i - 1], '+', '-', '=')) &&
            (i === nodes.length - 1 || isSym(nodes[i + 1], '+', '-', '='));
          return alone ? `${top}/${bottom}` : `(${top}/${bottom})`;
        }
        case 'pow':
          return `^(${toLine(n.exp)})`;
        case 'group':
          return `(${toLine(n.body)})`;
        case 'choose':
          return `C(${toLine(n.n)},${toLine(n.r)})`;
        case 'hole':
          return oneAtom(n.fill) ? toLine(n.fill) : `(${toLine(n.fill)})`;
      }
    })
    .join('');
}

/** One number, letter, group, C(n, r) or blank (with its powers): needs no parentheses. */
function oneAtom(nodes: readonly Node[]): boolean {
  const as = atoms(nodes);
  return (
    as.length === 1 && nodes[0]?.k !== 'frac' && !isSym(nodes[0], ...SIGNS)
  );
}

/** Symbols typed so far (the key trace logged with an answer is separate). */
export const isEmpty = (s: EditorState) => s.root.length === 0;

/**
 * Inverse of `serialize` for lines the editor wrote (the reducer gets only
 * the string); null for anything else (then the parser alone decides).
 */
export function deserialize(raw: string): Node[] | null {
  let i = 0;
  const symbols = SYMBOLS as readonly string[];
  const expect = (c: string) => {
    if (raw[i] !== c) {
      throw new Error(c);
    }
    i += 1;
  };
  const slot = (): Node[] => {
    expect('(');
    const nodes = seq();
    expect(')');
    return nodes;
  };
  const seq = (): Node[] => {
    const nodes: Node[] = [];
    for (;;) {
      const c = raw[i];
      if (c === undefined || c === ')' || c === '/') {
        return nodes;
      }
      if (symbols.includes(c)) {
        nodes.push({ k: 'sym', v: c });
        i += 1;
      } else if (c === '^') {
        i += 1;
        nodes.push({ k: 'pow', exp: slot() });
      } else if (c === 'C') {
        // "C((n),(r))"
        i += 1;
        expect('(');
        const n = slot();
        expect(',');
        const r = slot();
        expect(')');
        nodes.push({ k: 'choose', n, r });
      } else if (c === '(') {
        nodes.push(fracOrGroup());
      } else {
        throw new Error(c);
      }
    }
  };
  // "((a)/(b))" is a fraction; anything else starting with "(" is a group
  // (a group body never holds a top-level "/").
  const fracOrGroup = (): Node => {
    const start = i;
    try {
      expect('(');
      const num = slot();
      expect('/');
      const den = slot();
      expect(')');
      return { k: 'frac', num, den };
    } catch {
      i = start;
      return { k: 'group', body: slot() };
    }
  };
  try {
    const nodes = seq();
    return i === raw.length ? nodes : null;
  } catch {
    return null;
  }
}

export type LineIssueKind =
  | 'empty_slot'
  | 'double_operator'
  | 'operator_at_start'
  | 'operator_at_end'
  | 'power_without_base';

/** A written line (`diagnoseLine`) can also fail on the worksheet's own keys. */
export type WrittenIssueKind =
  | LineIssueKind
  /** A "!" after nothing a factorial can apply to (a number, n, k, a group). */
  | 'factorial_without_base'
  /** A comma not between two digits, or a second comma in one number. */
  | 'misplaced_comma'
  /** An "=" inside a fraction, a group or a blank (only the line has sides). */
  | 'misplaced_equals';

/** Why a line cannot be read, and where: a slot, or one node of it. */
export interface LineIssue<K extends WrittenIssueKind = LineIssueKind> {
  kind: K;
  path: PathStep[];
  index?: number;
}

const OPERATORS = ['+', '-', '*'];
/** Operators and the "=" between sides: a sign is never wrapped alone. */
const SIGNS = [...OPERATORS, '='];

/** A "," must sit inside one number: a digit on each side, once per number. */
function badComma(nodes: readonly Node[], i: number): boolean {
  if (!isDigit(nodes[i - 1]) || !isDigit(nodes[i + 1])) {
    return true;
  }
  for (let j = i - 1; j >= 0 && !isSym(nodes[j], ...SIGNS); j -= 1) {
    if (isSym(nodes[j], ',')) {
      return true;
    }
    if (!isDigit(nodes[j])) {
      return false;
    }
  }
  return false;
}

/**
 * The first unreadable spot in reading order. Stricter than the parser on
 * purpose: "2×−x" or "x++1" need parentheses on paper too. Parentheses are
 * always paired by the editor, so a missing one cannot happen. Each side of
 * an "=" is read like a line of its own (a − may start it).
 */
export function diagnose(
  nodes: readonly Node[],
  path: PathStep[] = [],
): LineIssue | null {
  // Without the written-line rules only the analysis kinds come out.
  return check(nodes, path, false) as LineIssue | null;
}

/** `diagnose` for a written line: also the comma, "!" and "=" rules. */
export function diagnoseLine(
  nodes: readonly Node[],
): LineIssue<WrittenIssueKind> | null {
  return check(nodes, [], true);
}

function check(
  nodes: readonly Node[],
  path: PathStep[],
  written: boolean,
): LineIssue<WrittenIssueKind> | null {
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]!;
    const prev = nodes[i - 1];
    const op = isSym(n, ...OPERATORS);
    const eq = isSym(n, '=');
    const sideStart = i === 0 || isSym(prev, '=');
    if (written && eq && path.length > 0) {
      return { kind: 'misplaced_equals', path, index: i };
    }
    if ((op && sideStart && !isSym(n, '-')) || (eq && i === 0)) {
      return { kind: 'operator_at_start', path, index: i };
    }
    if ((op && isSym(prev, ...OPERATORS)) || (eq && isSym(prev, ...SIGNS))) {
      return { kind: 'double_operator', path, index: i };
    }
    if (n.k === 'pow' && (sideStart || isSym(prev, ...OPERATORS))) {
      return { kind: 'power_without_base', path, index: i };
    }
    if (
      written &&
      isSym(n, '!') &&
      !(
        isDigit(prev) ||
        isSym(prev, 'n', 'k') ||
        prev?.k === 'group' ||
        prev?.k === 'hole'
      )
    ) {
      return { kind: 'factorial_without_base', path, index: i };
    }
    if (written && isSym(n, ',') && badComma(nodes, i)) {
      return { kind: 'misplaced_comma', path, index: i };
    }
    for (const name of slotsOf(n)) {
      const inner = slotOf(n, name);
      const at = [...path, { i, slot: name }];
      const issue =
        inner.length === 0
          ? { kind: 'empty_slot' as const, path: at }
          : check(inner, at, written);
      if (issue) {
        return issue;
      }
    }
    if (
      ((op || eq) && i === nodes.length - 1) ||
      (op && isSym(nodes[i + 1], '='))
    ) {
      return { kind: 'operator_at_end', path, index: i };
    }
  }
  return null;
}

export interface FromOptions {
  /**
   * A written line (the worksheet, his own earlier lines): sides joined by
   * "=", the counting notation C(n,k) / C(n;k) and n!, the decimal comma.
   * Off (default): the reading of the analysis lines, unchanged.
   */
  line?: boolean;
}

/**
 * A parsed expression as editor nodes (copy the previous line or the start
 * expression into the editor). Parentheses only where the reading needs
 * them, as in the rendered formula; null for what the keys cannot write
 * (decimals, functions, π; decimals are fine in a written line).
 */
export function fromExpression(
  src: string,
  variables: readonly string[],
  opts: FromOptions = {},
): Node[] | null {
  if (opts.line) {
    return fromLine(src, variables);
  }
  const r = parseExpression(src, { variables: [...variables] });
  return r.ok ? fromAst(r.ast, PLAIN) : null;
}

interface AstCtx {
  /** Placeholder name -> the nodes it stands for (a C(n, r), a factorial). */
  parts: ReadonlyMap<string, Node[]>;
  /** The decimal comma can be written. */
  comma: boolean;
}

const PLAIN: AstCtx = { parts: new Map(), comma: false };

/** Names the parser reads as variables while a C( ) or a "!" is held aside. */
const HELD = ['Q', 'U', 'V', 'W', 'Y', 'Z', 'B', 'D', 'F', 'G', 'H', 'J'];

/** Index of the ")" that closes the "(" at `open`, or -1. */
function closing(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    depth += s[i] === '(' ? 1 : s[i] === ')' ? -1 : 0;
    if (depth === 0) {
      return i;
    }
  }
  return -1;
}

/** "a=b=c": each side read on its own, joined by "=" symbols. */
function fromLine(src: string, variables: readonly string[]): Node[] | null {
  const parts = new Map<string, Node[]>();
  const out: Node[] = [];
  for (const [j, side] of src.split('=').entries()) {
    const nodes = fromSide(side, variables, parts);
    if (!nodes) {
      return null;
    }
    out.push(...(j > 0 ? [{ k: 'sym' as const, v: '=' }] : []), ...nodes);
  }
  return out;
}

/**
 * One side: C( ) and "!" are read first and held aside under a placeholder
 * name (the parser has no grammar for them), then the parser reads the rest.
 */
function fromSide(
  side: string,
  variables: readonly string[],
  parts: Map<string, Node[]>,
): Node[] | null {
  const hold = (nodes: Node[]): string | null => {
    const name = HELD[parts.size];
    if (name !== undefined) {
      parts.set(name, nodes);
    }
    return name ?? null;
  };
  const read = (text: string): Node[] | null => {
    const r = parseExpression(text, {
      variables: [...variables, ...parts.keys()],
    });
    return r.ok ? fromAst(r.ast, { parts, comma: true }) : null;
  };
  let text = '';
  let i = 0;
  while (i < side.length) {
    const c = side[i]!;
    if (c === 'C' && side[i + 1] === '(') {
      const close = closing(side, i + 1);
      const body = close < 0 ? '' : side.slice(i + 2, close);
      const args = body.split(body.includes(';') ? ';' : ',');
      const n = args.length === 2 ? fromSide(args[0]!, variables, parts) : null;
      const r = n && fromSide(args[1]!, variables, parts);
      const name = r && hold([{ k: 'choose', n: n!, r }]);
      if (!name) {
        return null;
      }
      text += name;
      i = close + 1;
    } else if (c === '!') {
      // The factorial of what was just written: a number, a letter or a group.
      const m = /(?:[0-9]+|[nk]|\))\s*$/.exec(text);
      if (!m) {
        return null;
      }
      let start = m.index;
      let base: Node[] | null;
      if (m[0].trim() === ')') {
        start = text.lastIndexOf('(', start);
        while (start >= 0 && closing(text, start) !== m.index) {
          start = text.lastIndexOf('(', start - 1);
        }
        const inner = start < 0 ? null : read(text.slice(start + 1, m.index));
        base = inner && [{ k: 'group', body: inner }];
      } else {
        base = [...m[0].trim()].map(v => ({ k: 'sym' as const, v }));
      }
      const name = base && hold([...base, { k: 'sym', v: '!' }]);
      if (!name) {
        return null;
      }
      text = text.slice(0, start) + name;
      i += 1;
    } else {
      text += c;
      i += 1;
    }
  }
  return read(text);
}

function fromAst(n: Expr, ctx: AstCtx): Node[] | null {
  const group = (inner: Node[] | null): Node[] | null =>
    inner && [{ k: 'group', body: inner }];
  const wrapIf = (c: Expr, wrap: boolean) =>
    wrap ? group(fromAst(c, ctx)) : fromAst(c, ctx);
  const symbols = SYMBOLS as readonly string[];
  switch (n.type) {
    case 'num':
      return /^[0-9]+$/.test(n.text) ||
        (ctx.comma && /^[0-9]+\.[0-9]+$/.test(n.text))
        ? [...n.text.replace('.', ',')].map(v => ({ k: 'sym' as const, v }))
        : null;
    case 'const':
      return n.name === 'e' ? [{ k: 'sym', v: 'e' }] : null;
    case 'var':
      return (
        ctx.parts.get(n.name) ??
        (symbols.includes(n.name) ? [{ k: 'sym', v: n.name }] : null)
      );
    case 'call':
      return null;
    case 'unary': {
      const arg = wrapIf(
        n.arg,
        precedence(n.arg) === 1 || n.arg.type === 'unary',
      );
      return arg && [{ k: 'sym', v: n.op }, ...arg];
    }
    case 'binary': {
      const { op, left, right } = n;
      if (op === '/') {
        const num = fromAst(left, ctx);
        const den = fromAst(right, ctx);
        return num && den && [{ k: 'frac', num, den }];
      }
      if (op === '^') {
        const base = wrapIf(left, precedence(left) < 5);
        const exp = fromAst(right, ctx);
        return base && exp && [...base, { k: 'pow', exp }];
      }
      const isFrac = (c: Expr) => c.type === 'binary' && c.op === '/';
      const l =
        op === '*'
          ? wrapIf(left, !isFrac(left) && precedence(left) === 1)
          : fromAst(left, ctx);
      const r =
        op === '*'
          ? wrapIf(
              right,
              // A sum or a signed factor on the right of × needs parentheses.
              precedence(right) === 1 || right.type === 'unary',
            )
          : wrapIf(
              right,
              right.type === 'unary' || (op === '-' && precedence(right) === 1),
            );
      if (!l || !r) {
        return null;
      }
      return n.implicit ? [...l, ...r] : [...l, { k: 'sym', v: op }, ...r];
    }
  }
}
