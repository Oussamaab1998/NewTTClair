import {
  apply,
  deserialize,
  diagnose,
  diagnoseLine,
  emptyEditor,
  fromExpression,
  holesEmpty,
  scaffoldEditor,
  serialize,
  toLine,
  type EditorState,
  type Key,
  type Node,
} from './editor';
import {
  checkEquivalence,
  evaluateExact,
  parseExpression,
} from '../../engine/expression';
import { normalizeCounting } from '../../engine/expression/counting';
import { readback } from '../../method/factorForm';

const run = (keys: Key[], s: EditorState = emptyEditor()) =>
  keys.reduce(apply, s);

describe('editor: structured input', () => {
  it('types symbols in a row', () => {
    const s = run(['2', 'x', '+', '1']);
    expect(serialize(s.root)).toBe('2x+1');
    expect(s.cursor).toEqual({ path: [], at: 4 });
  });
  it('a fraction key opens a numerator slot; → moves to the denominator', () => {
    const s = run([
      'frac',
      'e',
      'pow',
      'x',
      'right',
      'right',
      '1',
      '+',
      'e',
      'pow',
      '2',
      'x',
    ]);
    expect(serialize(s.root)).toBe('((e^(x))/(1+e^(2x)))');
    const p = parseExpression(serialize(s.root));
    expect(p.ok).toBe(true);
  });
  it('the exponent slot keeps e^-2x together (never e^(-2)·x)', () => {
    const s = run(['e', 'pow', '-', '2', 'x']);
    expect(serialize(s.root)).toBe('e^(-2x)');
  });
  it('parentheses are inserted as a pair (always balanced)', () => {
    const s = run(['group', '1', '+', 'x']);
    expect(serialize(s.root)).toBe('(1+x)');
    expect(s.cursor.path).toHaveLength(1);
    const out = apply(s, 'right');
    expect(out.cursor).toEqual({ path: [], at: 1 });
  });
  it('← enters the previous composite at its end; → leaves it', () => {
    let s = run(['frac', '1', 'right', '2', 'right']);
    expect(s.cursor).toEqual({ path: [], at: 1 });
    s = apply(s, 'left');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 1 });
    s = apply(s, 'left');
    s = apply(s, 'left');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'num' }], at: 1 });
  });
  it('backspace deletes symbols, empties slots, then removes an empty composite', () => {
    let s = run(['x', '+', 'frac', '1']);
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('x+(()/())');
    expect(diagnose(s.root)?.kind).toBe('empty_slot');
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('x+');
    expect(s.cursor).toEqual({ path: [], at: 2 });
  });
  it('backspace after a filled group deletes it as one piece (undo brings it back)', () => {
    // Changed for Editor v2 rule 2 (was: backspace stepped into the group).
    const s = apply(run(['group', 'x', 'right']), 'back');
    expect(serialize(s.root)).toBe('');
    expect(s.change).toBe('remove_group');
  });
  it('focus puts the cursor at the end of a tapped slot; clear empties all', () => {
    let s = run(['frac', '1', 'right', '2']);
    s = apply(s, { focus: [{ i: 0, slot: 'num' }] });
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'num' }], at: 1 });
    s = apply(s, 'clear');
    expect(s).toEqual(emptyEditor());
  });
  it('multiplication is explicit (×), the parser reads it', () => {
    const s = run(['e', 'pow', 'x', 'right', '*', 'e', 'pow', '2', 'x']);
    expect(serialize(s.root)).toBe('e^(x)*e^(2x)');
  });
});

/** Equal as math (numeric samples), whatever the written form. */
const sameValue = (a: string, b: string) => {
  const pa = parseExpression(a);
  const pb = parseExpression(b);
  if (!pa.ok || !pb.ok) {
    throw new Error(`${a} / ${b} must parse`);
  }
  return checkEquivalence(pa.ast, pb.ast, { variables: ['x'] }).verdict;
};

