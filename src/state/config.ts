/**
 * Every threshold used by derived state and the rules planner, in one place.
 *
 * UNTUNED GUESSES. None of these numbers comes from data: they are starting
 * points from docs/DATA.md §3, docs/PLANNER.md and docs/TUTOR_BEHAVIOR.md, to be
 * tuned with pilot logs (replay harness, teacher labels). Change them here only.
 */
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const THRESHOLDS = {
  // --- Skill status (DATA.md §3) -------------------------------------------
  /**
   * wrong + not_sure on one skill within one session -> "gap" (DATA.md: 2).
   * "gap" is a planner hypothesis, never shown to the student as a label.
   */
  gapSignalsPerSession: 2,
  /** One wrong (or not_sure) signal, or a guessed / helped success -> "shaky". */
  shakySignals: 1,
  /** "closed" needs a later clean transfer in a different session than the first one. */
  closedNeedsLaterSession: true,

  // --- Spaced return (nextReviewAt = lastSeen + delay) ------------------------
  reviewDelayMs: {
    gap: DAY,
    shaky: 2 * DAY,
    recovering: 3 * DAY,
    closed: 14 * DAY,
  },

  // --- Rules planner ----------------------------------------------------------
  /** Struggle signals on one step (wrong answers + not_sure together) before ask_clarify. */
  clarifyAfterStruggle: 3,
  /** "Not sure" this many times on one step also asks what is unclear. */
  clarifyAfterNotSure: 2,
  /** Clean answers in a row (first attempt, no help) before offering to compress. */
  cleanStreakForCompress: 3,
  /** A correct first answer faster than this is suspicious (possible guess). */
  fastAnswerMs: 1200,
  /** A correct first answer slower than this is suspicious (possible struggle). */
  slowAnswerMs: 3 * MINUTE,
  /** self_report cards per question at most ("occasional"). */
  selfReportsPerQuestion: 1,
  /** self_report cards per session at most (a session can span questions). */
  selfReportsPerSession: 2,
  /** Mini-example loop rounds before the prerequisite / teacher note (COMPONENT_CATALOG.md). */
  maxExampleRounds: 3,
  /** "Take me to something simpler": prerequisite levels below the original question. */
  maxPrerequisiteLevels: 2,
  /** Detours (deep dives, alternatives, twins, prerequisites; not transfers) per step, from any source (help chips, 2026-10-22). */
  maxDetoursPerStep: 3,
  /** D2: fresh variants opened after a reveal, per skill and session (hard cap). */
  freshAfterRevealPerSkillPerSession: 1,
  // E2 nextMove (round 3, 2026-10-22), untuned hard caps: no loop is possible.
  /** Repeats (a transfer or a fresh variant) per skill and session. */
  repeatPerSkillPerSession: 2,
  /** Step-backs (a prerequisite) per skill and session. */
  stepBackPerSkillPerSession: 1,
  /** Repeats and step-backs together, per question. */
  movesPerQuestion: 4,
  // Method lesson (D38, untuned): acts are reducer actions, keypad keys are not.
  /**
   * A question with no mistake, by method block id (the opening card is 0
   * acts): Q1 plan 1, read 1, total 1, favourable 3, the reason 1, result 1,
   * recipe 1 = 9. Q2 8, Q3a 10, Q3b 8 (set when each is authored). A block
   * not listed uses the default.
   */
  methodFastActs: { default: 8, m1: 9, m2: 8, m3a: 10, m3b: 8 } as Readonly<
    Record<string, number>
  >,
  /** One repair path, the accepting tap included. */
  methodRepairActs: 10,
  /** Worst case per question; at the cap no repair opens and the rest is shown. */
  methodActsPerQuestion: 30,
  /** Help chips: seconds without any action on the active card before they show. */
  helpChipsIdleMs: 20_000,
  /**
   * Idle alone shows the chips (product owner choice, off): by default idle
   * shows them only on a card that already had a wrong answer or a "not sure".
   */
  helpChipsIdleAlone: false,
} as const;

export type Thresholds = typeof THRESHOLDS;
