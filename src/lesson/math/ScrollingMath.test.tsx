import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';

import { CATALOG } from '../../app/exercises';
import type { Rich } from '../../content/schema';
import { RichView } from '../feed/RichView';
import { ScrollingMath } from './ScrollingMath';

// 2.a's sum prompt: the formula wider than a phone card (D5).
const ex2 = CATALOG.find(e => e.id === 'bac2022c-ex2')?.result;
const sumStep = (ex2?.ok ? ex2.loaded.exercise.parts : [])
  .flatMap(p => p.groups.flatMap(g => g.steps))
  .find(st => st.id === 'sum');
const sumPrompt: Rich =
  sumStep && 'prompt' in sumStep && sumStep.prompt ? sumStep.prompt : {};

describe('a formula wider than its card scrolls sideways (LinesCard line pattern)', () => {
  it('the 2.a sum prompt renders its formula inside a horizontal LTR scroll', async () => {
    expect(sumPrompt.math).toBe(
      'p(X = -2) + p(X = -1) + p(X = 0) + p(X = 2) = ?',
    );
    await render(<RichView rich={sumPrompt} testID="sum" />);
    const scroll = screen.getByTestId('sum-math-scroll');
    expect(scroll.props.horizontal).toBe(true);
    expect(scroll.props.contentContainerStyle).toMatchObject({
      direction: 'ltr',
    });
    expect(within(scroll).getByTestId('sum-math')).toBeOnTheScreen();
  });

  it('scrolls only when the formula is wider than its box (a short one never takes the swipe)', async () => {
    await render(<ScrollingMath latex="x = 1" testID="m" />);
    const scroll = () => screen.getByTestId('m-scroll');
    expect(scroll().props.scrollEnabled).toBe(false);
    await fireEvent(scroll(), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 40 } },
    });
    await fireEvent(scroll(), 'contentSizeChange', 120, 40);
    expect(scroll().props.scrollEnabled).toBe(false);
    await fireEvent(scroll(), 'contentSizeChange', 520, 40);
    expect(scroll().props.scrollEnabled).toBe(true);
    expect(screen.getByTestId('m')).toBeOnTheScreen();
  });

  it('off inside chips and option buttons (no scroll inside a scroll or a button)', async () => {
    await render(
      <RichView rich={sumPrompt} mathScroll={false} testID="chip" />,
    );
    expect(screen.getByTestId('chip-math')).toBeOnTheScreen();
    expect(screen.queryByTestId('chip-math-scroll')).toBeNull();
  });
});
