import { theme } from '../../theme';
import { ProbabilityTreePropsSchema } from './schemas';
import {
  parseTreeLabel,
  textWidth,
  treeLayout,
  valueParts,
  type Box,
  type LaidEdge,
  type TreeLayout,
} from './treeLayout';

const T = theme.tree;
const NOT_A = '\\overline{A}';
const NOT_F = '\\overline{F}';

/** A or not A, then F or not F; `over` changes a branch by its id. */
const two = (over: Record<string, object> = {}, top: object = {}) =>
  ProbabilityTreePropsSchema.parse({
    ...top,
    branches: [
      ['a', 'A'],
      ['na', NOT_A],
    ].map(([id, latex]) => ({
      id,
      latex,
      ...over[id!],
      children: [
        { id: `${id}.f`, latex: 'F', ...over[`${id}.f`] },
        { id: `${id}.nf`, latex: NOT_F, ...over[`${id}.nf`] },
      ],
    })),
  });
const blank = { show: 'blank' };
const hidden = { show: 'hidden' };
const printed = (top: object = {}) =>
  two(
    { a: { p: '2/3' }, 'a.f': { p: '1/4' }, 'a.nf': blank, na: blank, 'na.f': blank, 'na.nf': blank },
    top,
  );
const full = (top: object = {}) =>
  two(
    {
      a: { p: '2/3' },
      'a.f': { p: '1/4' },
      'a.nf': { p: '3/4', show: 'found' },
      na: { p: '1/3' },
      'na.f': hidden,
      'na.nf': hidden,
    },
    top,
  );
const counts = (top: object = {}) =>
  two(
    {
      a: { count: 15 },
      'a.f': { count: 6 },
      'a.nf': { count: 9, countShow: 'hidden' },
      na: { count: 10 },
      'na.f': { count: 5 },
      'na.nf': { count: 5, show: 'found' },
    },
    { rootCount: 25, ...top },
  );
/** The largest tree: 4 branches of 4, long values, a label with a wide letter. */
const sixteen = (top: object = {}) =>
  ProbabilityTreePropsSchema.parse({
    ...top,
    branches: ['a', 'b', 'c', 'd'].map(x => ({
      id: x,
      latex: x === 'd' ? '\\overline{M}' : x.toUpperCase(),
      p: '25/100',
      children: ['e', 'f', 'g', 'h'].map((y, j) => ({
        id: `${x}.${y}`,
        latex: j % 2 ? `\\overline{${y.toUpperCase()}}` : y.toUpperCase(),
        p: j === 0 ? '7/10' : '1/10',
        ...(j === 2 && { show: 'found' }),
        ...(j === 3 && { show: 'hidden' }),
      })),
    })),
  });

const edgeOf = (l: TreeLayout, id: string): LaidEdge => l.edges.find(e => e.id === id)!;
/** Everything written: labels, values, counts (their estimated boxes). */
const boxes = (l: TreeLayout): Box[] => [
  ...(l.root.count ? [l.root.count.box] : []),
  ...l.edges.flatMap(e => [
    e.label.box,
    ...(e.value ? [e.value.box] : []),
    ...(e.count ? [e.count.box] : []),
  ]),
];
const inside = (l: TreeLayout, b: Box) =>
  b.x >= 0 && b.y >= 0 && b.x + b.w <= l.width && b.y + b.h <= l.height;