describe('editor: real A1 lines typed key by key (no arrows)', () => {
  it('e^{-x}·e^{2x} over (1+e^{-2x})·e^{2x}: 24 presses', () => {
    const keys: Key[] = [
      'e',
      'pow',
      '-',
      'x',
      '*',
      'e',
      'pow',
      '2',
      'x',
      'frac',
      'group',
      '1',
      '+',
      'e',
      'pow',
      '-',
      '2',
      'x',
      'close',
      '*',
      'e',
      'pow',
      '2',
      'x',
    ];
    expect(keys).toHaveLength(24);
    const s = run(keys);
    expect(serialize(s.root)).toBe('((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))');
    expect(diagnose(s.root)).toBeNull();
    expect(
      sameValue(serialize(s.root), '(e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x))'),
    ).toBe('equivalent');
  });
  it('e^{x}/(1+e^{2x}): 10 presses', () => {
    const keys: Key[] = [
      'e',
      'pow',
      'x',
      'frac',
      '1',
      '+',
      'e',
      'pow',
      '2',
      'x',
    ];
    expect(keys).toHaveLength(10);
    expect(serialize(run(keys).root)).toBe('((e^(x))/(1+e^(2x)))');
  });
  it('(1+e^{-2x})·e^{2x}: 14 presses', () => {
    const keys: Key[] = [
      'group',
      '1',
      '+',
      'e',
      'pow',
      '-',
      '2',
      'x',
      'close',
      '*',
      'e',
      'pow',
      '2',
      'x',
    ];
    expect(keys).toHaveLength(14);
    expect(serialize(run(keys).root)).toBe('(1+e^(-2x))*e^(2x)');
  });
  it('the garbled case from the hand test: the exponent no longer swallows × and the fraction', () => {
    // Before: e^{-x×e^{2x}/(...)} (everything went into the first exponent).
    const s = run([
      'e',
      'pow',
      '-',
      'x',
      '*',
      'e',
      'pow',
      '2',
      'x',
      'frac',
      '1',
    ]);
    expect(serialize(s.root)).toBe('((e^(-x)*e^(2x))/(1))');
    const frac = s.root[0];
    expect(frac?.k === 'frac' && frac.num.map(n => n.k)).toEqual([
      'sym',
      'pow',
      'sym',
      'sym',
      'pow',
    ]);
  });
});

describe('editor: exponent rule', () => {
  it('+ leaves the exponent; a digit or a letter stays in it', () => {
    expect(serialize(run(['e', 'pow', '2', 'x', '+', '1']).root)).toBe(
      'e^(2x)+1',
    );
  });
  it('− stays at the start of the exponent, leaves it elsewhere', () => {
    expect(serialize(run(['e', 'pow', '-', 'x']).root)).toBe('e^(-x)');
    expect(serialize(run(['e', 'pow', 'x', '-', '1']).root)).toBe('e^(x)-1');
  });
  it('→ always leaves the exponent, even with the cursor inside it', () => {
    let s = run(['e', 'pow', '2', 'x', 'left']);
    expect(s.cursor.path).toEqual([{ i: 1, slot: 'exp' }]);
    s = apply(s, 'right');
    expect(s.cursor).toEqual({ path: [], at: 2 });
    expect(serialize(apply(s, 'x').root)).toBe('e^(2x)x');
  });
  it('nested exponents: + leaves both', () => {
    expect(serialize(run(['e', 'pow', 'x', 'pow', '2', '+', '1']).root)).toBe(
      'e^(x^(2))+1',
    );
  });
});

describe('editor: fraction key wraps the term on its left', () => {
  it('back to the last + or − of the slot; the cursor goes to the denominator', () => {
    const s = run(['1', '+', 'e', 'pow', 'x', 'frac', '2']);
    expect(serialize(s.root)).toBe('1+((e^(x))/(2))');
    expect(s.cursor.path).toEqual([{ i: 2, slot: 'den' }]);
  });
  it('with nothing on the left: an empty fraction, cursor in the numerator', () => {
    const s = run(['1', '+', 'frac']);
    expect(serialize(s.root)).toBe('1+(()/())');
    expect(s.cursor.path).toEqual([{ i: 2, slot: 'num' }]);
  });
  it('inside parentheses it wraps only the term in them', () => {
    expect(serialize(run(['group', 'x', 'frac', '2']).root)).toBe(
      '(((x)/(2)))',
    );
  });
});

describe('editor: ")" leaves the nearest parenthesis group', () => {
  it('from an exponent inside the group, straight out of both', () => {
    const s = run(['group', 'e', 'pow', 'x', 'close']);
    expect(s.cursor).toEqual({ path: [], at: 1 });
  });
  it('outside any group it does nothing', () => {
    const s = run(['x']);
    expect(apply(s, 'close')).toBe(s);
  });
});

describe('editor: unreadable lines are named and located', () => {
  const at = (keys: Key[]) => diagnose(run(keys).root);
  it('two signs in a row (even ones the parser would accept)', () => {
    expect(at(['x', '+', '+', '1'])).toEqual({
      kind: 'double_operator',
      path: [],
      index: 2,
    });
    expect(at(['2', '*', '-', 'x'])?.kind).toBe('double_operator');
  });
  it('a sign at the start (− is allowed) or at the end of a slot', () => {
    expect(at(['*', 'x'])?.kind).toBe('operator_at_start');
    expect(at(['-', 'x'])).toBeNull();
    expect(at(['x', '+'])).toEqual({
      kind: 'operator_at_end',
      path: [],
      index: 1,
    });
  });
  it('an empty slot, located (here the denominator)', () => {
    expect(at(['e', 'pow', 'x', 'frac'])).toEqual({
      kind: 'empty_slot',
      path: [{ i: 0, slot: 'den' }],
    });
  });
  it('an exponent on nothing', () => {
    expect(at(['pow', '2'])?.kind).toBe('power_without_base');
    expect(at(['x', '+', 'pow', '2'])?.kind).toBe('power_without_base');
  });
  it('a line the diagnosis passes always parses', () => {
    const lines: Key[][] = [
      ['e', 'pow', '-', 'x', '*', 'e', 'pow', '2', 'x', 'frac', '1'],
      ['-', 'x', '+', 'group', 'x', 'close'],
      ['2', 'group', 'x', 'close', 'group', 'x', 'close'],
      ['e', 'pow', 'x', 'pow', '2'],
    ];
    for (const keys of lines) {
      const s = run(keys);
      expect(diagnose(s.root)).toBeNull();
      expect(parseExpression(serialize(s.root)).ok).toBe(true);
    }
  });
});

