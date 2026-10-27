/**
 * Runtime view model of the lesson feed. Content blocks (src/content/schema.ts)
 * are turned into feed items; the feed is append-only except for the active
 * question card, which always stays last and changes status.
 */
import type { ComponentSpec, JsonObject } from '../../components/contract';
import type { Asks, Rich, VariantKind } from '../../content/schema';
import type { Experiment } from '../../engine/calls';
import type { Decision, Trigger } from '../../planner/schema';
import type { EventDraft } from '../../telemetry/events';

export type { EventDraft };

/** Localized UI messages a feed item can show (keys under `lesson.` in i18n). */
export type UiMessage =
  | 'correct'
  | 'wrong'
  | 'invalidInput'
  | 'notSure'
  | 'ladderEnd'
  | 'revealed'
  | 'noCannedAnswer'
  | 'noCannedAnswerField'
  | 'afterRevealReason'
  | 'deepDiveTitle'
  | 'returnToQuestion'
  | 'askMode.explain'
  | 'askMode.why'
  | 'askMode.example'
  | 'componentFallback'
  | 'writeupTitle'
  | 'done'
  | 'changeMethod'
  | 'simpler'
  | 'teacherNoteSaved'
  | 'compressOn'
  | 'clarify.counting'
  | 'clarify.why'
  | 'clarify.link'
  | 'selfReport.understood'
  | 'selfReport.guessed'
  | 'selfReport.dismissed'
  /** After a help request: what happens now (help chips, reviewed: false). */
  | 'helpReason.alternative'
  | 'helpReason.deepDive'
  | 'helpReason.simpler'
  | 'helpReason.prerequisite'
  | 'helpReason.hint'
  | 'helpReason.reveal';

export type AskMode = 'explain' | 'why' | 'example';
export type SkipReason = 'knows_it' | 'not_now';

/** Where an asked step lives: main path, deep-dive mini question, or an authored variant. */
export type AskRef =
  | { scope: 'main'; questionId: string; stepId: string }
  | { scope: 'mini'; deepDiveId: string }
  | { scope: 'variant'; variantId: string };

/** Small cards the planner adds; the student answers them with one tap. */
export type CardPurpose =
  | 'clarify'
  | 'self_report'
  | 'compress'
  | 'repair'
  | 'teacher_note'
  /** C3: which wrong procedure gave the typed value (choices: misconception ids + dismissed). */
  | 'probe'
  /** A long-press ask with no verified answer: the next hint or the deep dive (round 1). */
  | 'ask_next';

export type RequestKind = 'change_method' | 'simpler';

/** Set on events caused by a planner decision. */
export interface Reaction {
  reactionId: string;
  representation: string;
}

export type QuestionStatus = 'active' | 'paused' | 'done';

export type StudentContent =
  | { kind: 'rich'; rich: Rich }
  | { kind: 'typed'; raw: string }
  | { kind: 'message'; message: UiMessage }
  /** A long-pressed block: its text, and its formula rendered apart (never raw LaTeX). */
  | { kind: 'quote'; mode: AskMode; quoted: string; math?: string }
  | { kind: 'text'; text: string };

/** docs/FEEDBACK_AND_TRUST.md trust labels; never "verified". */
export type TrustLabel =
  | 'lesson_reviewed'
  | 'lesson_unreviewed'
  | 'ai_generated'
  | 'engine_computed';

interface ItemBase {
  key: string;
  /** 0 on the main path, 1-3 inside deep dives. */
  depth: number;
  /**
   * Set when the item is not plain lesson content: engine values (numeric check,
   * revealed answer, filled law cells) or LLM output. Unset = the lesson's own
   * label (reviewed or not), derived in the UI from the content.
   */
  trust?: 'ai_generated' | 'engine_computed';
  /** AI items: the LLM request that produced them (reports point to it). */
  llmRequestId?: string;
}

