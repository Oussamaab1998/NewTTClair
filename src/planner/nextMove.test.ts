/**
 * E2 (round 3, 2026-10-22): after an attempt, one decision: move on, repeat
 * (a transfer or, after a reveal, a fresh variant) or step back (a
 * prerequisite). Thresholds and hard caps in config, so no loop is possible.
 */
import { THRESHOLDS } from '../state/config';
import { OUTCOME_CLASSES, type OutcomeClass } from '../state/outcomes';
import { nextMove, type NextMoveInput } from './nextMove';

const base: NextMoveInput = {
  outcome: 'first_try',
  skills: ['counting-pairs'],
  skillShaky: false,
  sessionOutcomes: {},
  moves: { repeat: {}, stepBack: {}, question: 0 },
  available: { repeat: true, stepBack: true },
};

describe('nextMove: the table', () => {
  it.each<[OutcomeClass, boolean, string]>([
    ['first_try', false, 'move_on'],
    ['transfer_ok', false, 'move_on'],
    ['after_retry', false, 'move_on'],
    ['after_retry', true, 'repeat'],
    ['after_hint', false, 'repeat'],
    ['after_detour', false, 'repeat'],
    ['guessed', false, 'repeat'],
    ['revealed', false, 'repeat'],
    ['transfer_fail', false, 'step_back'],
  ])('%s (skill shaky: %s) → %s', (outcome, skillShaky, move) => {
    expect(nextMove({ ...base, outcome, skillShaky })).toMatchObject({
      outcome,
      wanted: move,
      move,
    });
  });

  it('a first try with no reasoning shown (lines: the goal written at once) repeats with the transfer (2026-10-18 rule)', () => {
    expect(
      nextMove({ ...base, outcome: 'first_try', jumped: true }),
    ).toMatchObject({
      outcome: 'first_try',
      wanted: 'repeat',
      move: 'repeat',
    });
  });

  it('a revealed fresh variant: move on (D2), never a second variant or a step back', () => {
    expect(
      nextMove({ ...base, outcome: 'revealed', revealedWasFresh: true }),
    ).toMatchObject({ wanted: 'move_on', move: 'move_on' });
  });

  it('a transfer failing a second time on the skill in the session (revealed after a failed one): step back', () => {
    const revealedTransfer = {
      ...base,
      outcome: 'revealed' as const,
      transfer: true,
    };
    expect(nextMove(revealedTransfer)).toMatchObject({ wanted: 'repeat' });
    expect(
      nextMove({
        ...revealedTransfer,
        transferFailures: { 'counting-pairs': 1 },
      }),
    ).toMatchObject({ wanted: 'step_back', move: 'step_back' });
    // A main step revealed is not a transfer: still a repeat.
    expect(
      nextMove({
        ...base,
        outcome: 'revealed',
        transferFailures: { 'counting-pairs': 1 },
      }),
    ).toMatchObject({ wanted: 'repeat' });
  });
});

describe('nextMove: caps stop a move, and say which one', () => {
  it(`repeat: ${THRESHOLDS.repeatPerSkillPerSession} per skill per session`, () => {
    expect(
      nextMove({
        ...base,
        outcome: 'after_hint',
        moves: {
          ...base.moves,
          repeat: { 'counting-pairs': THRESHOLDS.repeatPerSkillPerSession },
        },
      }),
    ).toEqual({
      outcome: 'after_hint',
      wanted: 'repeat',
      move: 'move_on',
      stoppedBy: 'repeatPerSkillPerSession',
    });
  });

  it(`step back: ${THRESHOLDS.stepBackPerSkillPerSession} per skill per session`, () => {
    expect(
      nextMove({
        ...base,
        outcome: 'transfer_fail',
        moves: {
          ...base.moves,
          stepBack: { 'counting-pairs': THRESHOLDS.stepBackPerSkillPerSession },
        },
      }),
    ).toMatchObject({
      move: 'move_on',
      stoppedBy: 'stepBackPerSkillPerSession',
    });
  });

  it(`${THRESHOLDS.movesPerQuestion} moves per question`, () => {
    expect(
      nextMove({
        ...base,
        outcome: 'guessed',
        moves: { ...base.moves, question: THRESHOLDS.movesPerQuestion },
      }),
    ).toMatchObject({ move: 'move_on', stoppedBy: 'movesPerQuestion' });
  });

  it('nothing authored to repeat or step back with: move on, stopped by no_content', () => {
    expect(
      nextMove({
        ...base,
        outcome: 'after_hint',
        available: { repeat: false, stepBack: true },
      }),
    ).toMatchObject({ move: 'move_on', stoppedBy: 'no_content' });
  });
});

describe('nextMove: no loop (property test)', () => {
  it('200 seeded random sequences of outcomes always end in at most movesPerQuestion + 1 attempts', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let run = 0; run < 200; run += 1) {
      const input: NextMoveInput = {
        ...base,
        moves: { repeat: {}, stepBack: {}, question: 0 },
        sessionOutcomes: {},
      };
      let attempts = 0;
      for (;;) {
        attempts += 1;
        const outcome =
          OUTCOME_CLASSES[Math.floor(rand() * OUTCOME_CLASSES.length)]!;
        const d = nextMove({ ...input, outcome, skillShaky: rand() < 0.5 });
        if (d.move === 'move_on') {
          break;
        }
        const skill = 'counting-pairs';
        input.moves.question += 1;
        if (d.move === 'repeat') {
          input.moves.repeat[skill] = (input.moves.repeat[skill] ?? 0) + 1;
        } else {
          input.moves.stepBack[skill] = (input.moves.stepBack[skill] ?? 0) + 1;
        }
        input.sessionOutcomes[skill] = [
          ...(input.sessionOutcomes[skill] ?? []),
          outcome,
        ];
        expect(attempts).toBeLessThanOrEqual(THRESHOLDS.movesPerQuestion + 1);
      }
      expect(attempts).toBeLessThanOrEqual(THRESHOLDS.movesPerQuestion + 1);
    }
  });
});