describe('editor: deserialize (the reducer sees only the string)', () => {
  it('round-trips editor lines, fractions inside groups included', () => {
    const lines: Key[][] = [
      [
        'e',
        'pow',
        '-',
        'x',
        '*',
        'e',
        'pow',
        '2',
        'x',
        'frac',
        'group',
        '1',
        '+',
        'e',
        'pow',
        '-',
        '2',
        'x',
        'close',
        '*',
        'e',
        'pow',
        '2',
        'x',
      ],
      ['group', 'group', 'x', 'close', '+', '1'],
      ['group', 'x', 'frac', '2'],
      ['x', '+', 'frac'],
    ];
    for (const keys of lines) {
      const { root } = run(keys);
      expect(deserialize(serialize(root))).toEqual(root);
    }
  });
  it('anything the editor cannot write gives null', () => {
    expect(deserialize('e^x/(1+e^(2x))')).toBeNull();
    expect(deserialize('(x')).toBeNull();
  });
});

describe('editor v2: ↑ ↓ (innermost structure wins)', () => {
  it('numerator ↔ denominator: the cursor goes to the end of the other slot', () => {
    let s = run(['e', 'pow', 'x', 'frac', '1', '+', 'e']);
    s = apply(s, 'left');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 2 });
    s = apply(s, 'up');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'num' }], at: 2 });
    s = apply(s, 'down');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 3 });
  });
  it('↓ in an exponent goes back to the base; ↑ next to a power enters it', () => {
    let s = run(['e', 'pow', '2', 'x']);
    s = apply(s, 'down');
    expect(s.cursor).toEqual({ path: [], at: 1 });
    s = apply(s, 'up');
    expect(s.cursor).toEqual({ path: [{ i: 1, slot: 'exp' }], at: 2 });
    // Right after the power works too.
    s = apply(apply(s, 'right'), 'up');
    expect(s.cursor.path).toEqual([{ i: 1, slot: 'exp' }]);
  });
  it('an exponent inside a denominator: ↓ leaves the exponent, ↑ then reaches the numerator', () => {
    let s = run(['1', 'frac', 'e', 'pow', 'x']);
    expect(s.cursor.path).toEqual([
      { i: 0, slot: 'den' },
      { i: 1, slot: 'exp' },
    ]);
    s = apply(s, 'down');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 1 });
    s = apply(apply(s, 'left'), 'up');
    expect(s.cursor.path).toEqual([{ i: 0, slot: 'num' }]);
  });
  it('a fraction in a numerator: ↓ from its denominator goes to the outer denominator', () => {
    // (a/b) / c with the cursor in b.
    let s = run(['frac', 'frac', 'x', 'down', '2']);
    expect(s.cursor.path).toEqual([
      { i: 0, slot: 'num' },
      { i: 0, slot: 'den' },
    ]);
    s = apply(s, 'down');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 0 });
    s = apply(s, 'up');
    expect(s.cursor.path).toEqual([{ i: 0, slot: 'num' }]);
  });
  it('outside any structure ↑ and ↓ do nothing', () => {
    const s = run(['x', '+', '1']);
    expect(apply(s, 'up')).toBe(s);
    expect(apply(s, 'down')).toBe(s);
  });
});