const apart = (a: Box, b: Box) =>
  a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const everythingInside = (l: TreeLayout) => {
  for (const b of boxes(l)) {
    expect(inside(l, b)).toBe(true);
  }
  for (const e of l.edges) {
    for (const p of [
      ...e.segments.flatMap(s => [
        { x: s.x1, y: s.y1 },
        { x: s.x2, y: s.y2 },
      ]),
      ...(e.head ?? []),
      ...(e.value && e.value.kind !== 'unknown' ? e.value.tick ?? [] : []),
    ]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(l.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(l.height);
    }
  }
  expect(inside(l, { x: l.root.x - T.rootDot, y: l.root.y - T.rootDot, w: 2 * T.rootDot, h: 2 * T.rootDot })).toBe(true);
};
const nothingOverlaps = (l: TreeLayout) => {
  const all = boxes(l);
  all.forEach((a, i) =>
    all.slice(i + 1).forEach(b => {
      expect(apart(a, b)).toBe(true);
    }),
  );
};

describe('parseTreeLabel: a letter or a short word, alone or under a bar', () => {
  it('a letter, a short word', () => {
    expect(parseTreeLabel('A')).toEqual({ text: 'A', overline: false, italic: true });
    expect(parseTreeLabel(' F ')).toEqual({ text: 'F', overline: false, italic: true });
    expect(parseTreeLabel('Fumeur')).toEqual({ text: 'Fumeur', overline: false, italic: true });
    expect(parseTreeLabel('S1')).toEqual({ text: 'S1', overline: false, italic: true });
  });

  it('\\overline{...} and \\bar{...} give the text and a bar', () => {
    expect(parseTreeLabel('\\overline{A}')).toEqual({ text: 'A', overline: true, italic: true });
    expect(parseTreeLabel('\\bar{F}')).toEqual({ text: 'F', overline: true, italic: true });
    expect(parseTreeLabel('\\bar F')).toEqual({ text: 'F', overline: true, italic: true });
    expect(parseTreeLabel('\\overline{ Fumeur }')).toEqual({
      text: 'Fumeur',
      overline: true,
      italic: true,
    });
  });

  it('anything else is drawn as written, with no bar', () => {
    for (const raw of [
      'A \\cap F',
      '\\overline{A \\cap F}',
      '\\overline{}',
      '\\overline{\\overline{A}}',
      '\\frac{1}{2}',
      'Probabilite',
      '12',
      '\\underline{A}',
    ]) {
      expect(parseTreeLabel(raw)).toEqual({ text: raw, overline: false, italic: false });
    }
  });
});

describe('valueParts: a rational as it is written', () => {
  it('a/b is stacked; an integer and a decimal are plain, with a French comma', () => {
    expect(valueParts('2/3')).toEqual({ kind: 'frac', num: '2', den: '3' });
    expect(valueParts('25/100')).toEqual({ kind: 'frac', num: '25', den: '100' });
    expect(valueParts('3/1')).toEqual({ kind: 'plain', text: '3' });
    expect(valueParts('1')).toEqual({ kind: 'plain', text: '1' });
    expect(valueParts('0.25')).toEqual({ kind: 'plain', text: '0,25' });
    expect(valueParts('0,3')).toEqual({ kind: 'plain', text: '0,3' });
  });

  it('text widths grow with the text and the size (estimates, on the generous side)', () => {
    expect(textWidth('10', 14)).toBeGreaterThan(textWidth('1', 14));
    expect(textWidth('M', 14)).toBeGreaterThan(textWidth('I', 14));
    expect(textWidth('A', 17)).toBeGreaterThan(textWidth('A', 14));
    expect(textWidth('3', 14, true)).toBeGreaterThan(textWidth('3', 14));
  });
});

describe('treeLayout: everything inside the box, nothing on top of something else', () => {
  const cases: [string, () => ReturnType<typeof printed>][] = [
    ['as printed', printed],
    ['as printed, compact', () => printed({ compact: true })],
    ['values, a found one, hidden ones, marks', () => full({ mark: ['a', 'a.nf'], ask: 'na.f' })],
    ['the same, compact', () => full({ compact: true, mark: ['a', 'a.nf'], ask: 'na.f' })],
    ['counts', counts],
    ['counts, compact', () => counts({ compact: true })],
    ['4 x 4', () => sixteen({ mark: ['d', 'd.h'] })],
    ['4 x 4, compact', () => sixteen({ compact: true, mark: ['d', 'd.h'] })],
  ];

  it.each(cases)('%s: at 320 pt and 390 pt (and the 297 pt of a panel on a 320 pt screen)', (_, make) => {
    for (const width of [297, 320, 390]) {
      const l = treeLayout(make(), width);
      expect(l.width).toBe(width);
      everythingInside(l);
      nothingOverlaps(l);
    }
  });

  it.each(cases)('%s: interactive (44 pt rows and ends) still fits 320 pt', (_, make) => {
    const l = treeLayout(make(), 320, {
      minRow: theme.size.touch,
      leafSlot: theme.size.touch,
      alsoMarked: ['a', 'a.f'],
    });
    everythingInside(l);
    nothingOverlaps(l);
    const rows = l.edges.filter(e => e.leaf).map(e => e.row);
    for (const r of rows) {
      expect(r.w).toBeGreaterThanOrEqual(theme.size.touch);
      expect(r.h).toBeGreaterThanOrEqual(theme.size.touch);
      expect(inside(l, r)).toBe(true);
    }
    rows.forEach((a, i) => rows.slice(i + 1).forEach(b => expect(apart(a, b)).toBe(true)));
  });

  it('the rows are even and never overlap; a node sits at the middle of its branches', () => {
    for (const make of [printed, () => printed({ compact: true }), sixteen]) {
      const l = treeLayout(make(), 320);
      const ys = l.edges.filter(e => e.leaf).map(e => e.row.y + e.row.h / 2);
      ys.slice(1).forEach((y, i) => expect(y - ys[i]!).toBeCloseTo(l.rowHeight, 6));
      expect(l.height).toBeCloseTo(ys.length * l.rowHeight + 2 * T.padY, 6);
    }
    const l = treeLayout(printed(), 320);
    const y = (id: string) => edgeOf(l, id).row.y + l.rowHeight / 2;
    expect(y('a')).toBeCloseTo((y('a.f') + y('a.nf')) / 2, 6);
    expect(l.root.y).toBeCloseTo((y('a') + y('na')) / 2, 6);
  });

  it('sizes: about 220-240 pt for 4 leaves, about 150-170 pt compact, with smaller type', () => {
    const big = treeLayout(printed(), 320);
    const small = treeLayout(printed({ compact: true }), 320);
    expect(big.height).toBeGreaterThanOrEqual(220);
    expect(big.height).toBeLessThanOrEqual(240);
    expect(small.height).toBeGreaterThanOrEqual(150);
    expect(small.height).toBeLessThanOrEqual(170);
    expect(small.height).toBeLessThan(big.height);
    expect(edgeOf(small, 'a').label.size).toBeLessThan(edgeOf(big, 'a').label.size);
    // fraction digits stay legible
    expect(edgeOf(small, 'a').value!.size).toBeGreaterThanOrEqual(11);
    expect(edgeOf(small, 'a').value!.size).toBeLessThan(edgeOf(big, 'a').value!.size);
  });

  it('more leaves: the rows tighten down to a floor, so the tree grows instead of squeezing', () => {
    expect(treeLayout(sixteen(), 320).rowHeight).toBe(T.rowMin);
    expect(treeLayout(sixteen({ compact: true }), 320).rowHeight).toBe(T.compactRowMin);
    const twoLeaves = ProbabilityTreePropsSchema.parse({
      branches: [
        { id: 'a', latex: 'A', p: '1/2' },
        { id: 'na', latex: NOT_A, p: '1/2' },
      ],
    });
    expect(treeLayout(twoLeaves, 320).rowHeight).toBe(T.rowMax);
  });

  it('always left to right: the root, then the first labels, then the second ones', () => {
    for (const width of [320, 390]) {
      const l = treeLayout(full(), width);
      const a = edgeOf(l, 'a');
      const af = edgeOf(l, 'a.f');
      expect(l.root.x).toBeLessThan(a.label.x);
      expect(a.label.x).toBeLessThan(af.segments[0]!.x1);
      expect(af.segments[0]!.x1).toBeLessThan(af.label.x);
      // the two levels get the same branch length
      const length = (e: LaidEdge) => e.label.x - T.gap - e.segments[0]!.x1;
      expect(length(a)).toBeCloseTo(length(af), 6);
    }
  });

  it('pure: the same props and width give the same layout; a wider box only stretches the branches', () => {
    expect(treeLayout(full(), 320)).toEqual(treeLayout(full(), 320));
    const narrow = treeLayout(full(), 320);
    const wide = treeLayout(full(), 390);
    expect(wide.height).toBe(narrow.height);
    expect(edgeOf(wide, 'a.f').label.x - edgeOf(narrow, 'a.f').label.x).toBeCloseTo(70, 6);
    expect(edgeOf(wide, 'a.f').label.y).toBe(edgeOf(narrow, 'a.f').label.y);
  });
});

describe('treeLayout: what is on a branch', () => {
  it('a given value cuts its branch in two; a blank branch is one line with nothing on it', () => {
    const l = treeLayout(printed(), 320);
    const a = edgeOf(l, 'a');
    expect(a.value).toMatchObject({ kind: 'frac', num: '2', den: '3', found: false, tick: null });
    expect(a.segments).toHaveLength(2);
    // the line stops before the value and starts again after it
    expect(a.segments[0]!.x2).toBeLessThan(a.value!.box.x);
    expect(a.segments[1]!.x1).toBeGreaterThan(a.value!.box.x + a.value!.box.w);
    const na = edgeOf(l, 'na');
    expect(na.value).toBeNull();
    expect(na.segments).toHaveLength(1);
    expect(na.head).toBeNull();
  });

  it('a stacked fraction: the numerator above the bar, the denominator under it, centred', () => {
    const v = edgeOf(treeLayout(printed(), 320), 'a').value!;
    if (v.kind !== 'frac') {
      throw new Error('not a fraction');
    }
    expect(v.numY).toBeLessThan(v.bar.y1);
    expect(v.denY).toBeGreaterThan(v.bar.y1);
    expect((v.bar.x1 + v.bar.x2) / 2).toBeCloseTo(v.x, 6);
  });

  it('found: bold with a tick beside it; hidden: a "?" box; ask: that box is the emphasised one', () => {
    const l = treeLayout(full({ ask: 'na.f' }), 320);
    const found = edgeOf(l, 'a.nf').value!;
    expect(found).toMatchObject({ kind: 'frac', found: true });
    expect(found.kind !== 'unknown' && found.tick).toHaveLength(3);
    expect(edgeOf(l, 'na.f').value).toMatchObject({ kind: 'unknown', ask: true });
    expect(edgeOf(l, 'na.nf').value).toMatchObject({ kind: 'unknown', ask: false });
    // ask on a branch whose value is written emphasises nothing
    const given = treeLayout(full({ ask: 'a' }), 320);
    expect(given.edges.some(e => e.value?.kind === 'unknown' && e.value.ask)).toBe(false);
  });

  it('marked branches carry an arrowhead at their end, and their line stops at its base', () => {
    const l = treeLayout(full({ mark: ['a', 'a.f'] }), 320);
    for (const id of ['a', 'a.f']) {
      const e = edgeOf(l, id);
      expect(e.marked).toBe(true);
      expect(e.head).toHaveLength(3);
      const tip = e.head![0]!;
      expect(tip.x).toBeCloseTo(e.label.x - T.gap, 6);
      const last = e.segments[e.segments.length - 1]!;
      expect(Math.hypot(tip.x - last.x2, tip.y - last.y2)).toBeCloseTo(T.headLength, 6);
    }
    expect(l.edges.filter(e => e.marked).map(e => e.id)).toEqual(['a', 'a.f']);
    expect(edgeOf(l, 'na').head).toBeNull();
    // the path the student selected is marked the same way
    const sel = treeLayout(full(), 320, { alsoMarked: ['na', 'na.nf'] });
    expect(sel.edges.filter(e => e.head).map(e => e.id)).toEqual(['na', 'na.nf']);
  });

  it('labels: the text, and a bar above an overlined one', () => {
    const l = treeLayout(printed(), 320);
    expect(edgeOf(l, 'a').label).toMatchObject({ text: 'A', overline: null });
    const bar = edgeOf(l, 'na').label;
    expect(bar.text).toBe('A');
    expect(bar.overline!.y1).toBeLessThan(bar.y);
    expect(bar.overline!.x2).toBeGreaterThan(bar.overline!.x1);
  });

  it('tight rows: the values of one node sit by turns far and near, never one above the other', () => {
    const centre = (l: TreeLayout, id: string) => {
      const b = edgeOf(l, id).value!.box;
      return b.x + b.w / 2;
    };
    const roomy = treeLayout(full(), 320);
    expect(centre(roomy, 'a.f')).toBeCloseTo(centre(roomy, 'a.nf'), 6);
    expect(centre(roomy, 'a.f')).toBeCloseTo(centre(roomy, 'na.f'), 6);
    const tight = treeLayout(full({ compact: true }), 320);
    expect(edgeOf(tight, 'a.f').value!.box.x).toBeGreaterThan(
      edgeOf(tight, 'a.nf').value!.box.x + edgeOf(tight, 'a.nf').value!.box.w,
    );
    // it depends on the rows only: a value does not move when another one appears
    const alone = treeLayout(printed({ compact: true }), 320);
    expect(edgeOf(alone, 'a.f').value!.x).toBeCloseTo(edgeOf(tight, 'a.f').value!.x, 6);
  });

  it('counts mode: a count at the root and beside each label, nothing on the branches', () => {
    const l = treeLayout(counts(), 320);
    expect(l.root.count).toMatchObject({ text: '25' });
    expect(l.root.count!.x).toBeLessThan(l.root.x);
    expect(l.edges.every(e => e.value === null && e.segments.length === 1)).toBe(true);
    expect(edgeOf(l, 'a').count).toMatchObject({ kind: 'plain', text: '15', found: false });
    expect(edgeOf(l, 'a.nf').count).toMatchObject({ kind: 'unknown' });
    expect(edgeOf(l, 'na.nf').count).toMatchObject({ kind: 'plain', text: '5', found: true });
    const a = edgeOf(l, 'a');
    expect(a.count!.box.x).toBeGreaterThan(a.label.x);
    // outside counts mode a count is not drawn
    expect(treeLayout(printed(), 320).edges.every(e => e.count === null)).toBe(true);
    expect(treeLayout(printed(), 320).root.count).toBeNull();
  });

  it('a tree of one level, and a branch with no branch after it, are laid out too', () => {
    const one = ProbabilityTreePropsSchema.parse({
      branches: [
        { id: 'r', latex: 'R', p: '1/2' },
        { id: 'v', latex: 'V', p: '1/3' },
        { id: 'b', latex: 'B', p: '1/6' },
      ],
    });
    const l = treeLayout(one, 320);
    everythingInside(l);
    nothingOverlaps(l);
    expect(l.edges.map(e => [e.level, e.leaf])).toEqual([
      [1, true],
      [1, true],
      [1, true],
    ]);
    // the labels are at the right edge
    expect(edgeOf(l, 'r').label.x + textWidth('R', edgeOf(l, 'r').label.size)).toBeCloseTo(320 - T.padX, 6);

    const mixed = ProbabilityTreePropsSchema.parse({
      branches: [
        {
          id: 'a',
          latex: 'A',
          p: '2/3',
          children: [
            { id: 'a.f', latex: 'F', p: '1/4' },
            { id: 'a.nf', latex: NOT_F, p: '3/4' },
          ],
        },
        { id: 'na', latex: NOT_A, p: '1/3' },
      ],
    });
    const m = treeLayout(mixed, 320, { minRow: 44, leafSlot: 44 });
    everythingInside(m);
    nothingOverlaps(m);
    expect(m.edges.filter(e => e.leaf).map(e => e.id)).toEqual(['a.f', 'a.nf', 'na']);
  });
});
