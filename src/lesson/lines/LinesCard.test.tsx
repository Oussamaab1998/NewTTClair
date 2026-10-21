import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import '../../i18n';
import type { ComponentHandle } from '../../components/contract';
import { readoutPair } from '../../components/analysis/plot';
import { evalFn } from '../../engine/analysis';
import { checkLine, type LinesSpec } from './check';
import { LinesCard } from './LinesCard';

const spec: LinesSpec = {
  variables: ['x'],
  start: '(e^(-x))/(1+e^(-2x))',
  goal: '(e^x)/(1+e^(2x))',
  knownWrong: [],
};
const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
async function keys(...ks: string[]) {
  for (const k of ks) {
    await tap(`lines-key-${k}`);
  }
}
/** e^x / (1 + e^(2x)) followed by the given denominator constant. */
async function typeGoalWith(constant: string) {
  await keys('frac', 'e', 'pow', 'x', 'right', 'right');
  await keys('e', 'pow', '2', 'x', 'right', '+', constant);
}

describe('LinesCard', () => {
  it('shows the goal and the start line; check is disabled while empty', async () => {
    await render(<LinesCard spec={spec} lhs="f(-x)" />);
    expect(screen.getByTestId('lines-goal')).toBeOnTheScreen();
    expect(screen.getByTestId('lines-line-0')).toBeOnTheScreen();
    expect(screen.getByTestId('lines-check')).toBeDisabled();
  });
  it('an equivalent line in the goal form is accepted, added to the notebook, and ends the step', async () => {
    const onLine = jest.fn();
    await render(<LinesCard spec={spec} onLine={onLine} />);
    await typeGoalWith('1');
    await tap('lines-check');
    expect(onLine).toHaveBeenCalledWith(
      '((e^(x))/(e^(2x)+1))',
      expect.arrayContaining(['frac', 'pow']),
      checkLine(spec, [], '((e^(x))/(e^(2x)+1))'),
    );
    expect(screen.getByTestId('lines-line-1')).toBeOnTheScreen();
    expect(screen.getByTestId('lines-done')).toBeOnTheScreen();
    expect(screen.queryByTestId('lines-editor')).toBeNull();
  });
  it('a wrong denominator is named, with the student own value at x = 1', async () => {
    await render(<LinesCard spec={spec} />);
    await typeGoalWith('2');
    await tap('lines-check');
    expect(screen.getByTestId('lines-where')).toHaveTextContent(/dénominateur/);
    // Compared side by side: same number of decimals (0,290 vs 0,324).
    expect(screen.getByTestId('lines-yours')).toHaveTextContent('0,290');
    expect(screen.getByTestId('lines-expected')).toHaveTextContent(
      readoutPair(0, evalFn('f_ex4', 1))[1],
    );
    // Ends with one action, and the faulty slot is marked in the draft.
    expect(screen.getByTestId('lines-action')).toHaveTextContent(
      /dénominateur/,
    );
    expect(screen.getByTestId('lines-action')).toHaveTextContent(/ثبّت/);
    expect(screen.getByTestId('editor-faulty-slot')).toBeOnTheScreen();
    // The draft stays for correction; the notebook did not grow.
    expect(screen.queryByTestId('lines-line-1')).toBeNull();
  });
  it('an empty slot is named and marked; the line is not graded', async () => {
    const onLine = jest.fn();
    await render(<LinesCard spec={spec} onLine={onLine} />);
    await keys('e', 'frac');
    await tap('lines-check');
    expect(screen.getByTestId('lines-unreadable')).toHaveTextContent(
      /خانة فارغة/,
    );
    expect(screen.getByTestId('editor-faulty-slot')).toBeOnTheScreen();
    expect(onLine.mock.calls[0]?.[2]).toMatchObject({ kind: 'unreadable' });
    expect(screen.queryByTestId('lines-wrong')).toBeNull();
  });
  it('two signs in a row: the second one is marked; editing clears the warning', async () => {
    await render(<LinesCard spec={spec} />);
    await keys('x', '+', '*', '1');
    await tap('lines-check');
    expect(screen.getByTestId('lines-unreadable')).toHaveTextContent(
      /زوز علامات/,
    );
    expect(screen.getByTestId('editor-faulty-node')).toHaveTextContent('×');
    await tap('lines-key-back');
    expect(screen.queryByTestId('lines-unreadable')).toBeNull();
    expect(screen.queryByTestId('editor-faulty-node')).toBeNull();
  });
  it('the slot being typed in is highlighted; ")" comes with the parentheses key', async () => {
    await render(<LinesCard spec={spec} keys={['e', 'pow', 'x', 'group']} />);
    expect(screen.getByTestId('lines-key-close')).toBeOnTheScreen();
    expect(screen.queryByTestId('editor-active-slot')).toBeNull();
    await keys('e', 'pow');
    expect(screen.getByTestId('editor-active-slot')).toBeOnTheScreen();
  });
  it('▾ folds the keys and keeps the controls; the snapshot has the draft', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    await keys('x');
    await tap('lines-collapse');
    expect(screen.queryByTestId('lines-keys')).toBeNull();
    expect(screen.getByTestId('lines-check')).toBeOnTheScreen();
    expect(ref.current?.getStateSnapshot()).toMatchObject({
      collapsed: true,
      draft: 'x',
      accepted: [],
    });
  });
  it('readonly shows the notebook only', async () => {
    await render(
      <LinesCard
        spec={spec}
        readonly
        initial={{
          accepted: ['(e^(x))/(e^(2x)+1)'],
          editor: { root: [], cursor: { path: [], at: 0 } },
          collapsed: false,
          last: null,
          done: true,
        }}
      />,
    );
    expect(screen.getByTestId('lines-line-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('lines-editor')).toBeNull();
  });
});

describe('LinesCard on mount', () => {
  it('does nothing by itself: no check, no feedback, empty draft', async () => {
    const onLine = jest.fn();
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} onLine={onLine} ref={ref} />);
    expect(onLine).not.toHaveBeenCalled();
    expect(screen.queryByTestId('lines-wrong')).toBeNull();
    expect(screen.queryByTestId('lines-invalid')).toBeNull();
    expect(ref.current?.getStateSnapshot()).toMatchObject({
      accepted: [],
      draft: '',
      last: null,
      done: false,
    });
  });
});