describe('editor v2: widen, then wrap', () => {
  // 1 + e^x × e^{2x}, then → out of the exponent: 7 nodes [1 + e ^x × e ^2x].
  const PRODUCT: Key[] = [
    ...(['1', '+', 'e', 'pow', 'x', '*', 'e', 'pow', '2', 'x'] as Key[]),
    'right',
  ];
  it('atom (with its power), then the term, then the slot', () => {
    let s = run(PRODUCT);
    s = apply(s, 'widen');
    expect(s.sel).toEqual({ path: [], from: 5, to: 7 }); // e^{2x}
    s = apply(s, 'widen');
    expect(s.sel).toEqual({ path: [], from: 2, to: 7 }); // e^x × e^{2x}
    s = apply(s, 'widen');
    expect(s.sel).toEqual({ path: [], from: 0, to: 7 }); // the whole line
  });
  it('from inside an exponent, widen starts there (innermost first)', () => {
    const s = apply(run(PRODUCT.slice(0, -1)), 'widen');
    expect(s.sel).toEqual({ path: [{ i: 6, slot: 'exp' }], from: 1, to: 2 });
  });
  it('widen crosses a slot edge: from inside an exponent to the power and its base', () => {
    let s = run(['e', 'pow', '-', '2', 'x']);
    s = apply(s, 'widen'); // x
    s = apply(s, 'widen'); // 2x (the term after the sign)
    expect(s.sel).toEqual({ path: [{ i: 1, slot: 'exp' }], from: 1, to: 3 });
    s = apply(s, 'widen'); // −2x
    s = apply(s, 'widen'); // e^{−2x}
    expect(s.sel).toEqual({ path: [], from: 0, to: 2 });
  });
  it('fraction key: the selection becomes the numerator, cursor in the denominator', () => {
    let s = run(PRODUCT);
    s = apply(apply(s, 'widen'), 'widen');
    s = apply(s, 'frac');
    expect(serialize(s.root)).toBe('1+((e^(x)*e^(2x))/())');
    expect(s.cursor).toEqual({ path: [{ i: 2, slot: 'den' }], at: 0 });
    expect(s.flash).toEqual({ path: [], index: 2 });
    expect(s.sel).toBeUndefined();
    // The flash marker goes with the next key.
    expect(apply(s, '2').flash).toBeUndefined();
  });
  it('"( )": the selection goes in parentheses, cursor after them', () => {
    let s = run(['2', 'x', '+', '1']);
    s = apply(apply(s, 'widen'), 'widen'); // 2x+1 (the whole line: a sign ends the term)
    s = apply(s, 'group');
    expect(serialize(s.root)).toBe('(2x+1)');
    expect(s.cursor).toEqual({ path: [], at: 1 });
    expect(s.flash).toEqual({ path: [], index: 0 });
  });
  it('wrapping a sub-expression of a numerator', () => {
    // (e^{-x}·e^{2x}) over d: select e^{2x} in the numerator, wrap it in ( ).
    let s = run([
      'e',
      'pow',
      '-',
      'x',
      '*',
      'e',
      'pow',
      '2',
      'x',
      'frac',
      '1',
      'up',
    ]);
    s = apply(apply(s, 'widen'), 'group');
    expect(serialize(s.root)).toBe('((e^(-x)*(e^(2x)))/(1))');
  });
  it('with a selection: ⌫ deletes it, ← → collapse it, another key ends it and acts after it', () => {
    const sel = apply(run(['2', 'x', '+', '1']), 'widen'); // 1
    expect(serialize(apply(sel, 'back').root)).toBe('2x+');
    expect(apply(sel, 'left').cursor).toEqual({ path: [], at: 3 });
    expect(apply(sel, 'right').sel).toBeUndefined();
    const typed = apply(sel, '*');
    expect(serialize(typed.root)).toBe('2x+1*');
    expect(typed.sel).toBeUndefined();
  });
  it('nothing to widen in an empty line', () => {
    const s = emptyEditor();
    expect(apply(s, 'widen')).toBe(s);
  });
});

describe('editor v2: tap places the cursor', () => {
  it('a tap on a symbol puts the cursor right after it; a tap on a slot, at its end', () => {
    let s = run(['x', '+', '1']);
    s = apply(s, { focus: [], at: 1 });
    expect(serialize(apply(s, '2').root)).toBe('x2+1');
    s = run(['frac', 'x', 'down', '2']);
    s = apply(s, { focus: [{ i: 0, slot: 'num' }] });
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'num' }], at: 1 });
  });
});

describe('editor v2: backspace and structures', () => {
  it('the hand-test case: 1+x+, widen, fraction, then ⌫ in the empty denominator', () => {
    let s = run(['1', '+', 'x', '+', 'widen']);
    // Widen takes the operand, not the lone sign.
    expect(s.sel).toEqual({ path: [], from: 2, to: 3 });
    s = apply(s, 'frac');
    expect(serialize(s.root)).toBe('1+((x)/())+');
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('1+x+');
    expect(s.cursor).toEqual({ path: [], at: 3 });
    expect(s.change).toBe('remove_fraction');
  });
  it('empty denominator: the fraction dissolves, the numerator comes back inline, cursor at its end', () => {
    const s = apply(run(['e', 'pow', 'x', 'frac']), 'back');
    expect(serialize(s.root)).toBe('e^(x)');
    expect(s.cursor).toEqual({ path: [], at: 2 });
  });
  it('empty numerator: the denominator comes back inline, cursor before it', () => {
    let s = run(['frac', 'down', '2', 'up']);
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('2');
    expect(s.cursor).toEqual({ path: [], at: 0 });
  });
  it('empty parentheses are removed; an empty exponent removes the power and keeps its base', () => {
    expect(serialize(apply(run(['x', 'group']), 'back').root)).toBe('x');
    const p = apply(run(['e', 'pow']), 'back');
    expect(serialize(p.root)).toBe('e');
    expect(p.cursor).toEqual({ path: [], at: 1 });
    expect(p.change).toBe('remove_power');
  });
  it('a filled slot is emptied one piece at a time, then the next ⌫ dissolves it', () => {
    let s = run(['e', 'pow', '2', 'x']);
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('e^(2)');
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('e^()');
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe('e');
  });
  it('a power or a group before the cursor is one piece', () => {
    expect(serialize(apply(run(['e', 'pow', 'x', 'right']), 'back').root)).toBe(
      'e',
    );
    expect(
      serialize(apply(run(['2', 'group', 'x', 'close']), 'back').root),
    ).toBe('2');
  });
  it('⌫ at the start of a filled numerator or denominator only steps out to the left', () => {
    let s = run(['1', '+', 'x', 'frac', '2', 'left']);
    expect(s.cursor).toEqual({ path: [{ i: 2, slot: 'den' }], at: 0 });
    const before = serialize(s.root);
    s = apply(s, 'back');
    expect(serialize(s.root)).toBe(before);
    expect(s.cursor).toEqual({ path: [], at: 2 });
    // Same at the start of a filled numerator.
    s = apply(run(['x', 'frac', 'up', 'left']), 'back');
    expect(serialize(s.root)).toBe('((x)/())');
    expect(s.cursor).toEqual({ path: [], at: 0 });
  });
  it('structural keys report their change (the card offers its undo)', () => {
    expect(apply(emptyEditor(), 'frac').change).toBe('fraction');
    expect(apply(run(['e']), 'pow').change).toBe('power');
    expect(apply(emptyEditor(), 'group').change).toBe('group');
    expect(apply(run(['x']), 'frac').change).toBe('fraction');
    expect(apply(apply(run(['x']), 'widen'), 'group').change).toBe('group');
    expect(apply(run(['x']), '1').change).toBeUndefined();
  });
});