export type FeedItem = ItemBase &
  (
    | {
        kind: 'tutor';
        rich: Rich;
        blockId?: string;
        /** Long-press opens the ask menu (verified answers in `asks`, else a canned fallback). */
        longPress: boolean;
        asks?: Asks;
      }
    | { kind: 'statement'; rich: Rich }
    | { kind: 'math'; latex: string; blockId?: string }
    | { kind: 'student'; content: StudentContent }
    | {
        kind: 'feedback';
        tone: 'success' | 'warning' | 'danger' | 'info';
        message?: UiMessage;
        rich?: Rich;
      }
    | { kind: 'hint'; level: number; total: number; rich: Rich }
    | { kind: 'answer'; rich: Rich }
    | { kind: 'ask_answer'; parts: Rich[] }
    | {
        kind: 'question';
        ref: AskRef;
        status: QuestionStatus;
        /** Wrong attempts so far (drives the card's readonly marks). */
        attempts: number;
        /** "Not sure" taps on this card (help chips show after one). */
        notSure?: number;
        /** Help chips wait for a struggle signal beyond this count (wrongs + "not sure"): set when the repair offer was declined. */
        chipsHold?: number;
        /** Variant step with 2+ closed detours: reveal is offered before the ladder ends. */
        revealUnlocked?: boolean;
        /** D2: a fresh variant after a reveal: a quiet «موش توّا» exit (closes it, no failure). */
        freshExit?: boolean;
        hintLevel: number;
        hintCount: number;
        /** Set when done: what the student chose/typed and whether it was right. */
        result?: { optionId?: string; raw?: string; correct: boolean };
        canGoBack: boolean;
        /** Task component answered by "show the answer" (end of the ladder). */
        revealed?: boolean;
        /** Optional task the student skipped. */
        skipped?: boolean;
        /** Optional task: the card offers "skip". */
        optional?: boolean;
        /** Lines steps: accepted lines (the card's notebook, readonly and replay). */
        lines?: string[];
      }
    | {
        /** A visual component (tasks are question cards). */
        kind: 'component';
        spec: ComponentSpec;
        blockId: string;
        /** Event stepId for its interactions. */
        stepId: string;
        /** State supplied by the lesson (progressive LawBuilder: filled cells). */
        lessonState?: JsonObject;
        /** A newer copy was appended below; this one renders as one line. */
        superseded?: boolean;
        /** Variant intros with their own urn. */
        experiment?: Experiment;
      }
    | {
        kind: 'choice_card';
        purpose: CardPurpose;
        /** Choice ids; labels come from i18n (`lesson.card.<purpose>.<choice>`). */
        choices: string[];
        /** open; answered; closed (the student moved on without answering). */
        status: 'open' | 'answered' | 'closed';
        choice?: string;
        /** The lesson waits for this card (nothing else is active). */
        blocking: boolean;
        stepId: string;
        ruleId: string;
        variantId?: string;
        skillIds?: string[];
        misconceptionIds?: string[];
        /** Probe cards: the typed value they ask about. */
        value?: string;
      }
    | { kind: 'variant_start'; variantKind: VariantKind }
    | { kind: 'deep_dive_start'; deepDiveId: string }
    | { kind: 'return' }
    | { kind: 'component_fallback'; component: string }
    | { kind: 'writeup'; lines: string[] }
    /** B4: a guided walk-through, its lines revealed one tap at a time, then the card again. */
    | {
        kind: 'walkthrough';
        stepId: string;
        lines: Rich[];
        /** Lines revealed so far (1..lines.length). */
        shown: number;
        done: boolean;
      }
    | { kind: 'done' }
    /** UI only: a provisional answer may still change ("..."); never in the reducer's state. */
    | { kind: 'thinking' }
  );

export type FeedItemOf<K extends FeedItem['kind']> = Extract<
  FeedItem,
  { kind: K }
>;

