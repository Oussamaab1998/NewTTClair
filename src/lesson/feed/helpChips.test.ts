import { THRESHOLDS } from '../../state/config';
import { helpChipsState, type HelpChipsInput } from './helpChips';

const base: HelpChipsInput = {
  active: true,
  scope: 'main',
  wrongs: 0,
  notSures: 0,
  idleMs: 0,
  targets: { changeMethod: true, simpler: true },
  offerOpen: false,
};

describe('help chips: when «غيّر الطريقة» / «حاجة أسهل» show under the active question', () => {
  it('hidden on a fresh card', () => {
    expect(helpChipsState(base).visible).toBe(false);
  });

  it('shown after a first wrong answer, or after "not sure", with the reason', () => {
    expect(helpChipsState({ ...base, wrongs: 1 })).toEqual({
      visible: true,
      reason: 'wrong',
      changeMethod: true,
      simpler: true,
    });
    expect(helpChipsState({ ...base, notSures: 1 })).toMatchObject({
      visible: true,
      reason: 'not_sure',
    });
  });

  it(`idle (${
    THRESHOLDS.helpChipsIdleMs / 1000
  } s) alone does not show them by default`, () => {
    expect(
      helpChipsState({ ...base, idleMs: THRESHOLDS.helpChipsIdleMs }).visible,
    ).toBe(false);
  });

  it('the idle-alone variant (config flag, off by default) shows them after the idle time', () => {
    const idle = { ...base, idleAlone: true };
    expect(
      helpChipsState({ ...idle, idleMs: THRESHOLDS.helpChipsIdleMs - 1 })
        .visible,
    ).toBe(false);
    expect(
      helpChipsState({ ...idle, idleMs: THRESHOLDS.helpChipsIdleMs }),
    ).toMatchObject({ visible: true, reason: 'idle' });
  });

  it('hidden while the repair offer is open (no duplicate), on minis, on readonly cards, without targets', () => {
    for (const o of [
      { offerOpen: true },
      { scope: 'mini' as const },
      { active: false },
      { targets: null },
      { targets: { changeMethod: false, simpler: false } },
    ]) {
      expect(helpChipsState({ ...base, wrongs: 1, ...o }).visible).toBe(false);
    }
  });

  it('each chip only for its own target', () => {
    expect(
      helpChipsState({
        ...base,
        wrongs: 1,
        targets: { changeMethod: false, simpler: true },
      }),
    ).toEqual({
      visible: true,
      reason: 'wrong',
      changeMethod: false,
      simpler: true,
    });
  });
});

describe('after a declined repair offer', () => {
  it('hidden until one more wrong answer or "not sure" on the step (they stay in "⋯")', () => {
    const declined = { ...base, wrongs: 1, hold: 1 };
    expect(helpChipsState(declined).visible).toBe(false);
    expect(helpChipsState({ ...declined, wrongs: 2 })).toMatchObject({
      visible: true,
      reason: 'wrong',
    });
    // The reason comes from the counts: the earlier wrong answer still names it.
    expect(helpChipsState({ ...declined, notSures: 1 }).visible).toBe(true);
  });
});