describe('editor: copy the previous line (fromExpression)', () => {
  const START = '(e^(-x))/(1+e^(-2x))';
  const fromStart = () => ({
    root: fromExpression(START, ['x'])!,
    cursor: { path: [], at: 1 },
  });
  it('the start expression becomes editable math (same reading, no extra parentheses)', () => {
    const s = fromStart();
    expect(serialize(s.root)).toBe('((e^(-x))/(1+e^(-2x)))');
    expect(sameValue(serialize(s.root), START)).toBe('equivalent');
  });
  it('what the keys cannot write gives null (decimals, functions)', () => {
    expect(fromExpression('0.5x', ['x'])).toBeNull();
    expect(fromExpression('sqrt(x)', ['x'])).toBeNull();
  });
  it('line 1 from a copy of the start: 16 presses (24 typed from scratch)', () => {
    const keys: Key[] = [
      'left', // into the denominator, at its end
      'widen',
      'widen', // the whole denominator
      'group', // (1 + e^{-2x})
      ...(['*', 'e', 'pow', '2', 'x'] as Key[]),
      'up', // to the numerator
      ...(['*', 'e', 'pow', '2', 'x'] as Key[]),
    ];
    expect(1 + keys.length).toBe(16); // + the copy key
    expect(serialize(run(keys, fromStart()).root)).toBe(
      '((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))',
    );
  });
  it('line 2 from a copy of line 1: 19 presses (10 typed from scratch)', () => {
    const line1 = fromExpression('((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))', [
      'x',
    ])!;
    const keys: Key[] = [
      'left',
      ...(['back', 'back', 'back', 'back'] as Key[]), // empty the denominator
      ...(['e', 'pow', '2', 'x', '+', '1'] as Key[]),
      'up',
      ...(['back', 'back', 'back', 'back'] as Key[]), // numerator back to e
      'pow',
      'x',
    ];
    expect(1 + keys.length).toBe(19);
    expect(
      serialize(run(keys, { root: line1, cursor: { path: [], at: 1 } }).root),
    ).toBe('((e^(x))/(e^(2x)+1))');
  });
});

describe('editor: signs stay outside a wrap', () => {
  it('1+x+, widen twice, fraction: (1+x)/[] followed by +', () => {
    let s = run(['1', '+', 'x', '+', 'widen', 'widen']);
    // The whole-slot step stops before the trailing sign.
    expect(s.sel).toEqual({ path: [], from: 0, to: 3 });
    s = apply(s, 'frac');
    expect(serialize(s.root)).toBe('((1+x)/())+');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'den' }], at: 0 });
  });
  it('a selection with signs at both edges: they stay outside (fraction and parentheses)', () => {
    // "1 + x +" with "+ x +" selected (from the first + to the end).
    const s = {
      ...run(['1', '+', 'x', '+']),
      sel: { path: [], from: 1, to: 4 },
    };
    expect(serialize(apply(s, 'frac').root)).toBe('1+((x)/())+');
    expect(serialize(apply(s, 'group').root)).toBe('1+(x)+');
  });
  it('a leading − stays inside: −x is one thing', () => {
    const s = { ...run(['-', 'x']), sel: { path: [], from: 0, to: 2 } };
    expect(serialize(apply(s, 'frac').root)).toBe('((-x)/())');
  });
  it('only signs selected: as if nothing was (an empty fraction after them)', () => {
    const s = { ...run(['x', '+']), sel: { path: [], from: 1, to: 2 } };
    expect(serialize(apply(s, 'frac').root)).toBe('x+(()/())');
  });
  it('the fraction key right after × inserts an empty fraction after it', () => {
    expect(serialize(run(['2', '*', 'frac']).root)).toBe('2*(()/())');
  });
});

