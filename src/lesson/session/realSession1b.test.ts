import { playRealSession1b } from './fixtures/realSession1b';

/**
 * Regression: the product owner's real 1.b session (2026-10-22), replayed
 * as a scripted student through the current rules. "Tutor intelligence 1"
 * changes these decisions step by step; each change is deliberate and
 * listed in docs/PROGRESS.md.
 */
const decisionsByAction = () =>
  playRealSession1b().rows.map(r => [r.on, r.action, r.decisions]);

describe('real 1.b session (regression)', () => {
  it('the rules decide as listed', () => {
    expect(decisionsByAction()).toEqual([
      ['1b/s3', 'answer none', ['rule.next_step -> continue']],
      ['1b/s5', 'hint', []],
      ['1b/s5', 'answer 3', ['rule.correct_after_help -> self_report']],
      [
        'card self_report',
        'card self_report: guessed',
        ['rule.transfer_after_self_report -> variant tr-1b-s5-noneg'],
      ],
      // C3: 4 matches two wrong procedures (balls, opposite event): a probe
      // card, and the planner waits for it (was rule.first_wrong -> continue).
      // The real student acted next ("not sure"), which skips the card.
      ['var:tr-1b-s5-noneg', 'answer 4', []],
      // B1: "not sure" on the transfer opens 1b/s5's deep dive (was hint 1).
      [
        'var:tr-1b-s5-noneg',
        'not_sure',
        ['rule.not_sure.deep_dive -> deep_dive pairs_listing'],
      ],
      ['dd:pairs_listing', 'answer 3', ['rule.detour_done -> continue']],
      [
        'var:tr-1b-s5-noneg',
        'answer 5',
        ['rule.struggle_clarify -> ask_clarify'],
      ],
      // B1: "counting" reaches a counting activity of 1b/s5 (was hint 2).
      [
        'card clarify',
        'card clarify: counting',
        ['rule.clarify.counting -> variant alt-1b-s5-pick'],
      ],
      [
        'var:alt-1b-s5-pick',
        'component: right',
        ['rule.detour_done -> continue'],
      ],
      // B1: the escalation uses 1b/s5's simpler twins before a prerequisite.
      [
        'var:tr-1b-s5-noneg',
        'not_sure',
        ['rule.struggle_escalate -> variant sim-pairs-1'],
      ],
      ['var:sim-pairs-1', 'answer 6', ['rule.detour_done -> continue']],
      // Cap exemption (2026-10-22): past the 3-detour cap, one step back to
      // a prerequisite (once per skill) is still allowed (was: teacher note).
      [
        'var:tr-1b-s5-noneg',
        'answer 0',
        ['rule.struggle_escalate -> variant pre-simultaneous'],
      ],
      ['var:pre-simultaneous', 'answer same', ['rule.detour_done -> continue']],
      // Now at the cap and the step-back used. B4 (round 2): the transfer's
      // guided walk-through, the teacher note queued silently (was the
      // teacher-note card); the scripted student reads its 3 lines.
      [
        'var:tr-1b-s5-noneg',
        'answer 4',
        ['rule.struggle_escalate -> walkthrough'],
      ],
      ['walkthrough var:tr-1b-s5-noneg', 'walkthrough_next', []],
      ['walkthrough var:tr-1b-s5-noneg', 'walkthrough_next', []],
      // Reveal unlock (2026-10-22): 4 detours closed on the transfer (≥ 2),
      // so "reveal" is allowed with 1 of 2 hints used (was refused, rule 6).
      // D2 (round 2): the revealed transfer is followed by a fresh variant on
      // a new urn (was: straight on to s7); the scripted student answers it.
      [
        'var:tr-1b-s5-noneg',
        'reveal',
        ['rule.after_reveal.fresh -> variant tr-1b-s5-fresh'],
      ],
      ['var:tr-1b-s5-fresh', 'answer 15', ['rule.detour_done -> continue']],
      [
        '1b/s7',
        'answer p3_5',
        ['rule.first_wrong.repair -> variant alt-1b-s8-bar'],
      ],
      ['card repair', 'card repair: yes', []],
      ['var:alt-1b-s8-bar', 'answer 3', ['rule.detour_done -> continue']],
      ['1b/s7', 'answer p3_10', ['rule.next_step -> continue']],
      ['1b/s8', 'answer 7/10', ['rule.next_step -> continue']],
    ]);
  });

  it('C3: 4 and 5 at the transfer are diagnosed as counting balls; "counting" reaches a counting activity', () => {
    const { events, rows } = playRealSession1b();
    const onTransfer = events.filter(
      (e): e is Extract<typeof e, { t: 'answer' }> =>
        e.t === 'answer' && e.stepId === 'var:tr-1b-s5-noneg' && !e.correct,
    );
    expect(onTransfer.slice(0, 2)).toMatchObject([
      {
        value: '4',
        misconceptionId: 'counts_balls_not_pairs',
        inferredBy: 'procedure',
        candidates: ['counts_balls_not_pairs', 'confuses_event_and_complement'],
      },
      {
        value: '5',
        misconceptionId: 'counts_balls_not_pairs',
        inferredBy: 'procedure',
        candidates: ['counts_balls_not_pairs'],
      },
    ]);
    // The probe card was shown once, then skipped when the student acted.
    expect(events.filter(e => e.t === 'probe')).toMatchObject([
      { value: '4', choice: null, movedOn: true },
    ]);
    const counting = rows.find(r => r.action === 'card clarify: counting');
    expect(counting?.decisions).toEqual([
      'rule.clarify.counting -> variant alt-1b-s5-pick',
    ]);
  });
});
