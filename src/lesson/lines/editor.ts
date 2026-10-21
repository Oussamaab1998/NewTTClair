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
 */

import {
  parseExpression,
  precedence,
  type Node as Expr,
} from '../../engine/expression';

export type Node =
  | { k: 'sym'; v: string }
  | { k: 'frac'; num: Node[]; den: Node[] }
  /** Superscript applied to the node before it. */
  | { k: 'pow'; exp: Node[] }
  | { k: 'group'; body: Node[] };

export type SlotName = 'num' | 'den' | 'exp' | 'body';
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
] as const;
export type Sym = (typeof SYMBOLS)[number];
export type Key =
  | Sym
  | 'frac'
  | 'pow'
  | 'group'
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
  | { focus: PathStep[]; at?: number };

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

const make = (key: 'frac' | 'pow' | 'group'): Node =>
  key === 'frac'
    ? { k: 'frac', num: [], den: [] }
    : key === 'pow'
    ? { k: 'pow', exp: [] }
    : { k: 'group', body: [] };

const isSym = (n: Node | undefined, ...vs: string[]) =>
  n?.k === 'sym' && vs.includes(n.v);

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
  while (start > 0 && !isSym(slot[start - 1], '+', '-')) {
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
 * stays inside (−x is one thing).
 */
function trimSigns(
  slot: readonly Node[],
  from: number,
  to: number,
): [number, number] {
  let f = from;
  let t = to;
  while (f < t && isSym(slot[f], '+', '*')) {
    f += 1;
  }
  while (t > f && isSym(slot[t - 1], '+', '-', '*')) {
    t -= 1;
  }
  return [f, t];
}

/** Atoms of a slot as [start, end): a number, a letter, a sign, a group or
 * a fraction, each with the powers that follow it. */
function atoms(slot: readonly Node[]): [number, number][] {
  const out: [number, number][] = [];
  const digit = (n: Node | undefined) => n?.k === 'sym' && /^[0-9]$/.test(n.v);
  let i = 0;
  while (i < slot.length) {
    const start = i;
    const n = slot[i]!;
    i += 1;
    while (digit(n) && digit(slot[i])) {
      i += 1;
    }
    if (!isSym(n, ...OPERATORS)) {
      while (slot[i]?.k === 'pow') {
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
    if (pick && isSym(slot[pick[0]], ...OPERATORS)) {
      const start = pick[0];
      pick = as.find(([, b]) => b === start) ?? pick;
    }
    return pick
      ? select(root, cursor.path, pick[0], pick[1])
      : enclosing(root, cursor.path) ?? s;
  }
  const slot = getSlot(root, sel.path);
  let start = sel.from;
  while (start > 0 && !isSym(slot[start - 1], '+', '-')) {
    start -= 1;
  }
  let end = sel.to;
  while (end < slot.length && !isSym(slot[end], '+', '-')) {
    end += 1;
  }
  const [from, to] = trimSigns(slot, start, end);
  if (from < sel.from || to > sel.to) {
    return select(root, sel.path, from, to);
  }
  // The whole slot, without a dangling sign at its end.
  const [, whole] = trimSigns(slot, 0, slot.length);
  if (sel.from > 0 || sel.to < whole) {
    return select(root, sel.path, 0, whole);
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

/** ↓: leave an exponent to its base, or go from a numerator to its denominator. */
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
  }
  return s;
}

/** ↑: enter the exponent next to the cursor, or go from a denominator to its numerator. */
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
  if (s.sel) {
    return applyToSelection(s, s.sel, key);
  }
  const { root, cursor } = s;
  const { path, at } = cursor;
  const slot = getSlot(root, path);
  const parent = path.slice(0, -1);
  const last = path[path.length - 1];

  if (last?.slot === 'exp' && leavesExponent(key, at)) {
    const out = { root, cursor: { path: parent, at: last.i + 1 } };
    return key === 'right' ? out : apply(out, key);
  }
  if (typeof key === 'object') {
    const len = getSlot(root, key.focus).length;
    return {
      root,
      cursor: { path: key.focus, at: Math.min(key.at ?? len, len) },
    };
  }
  switch (key) {
    case 'clear':
      return emptyEditor();
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
    case 'group': {
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
        change: key === 'frac' ? 'fraction' : key === 'pow' ? 'power' : 'group',
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
      if (last.slot === 'den') {
        const num = [...parent, { i: last.i, slot: 'num' as const }];
        return { root, cursor: { path: num, at: getSlot(root, num).length } };
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
      if (last.slot === 'num') {
        return {
          root,
          cursor: { path: [...parent, { i: last.i, slot: 'den' }], at: 0 },
        };
      }
      return { root, cursor: { path: parent, at: last.i + 1 } };
    }
    case 'back': {
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
      const kept =
        owner.k === 'frac' ? (last.slot === 'den' ? owner.num : owner.den) : [];
      return {
        root: setSlot(root, parent, sl => [
          ...sl.slice(0, last.i),
          ...kept,
          ...sl.slice(last.i + 1),
        ]),
        // After a returning numerator; before a returning denominator.
        cursor: {
          path: parent,
          at: last.slot === 'den' ? last.i + kept.length : last.i,
        },
        change: removal(owner)!,
      };
    }
    default:
      return {
        root: setSlot(root, path, sl => [
          ...sl.slice(0, at),
          { k: 'sym', v: key },
          ...sl.slice(at),
        ]),
        cursor: { path, at: at + 1 },
      };
  }
}

/** Safe-parser syntax; every slot keeps its own parentheses. */
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
      }
    })
    .join('');
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