describe('editor: the fraction key in a denominator keeps wrapping (nested fractions)', () => {
  it('(1/x)/(1 + 1/x²) is typable: 12 presses', () => {
    const keys: Key[] = [
      ...(['1', 'frac', 'x'] as Key[]), // 1/x
      'right', // out of the denominator
      'frac', // 1/x becomes the numerator
      ...(['1', '+', '1', 'frac', 'x', 'pow', '2'] as Key[]), // 1 + 1/x²
    ];
    expect(keys).toHaveLength(12);
    const line = serialize(run(keys).root);
    expect(line).toBe('((((1)/(x)))/(1+((1)/(x^(2)))))');
    expect(sameValue(line, '(1/x)/(1+1/x^2)')).toBe('equivalent');
  });
  it('in a filled denominator it wraps the term on its left (undo chip shown)', () => {
    const s = run(['1', '+', 'x', 'widen', 'widen', 'frac', '1', 'frac']);
    expect(serialize(s.root)).toBe('((1+x)/(((1)/())))');
    expect(s.change).toBe('fraction');
  });
});

/** The written line read the way the engine reads it (counting notation first). */
const valueOf = (line: string) => {
  const n = normalizeCounting(line);
  const p = parseExpression(n.ok ? n.text : line, {
    variables: [],
    constants: [],
  });
  if (!p.ok) {
    throw new Error(`${line} must parse`);
  }
  return evaluateExact(p.ast);
};
const sides = (line: string) => line.split('=').map(valueOf);

