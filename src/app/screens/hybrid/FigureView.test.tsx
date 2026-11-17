import { render, screen } from '@testing-library/react-native';
import React from 'react';

import type { ComponentSpec } from '../../../components/contract';
import { FigureView } from './FigureView';

const mockDrawn = jest.fn();
jest.mock('../../../components/ComponentHost', () => ({
  ComponentHost: (p: { spec: unknown; mode: string }) => {
    mockDrawn(p.spec, p.mode);
    return null;
  },
}));

const spec = (p: string): ComponentSpec => ({
  component: 'ProbabilityTree',
  props: {
    branches: [
      { id: 'a', latex: 'A', p },
      { id: 'na', latex: '\\overline{A}', show: 'hidden' },
    ],
  },
});

describe('FigureView', () => {
  it('draws the figure read-only, and again only when its signature changes', async () => {
    const first = spec('2/3');
    const view = await render(
      <FigureView spec={first} signature="s1" testID="step-figure" />,
    );
    expect(screen.getByTestId('step-figure')).toBeOnTheScreen();
    expect(mockDrawn).toHaveBeenCalledTimes(1);
    expect(mockDrawn).toHaveBeenLastCalledWith(first, 'readonly');
    // The conductor state is copied on every act: an equal figure in a new
    // object (same signature) is not laid out again.
    await view.rerender(
      <FigureView spec={spec('2/3')} signature="s1" testID="step-figure" />,
    );
    expect(mockDrawn).toHaveBeenCalledTimes(1);
    // A value found: another signature, another picture.
    const next = spec('1/3');
    await view.rerender(
      <FigureView spec={next} signature="s2" testID="step-figure" />,
    );
    expect(mockDrawn).toHaveBeenCalledTimes(2);
    expect(mockDrawn).toHaveBeenLastCalledWith(next, 'readonly');
  });
});