/** Why a line cannot be read, and where: a slot, or one node of it. */
export interface LineIssue {
  kind: LineIssueKind;
  path: PathStep[];
  index?: number;
}

const OPERATORS = ['+', '-', '*'];

/**
 * The first unreadable spot in reading order. Stricter than the parser on
 * purpose: "2×−x" or "x++1" need parentheses on paper too. Parentheses are
 * always paired by the editor, so a missing one cannot happen.
 */
export function diagnose(
  nodes: readonly Node[],
  path: PathStep[] = [],
): LineIssue | null {
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]!;
    const prev = nodes[i - 1];
    const op = isSym(n, ...OPERATORS);
    if (op && i === 0 && !isSym(n, '-')) {
      return { kind: 'operator_at_start', path, index: i };
    }
    if (op && isSym(prev, ...OPERATORS)) {
      return { kind: 'double_operator', path, index: i };
    }
    if (n.k === 'pow' && (i === 0 || isSym(prev, ...OPERATORS))) {
      return { kind: 'power_without_base', path, index: i };
    }
    for (const name of slotsOf(n)) {
      const inner = slotOf(n, name);
      const at = [...path, { i, slot: name }];
      const issue =
        inner.length === 0
          ? { kind: 'empty_slot' as const, path: at }
          : diagnose(inner, at);
      if (issue) {
        return issue;
      }
    }
    if (op && i === nodes.length - 1) {
      return { kind: 'operator_at_end', path, index: i };
    }
  }
  return null;
}

/**
 * A parsed expression as editor nodes (copy the previous line or the start
 * expression into the editor). Parentheses only where the reading needs
 * them, as in the rendered formula; null for what the keys cannot write
 * (decimals, functions, π).
 */
export function fromExpression(
  src: string,
  variables: readonly string[],
): Node[] | null {
  const r = parseExpression(src, { variables: [...variables] });
  return r.ok ? fromAst(r.ast) : null;
}

function fromAst(n: Expr): Node[] | null {
  const group = (inner: Node[] | null): Node[] | null =>
    inner && [{ k: 'group', body: inner }];
  const wrapIf = (c: Expr, wrap: boolean) =>
    wrap ? group(fromAst(c)) : fromAst(c);
  const symbols = SYMBOLS as readonly string[];
  switch (n.type) {
    case 'num':
      return /^[0-9]+$/.test(n.text)
        ? [...n.text].map(v => ({ k: 'sym' as const, v }))
        : null;
    case 'const':
      return n.name === 'e' ? [{ k: 'sym', v: 'e' }] : null;
    case 'var':
      return symbols.includes(n.name) ? [{ k: 'sym', v: n.name }] : null;
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
        const num = fromAst(left);
        const den = fromAst(right);
        return num && den && [{ k: 'frac', num, den }];
      }
      if (op === '^') {
        const base = wrapIf(left, precedence(left) < 5);
        const exp = fromAst(right);
        return base && exp && [...base, { k: 'pow', exp }];
      }
      const isFrac = (c: Expr) => c.type === 'binary' && c.op === '/';
      const l =
        op === '*'
          ? wrapIf(left, !isFrac(left) && precedence(left) === 1)
          : fromAst(left);
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