describe('editor: written lines (worksheet keys)', () => {
  it('10×9×8 = 720: "=" splits the line, the engine reads it', () => {
    const s = run(['1', '0', '*', '9', '*', '8', '=', '7', '2', '0']);
    expect(toLine(s.root)).toBe('10*9*8=720');
    expect(serialize(s.root)).toBe('10*9*8=720');
    expect(diagnoseLine(s.root)).toBeNull();
  });
  it('÷ wraps the product on its left, the divisor is one denominator: no 990/3*2*1 reading', () => {
    const keys: Key[] = [
      ...(['1', '0', '*', '9', '*', '8'] as Key[]),
      'div',
      ...(['3', '*', '2', '*', '1'] as Key[]),
      '=',
      ...(['1', '2', '0'] as Key[]),
    ];
    const s = run(keys);
    expect(s.root[0]?.k).toBe('frac');
    expect(toLine(s.root)).toBe('10*9*8/(3*2*1)=120');
    expect(sides(toLine(s.root))).toEqual([
      [120, 1],
      [120, 1],
    ]);
  });
  it('720 ÷ (3×2×1) = 120: "=" typed in the denominator leaves it', () => {
    const s = run([
      ...(['7', '2', '0', 'div', '3', '*', '2', '*', '1', '='] as Key[]),
      ...(['1', '2', '0'] as Key[]),
    ]);
    expect(s.cursor).toEqual({ path: [], at: 5 });
    expect(toLine(s.root)).toBe('720/(3*2*1)=120');
  });
  it('the fraction key never takes the other side of an "="', () => {
    const s = run(['5', '=', '1', '0', 'div', '2']);
    expect(toLine(s.root)).toBe('5=10/2');
  });
  it('widen stops at the side: the whole side, never the "="', () => {
    let s = run(['2', '+', '3', '=', '5', '+', '0']);
    s = apply(apply(s, 'widen'), 'widen'); // 5+0 (the side after "=")
    expect(s.sel).toEqual({ path: [], from: 4, to: 7 });
    expect(apply(s, 'widen').sel).toEqual(s.sel);
  });
  it('the decimal comma: 0,5 × 120 = 60', () => {
    const s = run(['0', ',', '5', '*', '1', '2', '0', '=', '6', '0']);
    expect(toLine(s.root)).toBe('0,5*120=60');
    expect(sides(toLine(s.root))).toEqual([
      [60, 1],
      [60, 1],
    ]);
  });
  it('n, k, ! and C(n, r): C(10,3) = 10!/(3!×7!)', () => {
    const s = run([
      'choose',
      '1',
      '0',
      'right',
      '3',
      'right',
      '=',
      ...(['1', '0', '!', 'div', '3', '!', '*', '7', '!'] as Key[]),
    ]);
    expect(serialize(s.root)).toBe('C((10),(3))=((10!)/(3!*7!))');
    expect(toLine(s.root)).toBe('C(10,3)=10!/(3!*7!)');
    expect(sides(toLine(s.root))).toEqual([
      [120, 1],
      [120, 1],
    ]);
    expect(sides(serialize(s.root))).toEqual([
      [120, 1],
      [120, 1],
    ]);
    const formula = run(['choose', 'n', 'up', 'k']);
    expect(serialize(formula.root)).toBe('C((n),(k))');
  });
  it('↑ ↓ in C(n, r): r is drawn above, n below', () => {
    let s = run(['choose', '5']);
    expect(s.cursor.path).toEqual([{ i: 0, slot: 'n' }]);
    s = apply(s, 'up');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'r' }], at: 0 });
    s = apply(apply(s, '2'), 'down');
    expect(s.cursor).toEqual({ path: [{ i: 0, slot: 'n' }], at: 1 });
    // ← from the start of r goes to the end of n; ⌫ in an empty n keeps r.
    expect(apply(run(['choose', 'right']), 'left').cursor.path).toEqual([
      { i: 0, slot: 'n' },
    ]);
    const kept = apply(run(['choose', 'right', '2', 'left', 'left']), 'back');
    expect(serialize(kept.root)).toBe('2');
  });
  it('round trip of the new symbols and C(n, r)', () => {
    const lines: Key[][] = [
      ['1', '0', '*', '9', 'div', '2', '=', '4', '5'],
      ['choose', 'n', 'right', 'k', 'right', '*', '0', ',', '5'],
      ['group', 'n', '-', 'k', 'close', '!'],
    ];
    for (const keys of lines) {
      const { root } = run(keys);
      expect(deserialize(serialize(root))).toEqual(root);
    }
  });
  it('toLine has the value of serialize, with fewer parentheses', () => {
    const lines: Key[][] = [
      ['2', '*', 'div', '1', 'right', '4'],
      ['2', '*', '1', 'div', '4'],
      ['1', 'div', '2', 'right', '+', '3'],
      ['1', 'div', '2', 'right', 'group', '3', 'close'],
      ['1', 'div', '1', 'div', '2'],
      ['1', '+', '2', 'widen', 'widen', 'div', '3'],
      ['6', 'div', '-', '3'],
      ['9', '-', '6', 'div', '3', '*', '2'],
      ['choose', '5', 'right', '2', 'right', 'div', '2', '!'],
      ['1', 'div', '2', 'right', 'div', '4'],
    ];
    for (const keys of lines) {
      const { root } = run(keys);
      expect(diagnoseLine(root)).toBeNull();
      expect(valueOf(toLine(root))).toEqual(valueOf(serialize(root)));
    }
    // ÷ takes the whole product on its left; a fraction after × stays whole.
    expect(toLine(run(['2', '*', '1', 'div', '4']).root)).toBe('2*1/4');
    expect(toLine(run(['2', '*', 'div', '1', 'right', '4']).root)).toBe(
      '2*(1/4)',
    );
    expect(toLine(run(['6', 'div', '-', '3']).root)).toBe('6/(-3)');
  });
  it('a fraction followed by × is grouped: the engine never has to ask how a ÷ was meant', () => {
    const literal = toLine(
      run(['9', '9', '0', 'div', '3', 'right', '*', '2', '*', '1']).root,
    );
    expect(literal).toBe('(990/3)*2*1');
    expect(readback(literal)).toBeNull();
    const grouped = toLine(
      run(['9', '9', '0', 'div', '3', '*', '2', '*', '1']).root,
    );
    expect(grouped).toBe('990/(3*2*1)');
    expect(readback(grouped)).toBeNull();
  });
  it('written-line issues: misplaced comma, factorial on nothing, signs around "="', () => {
    const at = (keys: Key[]) => diagnoseLine(run(keys).root)?.kind;
    expect(at([',', '5'])).toBe('misplaced_comma');
    expect(at(['1', ',', '5', ',', '2'])).toBe('misplaced_comma');
    expect(at(['5', ','])).toBe('misplaced_comma');
    expect(at(['!'])).toBe('factorial_without_base');
    expect(at(['5', '+', '!'])).toBe('factorial_without_base');
    expect(at(['=', '5'])).toBe('operator_at_start');
    expect(at(['5', '='])).toBe('operator_at_end');
    expect(at(['5', '+', '=', '5'])).toBe('operator_at_end');
    expect(at(['5', '=', '=', '5'])).toBe('double_operator');
    expect(at(['5', '=', '*', '5'])).toBe('operator_at_start');
    expect(at(['5', '=', '-', '5'])).toBeUndefined();
    // "=" inside a structure cannot be typed; a read line can still hold one.
    expect(
      diagnoseLine([{ k: 'group', body: [{ k: 'sym', v: '=' }] }])?.kind,
    ).toBe('misplaced_equals');
  });
  it('diagnose (analysis lines) keeps its own kinds', () => {
    expect(diagnose(run(['5', ',']).root)).toBeNull();
    expect(diagnose(run(['x', '+']).root)?.kind).toBe('operator_at_end');
  });
});