export interface Frame {
  ref: AskRef;
  stepKey: string;
  /** Event `stepId` (main step id, or `dd:<id>` for mini questions). */
  stepId: string;
  depth: number;
  attempts: number;
  hintLevel: number;
  /** Feed key of the current card for this step. */
  cardKey: string;
  /** Monotonic ms when the current card was shown (for durationMs). */
  shownAt: number;
  /** The planner decision that opened this detour (deep dive mini or variant). */
  reaction?: Reaction;
  /** Last wrong value as typed (or the chosen option's value): numeric checks. */
  lastRaw?: string;
  /** Lines steps: the lines accepted so far. */
  lines?: string[];
  /** Misconceptions whose message this card already showed (each once). */
  misconceptionsShown?: string[];
  /** "Not sure" taps on this step (kept when the card is shown again). */
  notSures?: number;
  /** See the question item's `chipsHold`. */
  chipsHold?: number;
  /** Detours (variants, deep dives) opened from this frame and closed after the student acted in them. */
  detoursClosed?: number;
  /** D2: a fresh variant opened after a reveal (its card has a quiet exit). */
  fresh?: boolean;
  /** C3: this step already showed its probe card (at most one per step). */
  probed?: boolean;
  /** Detour frames: the student acted here (answer, tap, hint, "not sure", request, ask). */
  acted?: boolean;
}

export interface LessonState {
  questionId: string;
  items: FeedItem[];
  /** stack[0] is the main-path step; deeper entries are deep-dive minis. */
  stack: Frame[];
  cursor: { group: number; step: number };
  shownDeepDives: string[];
  shownVariants: string[];
  /** Blocks a long-press ask found no verified answer for (the dead-end line is shown once per block). */
  deadEndBlocks?: string[];
  seq: number;
  finished: boolean;
  /** A decision point waits for the planner (`apply_plan`). */
  pending?: { trigger: Trigger; questionId: string; stepId: string };
  /** The student accepted "compress": explanation blocks are skipped until the next struggle. */
  compressed: boolean;
  /** A main-path visual (PredictReveal) waits for one tap before the lesson goes on. */
  gate?: { stepId: string };
}

export type AnswerValue =
  | { optionId: string }
  | { raw: string }
  /** One typed line of a lines step (safe-parser syntax). */
  | { line: string };

export type LessonAction =
  | { type: 'answer'; value: AnswerValue; keys?: string[]; at: number }
  | { type: 'not_sure'; at: number }
  | { type: 'hint'; at: number }
  | { type: 'reveal'; at: number }
  | { type: 'leave_deep_dive'; at: number }
  | {
      type: 'ask_longpress';
      blockId: string;
      mode: AskMode;
      /** The block's text (no formula). */
      quoted: string;
      /** The block's formula, if any (LaTeX; rendered as math). */
      quotedMath?: string;
      /** Mounted components' state, collected by the UI and capped (feed/snapshots.ts). */
      components?: JsonObject;
      at: number;
    }
  | {
      type: 'ask_field';
      chipId?: string;
      text?: string;
      components?: JsonObject;
      at: number;
    }
  | { type: 'skip'; reason: SkipReason; at: number }
  /** The gating component of this step got its tap (ungraded). */
  | { type: 'gate_passed'; stepId: string; at: number }
  /** A tap inside a detour's component (logged as a UI event; marks the detour as acted in). */
  | { type: 'detour_acted'; at: number }
  /** B4: «التالي» on the open walk-through. */
  | { type: 'walkthrough_next'; at: number }
  /** Internal (orchestrate `settleProbe`): the open probe card's answers would all lead to the same action. */
  | { type: 'probe_drop'; at: number }
  | {
      type: 'request';
      kind: RequestKind;
      /** Where the tap came from (help chips, 2026-10-22). */
      via?: 'menu' | 'chip' | 'choice';
      at: number;
    }
  /** A tap on a planner card (the latest open card of that purpose). */
  | { type: 'card_choice'; purpose: CardPurpose; choice: string; at: number }
  /** The planner's decision for the pending decision point. */
  | {
      type: 'apply_plan';
      decision: Decision;
      /** Provisional flow: what the student ended up seeing. */
      shownSource?: 'rules' | 'llm';
      at: number;
    }
  | {
      /** A task component reported a result (EventPicker submit, LawBuilder complete). */
      type: 'component_result';
      correct: boolean;
      details: JsonObject;
      misconceptionHints?: string[];
      at: number;
    };

export interface StepResult {
  state: LessonState;
  events: EventDraft[];
}
