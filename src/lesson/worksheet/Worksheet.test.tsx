/**
 * The worksheet screen part: lines typed with its own keys are sent in the
 * engine's syntax; the page groups them by step; an earlier line is fixed
 * by a tap; scaffolds and tiles come only from what the caller passes.
 */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../i18n';
import i18n from '../../i18n';
import {
  emptyPage,
  fixLine,
  markLine,
  writeLine,
  type SheetStep,
} from './model';
import { buildScaffold, type Scaffold } from './scaffold';
import { buildTiles, type Tile } from './tiles';
import { studentLine } from './sampleLines';
import { Worksheet, type SubmitInfo } from './Worksheet';

const TOTAL: SheetStep = { id: 'total', label: { fr: 'cas possibles' } };
const SMALL = studentLine('L2', '5*4*3/(3*2*1)=10', 'credit');

/** A caller like the hybrid screen: it keeps the page and marks each line. */
function Page({
  onSubmit,
  scaffold = null,
  tiles = [],
}: {
  onSubmit: (raw: string, info: SubmitInfo) => void;
  scaffold?: Scaffold | null;
  tiles?: readonly Tile[];
}) {
  const [page, setPage] = useState(emptyPage);
  return (
    <Worksheet
      step={TOTAL}
      prompt={{ fr: 'Calcule le nombre de tirages.' }}
      lines={page.lines}
      tiles={tiles}
      scaffold={scaffold}
      onSubmit={(raw, info) => {
        onSubmit(raw, info);
        setPage(p => {
          const next = info.fixes
            ? fixLine(p, info.fixes, info.nodes)!.page
            : writeLine(p, TOTAL, info.nodes).page;
          const id = info.fixes ?? `w${p.next}`;
          return markLine(next, id, raw.endsWith('=120') ? 'right' : 'wrong');
        });
      }}
    />
  );
}

const keys = async (...ks: string[]) => {
  for (const k of ks) {
    await fireEvent.press(screen.getByTestId(`worksheet-key-${k}`));
  }
};
const submit = () => fireEvent.press(screen.getByTestId('worksheet-submit'));

beforeAll(() => i18n.changeLanguage('ar-TN'));

