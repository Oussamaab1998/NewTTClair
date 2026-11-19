/** «Calcule» with the real worksheet: a line typed on the lessons' keypad is judged. */
import '../../../i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { rulePlan } from '../../../formulas/session';
import { ruleById, THEMES } from '../../../formulas/themes';
import { visibleRules } from '../../../formulas/visible';
import { DrillSession } from './DrillSession';

const pool = visibleRules(THEMES, '4s', 'mathematiques').map(v => v.rule);
const rule = ruleById('deriv.quotient')!;

it('a line typed with the keys is judged and marked; the first answer is recorded', async () => {
  const calc = rulePlan(rule, pool, 3).find(p => p.kind === 'calc')!;
  const onAnswer = jest.fn();
  await render(
    <DrillSession
      mode="drill"
      title="S’entraîner"
      name={rule.name}
      plan={[calc]}
      rules={new Map([[rule.id, rule]])}
      pool={pool}
      onAnswer={onAnswer}
      onEnd={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  expect(screen.getByTestId('drill-calc')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('drill-worksheet-key-x'));
  await fireEvent.press(screen.getByTestId('drill-worksheet-submit'));
  expect(screen.getByText('✗ Ce n’est pas f′(x). Regarde la règle et refais le calcul.')).toBeTruthy();
  expect(screen.getByTestId('drill-worksheet-mark-w1')).toHaveTextContent('✗');
  expect(onAnswer).toHaveBeenCalledWith(rule.id, { kind: 'calc', verdict: 'wrong' });
  // He has not found it: no «Continuer» yet, «ما نعرفش» is there.
  expect(screen.queryByTestId('drill-continue')).toBeNull();
  expect(screen.getByTestId('drill-help')).toBeTruthy();
});
