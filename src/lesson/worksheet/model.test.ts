import { serialize, type Key, type Node } from '../lines/editor';
import {
  emptyPage,
  finish,
  fixLine,
  markLine,
  newDraft,
  press,
  reopen,
  stepRuns,
  writeLine,
  type Draft,
  type SheetStep,
} from './model';

const TOTAL: SheetStep = { id: 'total', label: { fr: 'cas possibles' } };
const FAV: SheetStep = { id: 'fav', label: { fr: 'cas favorables' } };
const typed = (keys: Key[], d: Draft = newDraft()) => keys.reduce(press, d);
const nodesOf = (keys: Key[]) => typed(keys).editor.root;

describe('worksheet page', () => {
  it('lines are written under their step, sent in the engine syntax', () => {
    let page = emptyPage();
    page = writeLine(
      page,
      TOTAL,
      nodesOf(['1', '0', '*', '9', '=', '9', '0']),
    ).page;
    page = writeLine(
      page,
      TOTAL,
      nodesOf(['9', '0', 'div', '2', '=', '4', '5']),
    ).page;
    page = writeLine(page, FAV, nodesOf(['4', '*', '6'])).page;
    expect(page.lines.map(l => [l.id, l.raw, l.mark])).toEqual([
      ['w1', '10*9=90', 'pending'],
      ['w2', '90/2=45', 'pending'],
      ['w3', '4*6', 'pending'],
    ]);
    expect(stepRuns(page.lines).map(r => [r.step.id, r.lines.length])).toEqual([
      ['total', 2],
      ['fav', 1],
    ]);
  });
  it('a fixed line keeps its place and step; its earlier version stays in its history', () => {
    let page = writeLine(
      emptyPage(),
      TOTAL,
      nodesOf(['7', '2', '0', 'div', '6']),
    ).page;
    page = markLine(page, 'w1', 'wrong');
    const fixed = fixLine(
      page,
      'w1',
      nodesOf(['7', '2', '0', 'div', '6', '=', '1', '2', '0']),
    )!;
    expect(fixed.line).toMatchObject({
      id: 'w1',
      step: TOTAL,
      raw: '720/6=120',
      mark: 'pending',
    });
    expect(fixed.line.history).toEqual([
      expect.objectContaining({ raw: '720/6', mark: 'wrong' }),
    ]);
    expect(fixed.page.lines).toHaveLength(1);
    expect(fixLine(page, 'w9', [])).toBeNull();
  });
});

describe('worksheet draft', () => {
  it('✓ sends a readable line with its keys; an unreadable one gets its issue', () => {
    const bad = finish(typed(['5', '+']));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.draft.issue?.kind).toBe('operator_at_end');
      // The next key clears it.
      expect(press(bad.draft, '1').issue).toBeNull();
    }
    expect(finish(newDraft()).ok).toBe(false);
    const good = finish(typed(['8', '*', '3', '=', '2', '4']));
    expect(good).toMatchObject({
      ok: true,
      raw: '8*3=24',
      fixes: null,
      keys: ['8', '*', '3', '=', '2', '4'],
    });
  });
  it('a tile and a tap are logged by name', () => {
    const tile: Key = { insert: [{ k: 'sym', v: '9' }] };
    const d = typed([tile, { focus: [] }]);
    expect(d.keys).toEqual(['tile:9', 'tap']);
  });
  it('reopening a line: its nodes in the editor, the cursor at its end, the fix sent with its id', () => {
    const page = writeLine(emptyPage(), TOTAL, nodesOf(['7', '2', '0'])).page;
    let d = reopen(page.lines[0]!);
    expect(d.fixing).toBe('w1');
    expect(d.editor.cursor).toEqual({ path: [], at: 3 });
    d = typed(['div', '6'], d);
    expect(finish(d)).toMatchObject({ ok: true, raw: '720/6', fixes: 'w1' });
  });
  it('a scaffold draft starts in its first blank, untouched', () => {
    const template: Node[] = [
      { k: 'hole', fill: [] },
      { k: 'sym', v: '=', lock: true },
      { k: 'hole', fill: [] },
    ];
    const d = newDraft(template);
    expect(d.touched).toBe(false);
    expect(d.editor.cursor.path).toEqual([{ i: 0, slot: 'fill' }]);
    expect(serialize(typed(['3', '=', '3'], d).editor.root)).toBe('(3)=(3)');
  });
});