describe('Worksheet', () => {
  it('two lines like on paper: 10×9×8 = 720, then 720 ÷ (3×2×1) = 120', async () => {
    const onSubmit = jest.fn();
    await render(<Page onSubmit={onSubmit} />);
    await keys('1', '0', '*', '9', '*', '8', '=', '7', '2', '0');
    await submit();
    await keys('7', '2', '0', 'div', 'group', '3', '*', '2', '*', '1');
    await keys('close', '=', '1', '2', '0');
    await submit();
    expect(onSubmit.mock.calls.map(c => c[0])).toEqual([
      '10*9*8=720',
      '720/(3*2*1)=120',
    ]);
    expect(onSubmit.mock.calls[1]?.[1]).toMatchObject({ fixes: null });
    // The page: one step label, two numbered lines with their marks (shapes).
    expect(screen.getByTestId('worksheet-step-0')).toBeOnTheScreen();
    expect(screen.queryByTestId('worksheet-step-now')).toBeNull();
    expect(screen.getByTestId('worksheet-mark-w1')).toHaveTextContent('✗');
    expect(screen.getByTestId('worksheet-mark-w2')).toHaveTextContent('✓');
  });

  it('÷ after a product makes one fraction: the divisor is never read alone', async () => {
    const onSubmit = jest.fn();
    await render(<Page onSubmit={onSubmit} />);
    await keys(
      '9',
      '9',
      '0',
      'div',
      '3',
      '*',
      '2',
      '*',
      '1',
      '=',
      '1',
      '6',
      '5',
    );
    await submit();
    expect(onSubmit).toHaveBeenCalledWith('990/(3*2*1)=165', expect.anything());
  });

  it('an unreadable line is not sent: the issue is said and marked', async () => {
    const onSubmit = jest.fn();
    await render(<Page onSubmit={onSubmit} />);
    await keys('5', '+');
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('worksheet-issue')).toBeOnTheScreen();
    await keys('1');
    expect(screen.queryByTestId('worksheet-issue')).toBeNull();
  });

  it('a tap on an earlier line reopens it; the fix is sent with its id and the page keeps one line', async () => {
    const onSubmit = jest.fn();
    await render(<Page onSubmit={onSubmit} />);
    await keys('7', '2', '0', 'div', '6');
    await submit();
    await fireEvent.press(screen.getByTestId('worksheet-line-w1'));
    expect(screen.getByTestId('worksheet-fixing')).toBeOnTheScreen();
    await keys('=', '1', '2', '0');
    await submit();
    expect(onSubmit.mock.calls[1]).toEqual([
      '720/6=120',
      expect.objectContaining({ fixes: 'w1' }),
    ]);
    expect(screen.queryByTestId('worksheet-line-w2')).toBeNull();
    expect(screen.getByTestId('worksheet-mark-w1')).toHaveTextContent('✓');
    expect(screen.getByText(i18n.t('worksheet.fixed'))).toBeOnTheScreen();
    expect(screen.queryByTestId('worksheet-fixing')).toBeNull();
  });

  it('number tiles go in at the cursor', async () => {
    const onSubmit = jest.fn();
    const tiles = buildTiles(
      ['10'],
      [studentLine('L1', '10*9*8=720', 'credit')],
    );
    await render(<Page onSubmit={onSubmit} tiles={tiles} />);
    await fireEvent.press(screen.getByTestId('worksheet-tile-1'));
    await keys('div', '6', '=');
    await fireEvent.press(screen.getByTestId('worksheet-tile-0'));
    await keys('0');
    await submit();
    expect(onSubmit).toHaveBeenCalledWith('720/6=100', expect.anything());
  });

  it("level 3: his own line's shape with blanks, typed over", async () => {
    const onSubmit = jest.fn();
    await render(
      <Page onSubmit={onSubmit} scaffold={buildScaffold(SMALL, 3)} />,
    );
    expect(screen.getByTestId('worksheet-scaffold-same')).toBeOnTheScreen();
    expect(screen.getAllByTestId('editor-hole')).toHaveLength(7);
    await keys('1', '0', '*', '9', '*', '8', 'div', '3', '*', '2', '*', '1');
    await keys('=', '1', '2', '0');
    await submit();
    expect(onSubmit).toHaveBeenCalledWith(
      '10*9*8/(3*2*1)=120',
      expect.anything(),
    );
  });

  it('level 3 can be dropped: he writes his own way', async () => {
    await render(
      <Page onSubmit={jest.fn()} scaffold={buildScaffold(SMALL, 3)} />,
    );
    await fireEvent.press(screen.getByTestId('worksheet-scaffold-drop'));
    expect(screen.queryAllByTestId('editor-hole')).toHaveLength(0);
    expect(screen.queryByTestId('worksheet-scaffold-same')).toBeNull();
  });

  it('level 2 shows his line above an empty one; level 1 is a chip that shows it', async () => {
    const { rerender } = await render(
      <Page onSubmit={jest.fn()} scaffold={buildScaffold(SMALL, 2)} />,
    );
    expect(screen.getByTestId('worksheet-scaffold-yours')).toBeOnTheScreen();
    expect(screen.queryAllByTestId('editor-hole')).toHaveLength(0);
    await rerender(
      <Page onSubmit={jest.fn()} scaffold={buildScaffold(SMALL, 1)} />,
    );
    expect(screen.queryByTestId('worksheet-scaffold-yours')).toBeNull();
    await fireEvent.press(screen.getByTestId('worksheet-scaffold-chip'));
    expect(screen.getByTestId('worksheet-scaffold-yours')).toBeOnTheScreen();
  });

  it('counting keys write C(n, k) and factorials', async () => {
    const onSubmit = jest.fn();
    await render(
      <Worksheet
        step={TOTAL}
        prompt={null}
        lines={[]}
        tiles={[]}
        scaffold={null}
        onSubmit={onSubmit}
        counting
      />,
    );
    await keys('choose', '1', '0', 'right', '3', 'right', '=', '1', '2', '0');
    await submit();
    expect(onSubmit).toHaveBeenCalledWith('C(10,3)=120', expect.anything());
  });

  it('readonly: the page only, no keys', async () => {
    const page = writeLine(emptyPage(), TOTAL, [{ k: 'sym', v: '7' }]).page;
    await render(
      <Worksheet
        step={TOTAL}
        prompt={null}
        lines={page.lines}
        tiles={[]}
        scaffold={null}
        onSubmit={jest.fn()}
        readonly
      />,
    );
    expect(screen.getByTestId('worksheet-line-w1')).toBeOnTheScreen();
    expect(screen.queryByTestId('worksheet-submit')).toBeNull();
    expect(screen.queryByTestId('worksheet-key-1')).toBeNull();
  });
});
