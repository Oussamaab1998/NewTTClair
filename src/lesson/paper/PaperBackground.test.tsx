import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../i18n';
import { LessonScreen } from '../../app/screens/LessonScreen';
import { fixedClock } from '../../telemetry/log';
import { theme } from '../../theme';
import { PaperBackground, paperLines } from './PaperBackground';

jest.mock('../../app/paperStyle', () => ({ paperStyle: () => 'grid' }));

describe('paper background (DESIGN.md §6)', () => {
  it('the grid is the default; flat (the fallback) draws nothing', async () => {
    expect(theme.layout.paperStyle).toBe('grid');
    await render(<PaperBackground style="flat" />);
    expect(screen.queryByTestId('paper-bg')).toBeNull();
  });

  it('grid: 22 pt squares, 1 pt lines from the edge (mockups); ruled: rows every 28 pt only', () => {
    const size = { width: 402, height: 600 };
    const grid = paperLines('grid', size);
    const rows = grid.filter(r => r.width === 402);
    const columns = grid.filter(r => r.height === 600);
    expect(rows.map(r => r.y).slice(0, 3)).toEqual([0, 22, 44]);
    expect(columns.map(r => r.x).slice(0, 3)).toEqual([0, 22, 44]);
    expect(columns).toHaveLength(Math.floor(402 / 22) + 1);
    expect(grid.every(r => Math.min(r.width, r.height) === 1)).toBe(true);
    const ruled = paperLines('ruled', size);
    expect(ruled.every(r => r.x === 0 && r.width === 402)).toBe(true);
    expect(ruled.map(r => r.y).slice(0, 2)).toEqual([0, 28]);
  });

  it('is drawn once: feed updates never re-render it', async () => {
    await render(
      <GestureHandlerRootView>
        <LessonScreen initialPart="1b" clock={fixedClock()} llm={null} />
      </GestureHandlerRootView>,
    );
    await fireEvent(screen.getByTestId('paper-bg'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 700 } },
    });
    const drawn = screen.getByTestId('paper-bg').props;
    const itemsBefore = screen.getAllByTestId(/^feed-item-/).length;
    await fireEvent.press(screen.getByTestId('option-one')); // a wrong answer
    expect(screen.getAllByTestId(/^feed-item-/).length).toBeGreaterThan(
      itemsBefore,
    );
    // Same props object: React bailed out, the lines were not drawn again.
    expect(screen.getByTestId('paper-bg').props).toBe(drawn);
  });
});