describe('editor: written lines read back (fromExpression, line mode)', () => {
  const read = (src: string, vars: string[] = []) =>
    fromExpression(src, vars, { line: true });
  it('sides, ÷ and × signs, the divisor stays one denominator', () => {
    expect(serialize(read('10×9×8÷(3×2×1)=120')!)).toBe(
      '((10*9*8)/(3*2*1))=120',
    );
    expect(toLine(read('10*9*8/(3*2*1)=120')!)).toBe('10*9*8/(3*2*1)=120');
  });
  it('counting notation and factorials become C(n, r) and "!"', () => {
    expect(serialize(read('C(10,3)=120')!)).toBe('C((10),(3))=120');
    expect(serialize(read('C(10;3)')!)).toBe('C((10),(3))');
    expect(serialize(read('2C(5,2)')!)).toBe('2C((5),(2))');
    expect(serialize(read('10!/(3!*7!)')!)).toBe('((10!)/(3!*7!))');
    expect(serialize(read('(n-k)!', ['n', 'k'])!)).toBe('(n-k)!');
    expect(serialize(read('C(n,k)', ['n', 'k'])!)).toBe('C((n),(k))');
  });
  it('the decimal comma only in line mode (the analysis lines are unchanged)', () => {
    expect(serialize(read('0,5*4=2')!)).toBe('0,5*4=2');
    expect(fromExpression('0.5x', ['x'])).toBeNull();
  });
  it('what cannot be written gives null', () => {
    expect(read('C(10)')).toBeNull();
    expect(read('!5')).toBeNull();
    expect(read('A(10,3)')).toBeNull();
    expect(read('10*')).toBeNull();
  });
});

describe('editor: scaffolds (holes and locks)', () => {
  const lock = (v: string): Node => ({ k: 'sym', v, lock: true });
  const hole = (): Node => ({ k: 'hole', fill: [] });
  // [ ] × [ ] over ([ ]) = [ ]: a locked fraction with blanks.
  const TEMPLATE: Node[] = [
    {
      k: 'frac',
      num: [hole(), lock('*'), hole()],
      den: [hole()],
      lock: true,
    },
    lock('='),
    hole(),
  ];
  const start = () => scaffoldEditor(TEMPLATE);
  it('starts in the first blank', () => {
    expect(start().cursor).toEqual({
      path: [
        { i: 0, slot: 'num' },
        { i: 0, slot: 'fill' },
      ],
      at: 0,
    });
  });
  it('typed over: signs and ÷ the scaffold has are stepped over', () => {
    const s = run(['1', '0', '*', '9', 'div', '2', '=', '4', '5'], start());
    expect(toLine(s.root)).toBe('10*9/2=45');
    expect(diagnoseLine(s.root)).toBeNull();
    expect(holesEmpty(s.root)).toBe(false);
  });
  it('a key outside a blank writes in the next blank; the locked parts never change', () => {
    let s = apply(start(), { focus: [], at: 1 }); // after the fraction, before "="
    s = run(['7'], s);
    expect(toLine(s.root).endsWith('=7')).toBe(true);
    s = run(['back', 'back', 'back'], s);
    expect(holesEmpty(s.root)).toBe(true);
    expect(s.root[1]).toEqual(lock('='));
    expect(s.root[0]?.k).toBe('frac');
  });
  it('⌫ never deletes a locked piece: it goes back to the previous blank', () => {
    let s = run(['1', '0', '*', '9'], start());
    s = apply(s, { focus: [{ i: 0, slot: 'num' }], at: 2 }); // after the locked ×
    s = apply(s, 'back');
    expect(s.cursor).toEqual({
      path: [
        { i: 0, slot: 'num' },
        { i: 0, slot: 'fill' },
      ],
      at: 2,
    });
    expect(toLine(s.root)).toContain('10*9');
  });
  it('a sign inside a blank stays there (10 − 3 in one blank)', () => {
    const s = run(['1', '0', '-', '3'], start());
    expect(toLine(s.root).startsWith('(10-3)*')).toBe(true);
  });
  it('wrapping or deleting a locked part with a selection does nothing', () => {
    const s = { ...start(), sel: { path: [], from: 0, to: 2 } };
    expect(apply(s, 'back').root).toBe(TEMPLATE);
    expect(apply(s, 'group').root).toBe(TEMPLATE);
  });
  it('"clear" empties the blanks and keeps the scaffold', () => {
    const s = apply(run(['1', '0', '*', '9'], start()), 'clear');
    expect(s.root).toEqual(TEMPLATE);
    expect(s.cursor).toEqual(start().cursor);
  });
  it('a number tile goes in at the cursor (in the next blank from a locked spot)', () => {
    const tile: Key = {
      insert: [
        { k: 'sym', v: '7' },
        { k: 'sym', v: '2' },
      ],
    };
    expect(serialize(apply(run(['1', '+']), tile).root)).toBe('1+72');
    const s = apply(apply(start(), { focus: [], at: 2 }), tile);
    expect(toLine(s.root).endsWith('=72')).toBe(true);
  });
  it('an empty blank is named and located', () => {
    expect(diagnoseLine(start().root)).toEqual({
      kind: 'empty_slot',
      path: [
        { i: 0, slot: 'num' },
        { i: 0, slot: 'fill' },
      ],
    });
  });
});
