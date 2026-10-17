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
  | 'selfReport.dismissed';

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
  | 'teacher_note';

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
  | { kind: 'quote'; mode: AskMode; quoted: string }
  | { kind: 'text'; text: string };

interface ItemBase {
  key: string;
  /** 0 on the main path, 1-3 inside deep dives. */
  depth: number;
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
      }
    | { kind: 'variant_start'; variantKind: VariantKind }
    | { kind: 'deep_dive_start'; deepDiveId: string }
    | { kind: 'return' }
    | { kind: 'component_fallback'; component: string }
    | { kind: 'writeup'; lines: string[] }
    | { kind: 'done' }
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
}

export interface LessonState {
  questionId: string;
  items: FeedItem[];
  /** stack[0] is the main-path step; deeper entries are deep-dive minis. */
  stack: Frame[];
  cursor: { group: number; step: number };
  shownDeepDives: string[];
  shownVariants: string[];
  seq: number;
  finished: boolean;
  /** A decision point waits for the planner (`apply_plan`). */
  pending?: { trigger: Trigger; questionId: string; stepId: string };
  /** The student accepted "compress": explanation blocks are skipped until the next struggle. */
  compressed: boolean;
}

export type AnswerValue = { optionId: string } | { raw: string };

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
      quoted: string;
      at: number;
    }
  | { type: 'ask_field'; chipId?: string; text?: string; at: number }
  | { type: 'skip'; reason: SkipReason; at: number }
  | { type: 'request'; kind: RequestKind; at: number }
  /** A tap on a planner card (the latest open card of that purpose). */
  | { type: 'card_choice'; purpose: CardPurpose; choice: string; at: number }
  /** The planner's decision for the pending decision point. */
  | { type: 'apply_plan'; decision: Decision; at: number }
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
