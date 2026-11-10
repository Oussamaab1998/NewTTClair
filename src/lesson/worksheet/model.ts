/**
 * The worksheet page (no React): his lines one under the other, like a page
 * of his notebook, each labelled with the plan step it belongs to. A line is
 * kept twice: as editor nodes (drawn stacked, a scaffold's blanks included)
 * and in the engine's syntax it was sent in (`10*9*8/(3*2*1)=120`).
 *
 * Tapping an earlier line reopens it in the editor; the fixed version takes
 * its place on the page and the earlier versions stay in its history. Nothing
 * here judges a line: the caller sets the engine's mark (`markLine`).
 *
 * The draft is the line being written: the editor, the line it fixes (if
 * any), the reason it could not be sent, and the keys pressed for it.
 */
import type { Rich } from '../../content/schema';
import {
  apply,
  diagnoseLine,
  emptyEditor,
  isEmpty,
  scaffolded,
  scaffoldEditor,
  serialize,
  toLine,
  type EditorState,
  type Key,
  type LineIssue,
  type Node,
  type WrittenIssueKind,
} from '../lines/editor';

/** A step of his plan: the lines written for it are grouped under its label. */
export interface SheetStep {
  id: string;
  label: Rich;
}

/** The engine's mark on a line (drawn as a shape, never colour alone). */
export type LineMark = 'pending' | 'right' | 'wrong' | 'neutral';

export interface SheetVersion {
  nodes: Node[];
  /** As sent to the engine. */
  raw: string;
  mark: LineMark;
}

export interface SheetLine extends SheetVersion {
  id: string;
  step: SheetStep;
  /** Earlier versions, oldest first (he tapped the line and fixed it). */
  history: SheetVersion[];
}

export interface Page {
  lines: SheetLine[];
  /** Number of the next line id (w1, w2, ...). */
  next: number;
}

export const emptyPage = (): Page => ({ lines: [], next: 1 });

/** A new line at the bottom of the page, waiting for its mark. */
export function writeLine(
  page: Page,
  step: SheetStep,
  nodes: Node[],
): { page: Page; line: SheetLine } {
  const line: SheetLine = {
    id: `w${page.next}`,
    step,
    nodes,
    raw: toLine(nodes),
    mark: 'pending',
    history: [],
  };
  return { page: { lines: [...page.lines, line], next: page.next + 1 }, line };
}

/** An earlier line rewritten: same place and step, the old version kept. */
export function fixLine(
  page: Page,
  id: string,
  nodes: Node[],
): { page: Page; line: SheetLine } | null {
  const old = page.lines.find(l => l.id === id);
  if (!old) {
    return null;
  }
  const line: SheetLine = {
    ...old,
    nodes,
    raw: toLine(nodes),
    mark: 'pending',
    history: [
      ...old.history,
      { nodes: old.nodes, raw: old.raw, mark: old.mark },
    ],
  };
  return {
    page: { ...page, lines: page.lines.map(l => (l.id === id ? line : l)) },
    line,
  };
}

/** The engine's verdict, set by the caller once the line is judged. */
export function markLine(page: Page, id: string, mark: LineMark): Page {
  return {
    ...page,
    lines: page.lines.map(l => (l.id === id ? { ...l, mark } : l)),
  };
}

/** Consecutive lines of one step, in page order: one label per run. */
export function stepRuns(
  lines: readonly SheetLine[],
): { step: SheetStep; lines: SheetLine[] }[] {
  const runs: { step: SheetStep; lines: SheetLine[] }[] = [];
  for (const line of lines) {
    const last = runs[runs.length - 1];
    if (last && last.step.id === line.step.id) {
      last.lines.push(line);
    } else {
      runs.push({ step: line.step, lines: [line] });
    }
  }
  return runs;
}

export interface Draft {
  editor: EditorState;
  /** The earlier line being fixed, or null for a new line. */
  fixing: string | null;
  /** Why the line could not be sent (marked until the next key). */
  issue: LineIssue<WrittenIssueKind> | null;
  /** Keys pressed for this line (logged with it). */
  keys: string[];
  /** He pressed a key since the draft was loaded. */
  touched: boolean;
}

/** A fresh line: empty, or a scaffold with the cursor in its first blank. */
export function newDraft(template: Node[] | null = null): Draft {
  return {
    editor: template ? scaffoldEditor(template) : emptyEditor(),
    fixing: null,
    issue: null,
    keys: [],
    touched: false,
  };
}

/** How a key is logged: its name, "tap", or the tile's value. */
const keyName = (key: Key): string =>
  typeof key === 'string'
    ? key
    : 'focus' in key
    ? 'tap'
    : `tile:${serialize(key.insert)}`;

export function press(d: Draft, key: Key): Draft {
  return {
    ...d,
    editor: apply(d.editor, key),
    issue: null,
    keys: [...d.keys, keyName(key)],
    touched: true,
  };
}

/** Tap an earlier line: it comes back in the editor to be fixed. */
export function reopen(line: SheetLine): Draft {
  const editor = scaffolded(line.nodes)
    ? scaffoldEditor(line.nodes)
    : { root: line.nodes, cursor: { path: [], at: line.nodes.length } };
  return { editor, fixing: line.id, issue: null, keys: [], touched: false };
}

export type Finish =
  | { ok: false; draft: Draft }
  | {
      ok: true;
      /** In the engine's syntax: what the caller sends. */
      raw: string;
      nodes: Node[];
      fixes: string | null;
      keys: string[];
    };

/** The ✓ key: the line, or why it cannot be read (nothing is judged here). */
export function finish(d: Draft): Finish {
  if (isEmpty(d.editor)) {
    return { ok: false, draft: d };
  }
  const issue = diagnoseLine(d.editor.root);
  if (issue) {
    return { ok: false, draft: { ...d, issue } };
  }
  const nodes = d.editor.root;
  return { ok: true, raw: toLine(nodes), nodes, fixes: d.fixing, keys: d.keys };
}
