import React from 'react';

import { checkLine, type LinesSpec } from '../../lesson/lines/check';
import {
  apply,
  emptyEditor,
  serialize,
  type EditorState,
  type Key,
} from '../../lesson/lines/editor';
import { LinesCard, emptyLines } from '../../lesson/lines/LinesCard';
import type { DemoCase } from './ProbabilityDemoScreen';

// Demo-only states of the line editor (Exercise 4 A1 shape); not lesson content.
const A1: LinesSpec = {
  variables: ['x'],
  start: '(e^(-x))/(1+e^(-2x))',
  goal: '(e^x)/(1+e^(2x))',
  knownWrong: [],
};
const typed = (keys: Key[]): EditorState => keys.reduce(apply, emptyEditor());

/** f(-x) multiplied by e^{2x} / e^{2x}: an accepted first line. */
const MULTIPLIED: Key[] = [
  'frac',
  'e',
  'pow',
  '-',
  'x',
  'right',
  '*',
  'e',
  'pow',
  '2',
  'x',
  'right',
  'right',
  'group',
  '1',
  '+',
  'e',
  'pow',
  '-',
  '2',
  'x',
  'right',
  'right',
  '*',
  'e',
  'pow',
  '2',
  'x',
];
/** e^x / (e^{2x} + 2): wrong denominator. */
const WRONG_DEN: Key[] = [
  'frac',
  'e',
  'pow',
  'x',
  'right',
  'right',
  'e',
  'pow',
  '2',
  'x',
  'right',
  '+',
  '2',
];
/** A long nested line (exponents, groups, fractions, then more terms). */
const LONG: Key[] = [
  ...MULTIPLIED,
  ...(['right', 'right', '+', 'e', 'pow', '2', 'x', 'right'] as Key[]),
  ...(['right', 'right', '*', 'group', 'x', '+', '1', 'right', '+'] as Key[]),
  ...(['frac', 'e', 'pow', 'x', 'right', 'right', 'group', '1', '+'] as Key[]),
  ...(['e', 'pow', '2', 'x', 'right', 'right', 'right', '-', 'x'] as Key[]),
  ...(['+', 'frac', '2', 'right', 'e', 'pow', '-', 'x', 'right'] as Key[]),
  ...(['right', '-', '3'] as Key[]),
];

/** Typing e^{-x}: the exponent slot is active (highlighted). */
const IN_EXPONENT: Key[] = ['e', 'pow', '-', 'x'];
/** 1 + e^x × e^{2x}, widened twice: the term e^x × e^{2x} is selected. */
const WIDENED: Key[] = [
  ...(['1', '+', 'e', 'pow', 'x', '*', 'e', 'pow', '2', 'x'] as Key[]),
  ...(['right', 'widen', 'widen'] as Key[]),
];
/** e^{x} + × 1: two signs in a row (unreadable, the × is marked). */
const DOUBLE_SIGN: Key[] = ['e', 'pow', 'x', '+', '*', '1'];

const accepted = serialize(typed(MULTIPLIED).root);
const wrongDraft = typed(WRONG_DEN);

const card = (initial: Parameters<typeof LinesCard>[0]['initial']) => () =>
  (
    <LinesCard
      spec={A1}
      lhs="f(-x)"
      goalLatex="f(x)=\frac{e^{x}}{1+e^{2x}}"
      {...(initial && { initial })}
    />
  );

export const LINES_CASES: DemoCase[] = [
  { key: 'LinesEditor', title: 'Lines: empty editor', render: card(undefined) },
  {
    key: 'LinesEditor',
    title: 'Lines: one accepted line',
    render: card({
      ...emptyLines(),
      accepted: [accepted],
      last: checkLine(A1, [], accepted),
    }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: error localized (denominator)',
    render: card({
      ...emptyLines(),
      editor: wrongDraft,
      last: checkLine(A1, [], serialize(wrongDraft.root)),
    }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: keys collapsed',
    render: card({
      ...emptyLines(),
      editor: typed(WRONG_DEN),
      collapsed: true,
    }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: typing in an exponent (active slot)',
    render: card({ ...emptyLines(), editor: typed(IN_EXPONENT) }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: widen selected a term (fraction key would wrap it)',
    render: card({ ...emptyLines(), editor: typed(WIDENED) }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: just after a wrap (undo chip for 4 s)',
    render: card({
      ...emptyLines(),
      editor: typed(['1', '+', 'x', '+', 'widen', 'frac']),
    }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: unreadable line (two signs, marked)',
    render: card({
      ...emptyLines(),
      editor: typed(DOUBLE_SIGN),
      last: checkLine(A1, [], serialize(typed(DOUBLE_SIGN).root)),
    }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: long fraction / exponent line',
    render: card({ ...emptyLines(), editor: typed(LONG) }),
  },
  {
    key: 'LinesEditor',
    title: 'Lines: long line, cursor back at its start (start in view)',
    render: card({
      ...emptyLines(),
      editor: { ...typed(LONG), cursor: { path: [], at: 0 } },
    }),
  },
];
