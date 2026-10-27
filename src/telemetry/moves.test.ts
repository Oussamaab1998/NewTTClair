import { playRealSession1b } from '../lesson/session/fixtures/realSession1b';
import { formatMoves } from './moves';

describe('dev panel: nextMove decisions and caps (E2)', () => {
  it('the real 1.b session: the last decisions and the caps used', () => {
    const { events } = playRealSession1b();
    expect(formatMoves(events)).toBe(
      'moves: transfer_ok→move_on · after_detour→move_on (no_content) · first_try→move_on · caps: repeat 2/2 · step back 0/1 · question 2/4',
    );
  });

  it('nothing yet', () => {
    expect(formatMoves([])).toBe(
      'moves: - · caps: repeat 0/2 · step back 0/1 · question 0/4',
    );
  });
});