describe('LinesCard: editor v2', () => {
  const draft = (ref: React.RefObject<ComponentHandle | null>) =>
    (ref.current?.getStateSnapshot() as { draft: string }).draft;

  it('undo and redo edits (not cursor moves); a new edit clears redo', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    expect(screen.getByTestId('lines-key-undo')).toBeDisabled();
    await keys('x', '+', '1', 'left');
    await tap('lines-key-undo');
    expect(draft(ref)).toBe('x+');
    await tap('lines-key-undo');
    expect(draft(ref)).toBe('x');
    await tap('lines-key-redo');
    expect(draft(ref)).toBe('x+');
    await keys('2');
    expect(draft(ref)).toBe('x+2');
    expect(screen.getByTestId('lines-key-redo')).toBeDisabled();
    // The history is not part of the reported snapshot.
    expect(ref.current?.getStateSnapshot()).not.toHaveProperty('past');
  });

  it('keeps at most 50 states', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    for (let i = 0; i < 55; i += 1) {
      await keys('1');
    }
    for (let i = 0; i < 55; i += 1) {
      await tap('lines-key-undo');
    }
    expect(draft(ref)).toBe('11111');
  });

  it('a wrap outlines the wrapped part for about 0.8 s', async () => {
    jest.useFakeTimers();
    try {
      await render(<LinesCard spec={spec} />);
      await keys('2', 'x', 'widen', 'widen', 'frac');
      expect(screen.getByTestId('editor-flash')).toBeOnTheScreen();
      await act(() => jest.advanceTimersByTime(900));
      expect(screen.queryByTestId('editor-flash')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('with reduce motion the outline does not blink: it stays until the next key', async () => {
    const spy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    jest.useFakeTimers();
    try {
      await render(<LinesCard spec={spec} />);
      await keys('x', 'widen', 'group');
      await act(() => jest.advanceTimersByTime(2000));
      expect(screen.getByTestId('editor-flash')).toBeOnTheScreen();
      await keys('1');
      expect(screen.queryByTestId('editor-flash')).toBeNull();
    } finally {
      jest.useRealTimers();
      spy.mockRestore();
    }
  });

  it('widen shows the selection; a tap on a symbol puts the cursor after it', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    await keys('x', '+', '1', 'widen');
    expect(screen.getByTestId('editor-selection')).toBeOnTheScreen();
    await keys('right');
    expect(screen.queryByTestId('editor-selection')).toBeNull();
    // Tap the x (first symbol): typing goes right after it.
    await fireEvent.press(screen.getAllByTestId('editor-sym')[0]!);
    await keys('2');
    expect(draft(ref)).toBe('x2+1');
  });

  it('the arrow row and the tools row hold all the moves; the x key is the italic variable', async () => {
    await render(<LinesCard spec={spec} />);
    for (const k of [
      'left',
      'up',
      'down',
      'right',
      'back',
      'undo',
      'redo',
      'widen',
    ]) {
      expect(screen.getByTestId(`lines-key-${k}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('lines-key-x')).toHaveTextContent('x');
    expect(screen.getByTestId('lines-key-*')).toHaveTextContent('×');
  });
});

describe('LinesCard: getting back after a structural change', () => {
  const editorOf = (ref: React.RefObject<ComponentHandle | null>) =>
    (
      ref.current?.getStateSnapshot() as {
        draft: string;
        editor: { cursor: unknown; sel?: unknown };
      }
    ).editor;
  const draft = (ref: React.RefObject<ComponentHandle | null>) =>
    (ref.current?.getStateSnapshot() as { draft: string }).draft;

  it('the hand-test case: ⌫ in the empty denominator gives the line back', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    await keys('1', '+', 'x', '+', 'widen', 'frac');
    expect(draft(ref)).toBe('1+((x)/())+');
    await keys('back');
    expect(draft(ref)).toBe('1+x+');
  });

  it('the chip names the change; a tap restores the exact state before the wrap', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    await keys('1', '+', 'x', '+', 'widen');
    const before = editorOf(ref);
    await keys('frac');
    expect(screen.getByTestId('lines-undo-chip')).toHaveTextContent(
      /تزاد كسر.*تراجع/,
    );
    await tap('lines-undo-chip');
    expect(draft(ref)).toBe('1+x+');
    expect(editorOf(ref)).toEqual(before); // cursor and selection included
    expect(screen.queryByTestId('lines-undo-chip')).toBeNull();
  });

  it('the undo key restores it exactly too', async () => {
    const ref = createRef<ComponentHandle>();
    await render(<LinesCard spec={spec} ref={ref} />);
    await keys('e', 'pow', 'x', 'right', 'widen');
    const before = editorOf(ref);
    await keys('group');
    await tap('lines-key-undo');
    expect(editorOf(ref)).toEqual(before);
  });

  it('the chip goes with the next key, or after about 4 s', async () => {
    jest.useFakeTimers();
    try {
      await render(<LinesCard spec={spec} />);
      await keys('x', 'frac');
      expect(screen.getByTestId('lines-undo-chip')).toBeOnTheScreen();
      await keys('2');
      expect(screen.queryByTestId('lines-undo-chip')).toBeNull();
      await keys('back', 'back');
      expect(screen.getByTestId('lines-undo-chip')).toHaveTextContent(
        /تنحّى الكسر/,
      );
      await act(() => jest.advanceTimersByTime(4100));
      expect(screen.queryByTestId('lines-undo-chip')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('the undo key is named "تراجع"', async () => {
    await render(<LinesCard spec={spec} />);
    expect(screen.getByTestId('lines-key-undo')).toHaveTextContent(/تراجع/);
  });
});

describe('LinesCard: copy the previous line', () => {
  const draft = (ref: React.RefObject<ComponentHandle | null>) =>
    (ref.current?.getStateSnapshot() as { draft: string }).draft;

  it('copies the start expression (no "f(−x) =") as editable math, cursor at the end; logged as an input', async () => {
    const ref = createRef<ComponentHandle>();
    const onInput = jest.fn();
    await render(<LinesCard spec={spec} ref={ref} onInput={onInput} />);
    await tap('lines-copy');
    expect(draft(ref)).toBe('((e^(-x))/(1+e^(-2x)))');
    expect(onInput).toHaveBeenCalledWith('line_copied', { from: 'start' });
    // Shown only while the editor is empty.
    expect(screen.queryByTestId('lines-copy')).toBeNull();
    // Cursor at the end: a key types after the copied fraction.
    await keys('+');
    expect(draft(ref)).toBe('((e^(-x))/(1+e^(-2x)))+');
    // Undoable.
    await tap('lines-key-undo');
    await tap('lines-key-undo');
    expect(draft(ref)).toBe('');
  });

  it('an unchanged copy is not a new line: "same line", neither right nor wrong', async () => {
    const onLine = jest.fn();
    await render(<LinesCard spec={spec} onLine={onLine} />);
    await tap('lines-copy');
    await tap('lines-check');
    expect(screen.getByTestId('lines-unchanged')).toHaveTextContent(
      /نفس السطر/,
    );
    expect(onLine.mock.calls[0]?.[2]).toEqual({ kind: 'unchanged' });
    expect(screen.queryByTestId('lines-line-1')).toBeNull();
    expect(screen.queryByTestId('lines-wrong')).toBeNull();
    // Changing something clears the note.
    await keys('back');
    expect(screen.queryByTestId('lines-unchanged')).toBeNull();
  });
});
