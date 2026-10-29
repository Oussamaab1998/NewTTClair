/**
 * Lesson state machine: a pure reducer from student actions to feed items and
 * event drafts. No React, no clock, no storage: the caller passes `at`
 * (monotonic ms) and stamps the events. Same actions => same feed, which is
 * what replay relies on (see replay.ts).
 *
 * The reducer shows authored content and applies decisions; it does not choose
 * reactions. At a decision point (wrong answer, "ما نعرفش", a detour ending, a
 * correct main answer, a request button, a card answer) it sets `pending`; the
 * planner (src/planner, via orchestrate.ts) decides, and `apply_plan` applies
 * the validated decision, logged as a `plan` event.
 *
 * Rules kept here (content and hard rules, not choices):
 * - Wrong answer: feedback from the option / known wrong value; the question stays active and last.
 * - Deep dives and variants nest (max depth 3) and end by re-asking the question below them.
 * - The answer is revealed only after the whole hint ladder (CLAUDE.md rule 6).
 * - Task components (EventPicker, LawBuilder) block the path like a question.
 */
import { add, equals } from '../../engine/rational';
import { fractionToLatex, parseNumeric } from '../../engine/format';
import { parseExpression, toLatex } from '../../engine/expression';
import { checkLine } from '../lines/check';
import { componentKind, isGate } from '../../components/registry';
import type { ComponentSpec, JsonObject } from '../../components/contract';
import {
  deepDiveContext,
  deepDiveRepresentation,
  isTaskStep,
  stepKey,
  variantContext,
  type AskedStep,
  type LoadedExercise,
  type ResolvedAnswer,
  type TaskStep,
} from '../../content/loader';
import type {
  Asks,
  Block,
  ClarifyChoice,
  Exercise,
  Question,
  Rich,
  Step,
  Variant,
} from '../../content/schema';
import type { Experiment } from '../../engine/calls';
import {
  buildMenu,
  rejectAction,
  validateDecision,
  type PlannerMenu,
} from '../../planner/planner';
import type { Action, Decision } from '../../planner/schema';
import { catalogFor, type Catalog } from '../../state/catalog';
import type {
  AskRef,
  CardPurpose,
  EventDraft,
  FeedItem,
  FeedItemOf,
  Frame,
  LessonAction,
  LessonState,
  Reaction,
  StepResult,
  UiMessage,
} from './types';
import { countsForProgress } from './progress';

export const MAX_DEPTH = 3;
/** A task mini question with this many wrong tries "did not help" (product owner, Phase 3). */
export const TASK_MINI_WRONG_TRIES_NOT_HELPED = 2;
const SHORT_TEXT = 500;
/** Same cap as the safe parser's input. */
const LINE_MAX = 200;

type DeepDive = Exercise['deepDives'][number];

/** A step that gets a card: a question, or a task component. */
export type FrameStep = AskedStep | TaskStep;

export interface LessonContent {
  loaded: LoadedExercise;
  question: Question;
  steps: Map<string, FrameStep>;
  deepDives: Map<string, DeepDive>;
  variants: Map<string, Variant>;
  /** Long-press targets: blockId -> verified answers. */
  asksByBlock: Map<string, Asks | undefined>;
  /** What the planner may choose from, and how logged steps map to skills. */
  menu: PlannerMenu;
  catalog: Catalog;
}

export function buildContent(
  loaded: LoadedExercise,
  questionId: string,
): LessonContent {
  const question = loaded.exercise.parts.find(q => q.id === questionId);
  if (!question) {
    throw new Error(`unknown question ${questionId}`);
  }
  const steps = new Map<string, FrameStep>();
  const asksByBlock = new Map<string, Asks | undefined>();
  for (const g of question.groups) {
    for (const s of g.steps) {
      if (
        s.kind === 'choice' ||
        s.kind === 'typed' ||
        s.kind === 'lines' ||
        isTaskStep(s)
      ) {
        steps.set(stepKey.main(question.id, s.id), s as FrameStep);
      }
      if (s.kind === 'text') {
        asksByBlock.set(s.blockId, s.asks);
      }
    }
  }
  const deepDives = new Map<string, DeepDive>();
  const indexBlocks = (blocks: readonly Block[]) => {
    for (const b of blocks) {
      if (b.type === 'tutor_text') {
        asksByBlock.set(b.blockId, b.asks);
      } else if (b.type === 'deep_dive') {
        indexBlocks(b.blocks);
      }
    }
  };
  for (const d of loaded.exercise.deepDives) {
    deepDives.set(d.id, d);
    indexBlocks(d.blocks);
    if (d.mini) {
      steps.set(stepKey.mini(d.id), d.mini);
    }
  }
  const variants = new Map<string, Variant>();
  for (const v of loaded.exercise.variants) {
    variants.set(v.id, v);
    indexBlocks(v.intro);
    steps.set(stepKey.variant(v.id), v.step as FrameStep);
  }
  return {
    loaded,
    question,
    steps,
    deepDives,
    variants,
    asksByBlock,
    menu: buildMenu(loaded),
    catalog: catalogFor(loaded),
  };
}

// ---------------------------------------------------------------------------
// Draft helpers (the reducer copies state once, then mutates the copy).

interface Draft {
  c: LessonContent;
  s: LessonState;
  events: EventDraft[];
  at: number;
}

function nextKey(d: Draft, prefix: string): string {
  d.s.seq += 1;
  return `${prefix}-${d.s.seq}`;
}

type NewItem = FeedItem extends infer T
  ? T extends FeedItem
    ? Omit<T, 'key'>
    : never
  : never;

function top(d: Draft): Frame | undefined {
  return d.s.stack[d.s.stack.length - 1];
}

/** Appends items; if a question is active its card stays last. */
function append(d: Draft, ...items: NewItem[]) {
  const frame = top(d);
  const last = d.s.items[d.s.items.length - 1];
  const keepLast =
    frame !== undefined && last?.key === frame.cardKey ? last : undefined;
  if (keepLast) {
    d.s.items.pop();
  }
  for (const item of items) {
    d.s.items.push({ ...item, key: nextKey(d, item.kind) } as FeedItem);
  }
  if (keepLast) {
    d.s.items.push(keepLast);
  }
}

function updateCard(
  d: Draft,
  key: string,
  patch: Partial<Extract<FeedItem, { kind: 'question' }>>,
) {
  d.s.items = d.s.items.map(item =>
    item.key === key && item.kind === 'question' ? { ...item, ...patch } : item,
  );
}

function stepOf(d: Draft, frame: Frame): FrameStep {
  const step = d.c.steps.get(frame.stepKey);
  if (!step) {
    throw new Error(`missing step ${frame.stepKey}`);
  }
  return step;
}

function answerOf(d: Draft, frame: Frame): ResolvedAnswer {
  const a = d.c.loaded.answers.get(frame.stepKey);
  if (!a) {
    throw new Error(`missing answer ${frame.stepKey}`);
  }
  return a;
}

function eventBase(d: Draft, frame: Frame | undefined) {
  return {
    questionId: d.s.questionId,
    stepId: frame?.stepId ?? 'none',
  };
}

function duration(d: Draft, frame: Frame) {
  return { durationMs: Math.max(0, Math.round(d.at - frame.shownAt)) };
}

const withReaction = (reaction: Reaction | undefined) =>
  reaction ? { reaction } : {};

function showCard(d: Draft, frame: Frame) {
  const step = stepOf(d, frame);
  frame.cardKey = nextKey(d, 'question');
  frame.shownAt = d.at;
  d.s.items.push({
    key: frame.cardKey,
    kind: 'question',
    depth: frame.depth,
    ref: frame.ref,
    status: 'active',
    attempts: frame.attempts,
    ...(frame.notSures && { notSure: frame.notSures }),
    ...(frame.chipsHold !== undefined && { chipsHold: frame.chipsHold }),
    ...(revealUnlocked(frame) && { revealUnlocked: true }),
    ...(frame.fresh && { freshExit: true }),
    hintLevel: frame.hintLevel,
    hintCount: step.hints?.length ?? 0,
    canGoBack: frame.ref.scope !== 'main',
    ...(step.kind === 'component' && step.optional && { optional: true }),
  });
  if (step.kind === 'component') {
    logShown(d, step.component, step.blockId, frame.stepId);
  }
}

/**
 * Reveal before the end of the ladder (product owner, 2026-10-22): on a
 * variant / transfer step only, after 2 closed detours from it. Main steps
 * keep rule 6 (the ladder first).
 */
const REVEAL_AFTER_DETOURS = 2;
const revealUnlocked = (frame: Frame) =>
  frame.ref.scope === 'variant' &&
  (frame.detoursClosed ?? 0) >= REVEAL_AFTER_DETOURS;

/**
 * A detour just closed: it counts toward the parent's reveal unlock only if
 * the student acted in it or finished it; one left at once does not
 * (product owner, 2026-10-22).
 */
function countClosedDetour(d: Draft, closed: Frame, finished: boolean) {
  const parent = editTop(d);
  if (parent && (finished || closed.acted === true)) {
    parent.detoursClosed = (parent.detoursClosed ?? 0) + 1;
  }
}

/** Which representation the student saw (derived state builds representationsTried from it). */
function logShown(
  d: Draft,
  spec: ComponentSpec,
  blockId: string,
  stepId: string,
) {
  d.events.push({
    questionId: d.s.questionId,
    stepId,
    t: 'component_event',
    component: spec.component,
    name: 'shown',
    payload: { blockId },
  });
}

function pushFrame(d: Draft, ref: AskRef, depth: number, reaction?: Reaction) {
  const key =
    ref.scope === 'main'
      ? stepKey.main(ref.questionId, ref.stepId)
      : ref.scope === 'mini'
      ? stepKey.mini(ref.deepDiveId)
      : stepKey.variant(ref.variantId);
  const frame: Frame = {
    ref,
    stepKey: key,
    stepId: ref.scope === 'main' ? ref.stepId : key,
    depth,
    attempts: 0,
    hintLevel: 0,
    cardKey: '',
    shownAt: d.at,
    ...(reaction && { reaction }),
    ...(reaction?.reactionId === 'rule.after_reveal.fresh' && { fresh: true }),
  };
  d.s.stack.push(frame);
  showCard(d, frame);
}

/** Copies the frame being changed so earlier states stay untouched. */
function editTop(d: Draft): Frame | undefined {
  const frame = top(d);
  if (!frame) {
    return undefined;
  }
  const copy = { ...frame };
  d.s.stack[d.s.stack.length - 1] = copy;
  return copy;
}

function setPending(
  d: Draft,
  trigger: NonNullable<LessonState['pending']>['trigger'],
  stepId: string,
) {
  d.s.pending = { trigger, questionId: d.s.questionId, stepId };
}

/** Open non-blocking cards close when the student moves on without answering them. */
function closeOpenCards(d: Draft) {
  if (!d.s.items.some(i => i.kind === 'choice_card' && i.status === 'open')) {
    return;
  }
  for (const i of d.s.items) {
    if (
      i.kind === 'choice_card' &&
      i.purpose === 'probe' &&
      i.status === 'open'
    ) {
      logProbe(d, i, null, true);
    }
  }
  d.s.items = d.s.items.map(i =>
    i.kind === 'choice_card' && i.status === 'open' && !i.blocking
      ? { ...i, status: 'closed' }
      : i,
  );
}

/**
 * The open probe card's answers would all lead to the same next action
 * (2026-10-22): it is taken back before the student sees it. The
 * hypothesis's line is shown as a question, as with no probe, and the
 * planner reacts. Not logged: the card was never shown.
 */
function onProbeDrop(d: Draft) {
  const index = d.s.items.findIndex(
    i =>
      i.kind === 'choice_card' && i.purpose === 'probe' && i.status === 'open',
  );
  const card = d.s.items[index];
  const frame = editTop(d);
  if (card?.kind !== 'choice_card' || !frame) {
    return;
  }
  d.s.items = d.s.items.filter((_, i) => i !== index);
  frame.probed = false;
  const line = misconceptionFeedback(d, frame, card.misconceptionIds?.[0]);
  if (line) {
    append(d, {
      kind: 'feedback',
      depth: card.depth,
      tone: 'warning',
      rich: line,
    });
  }
  setPending(d, 'wrong', card.stepId);
}

/** C3: the probe card's answer (null = skipped; movedOn = the student acted on the step). */
function logProbe(
  d: Draft,
  card: FeedItemOf<'choice_card'>,
  choice: string | null,
  movedOn = false,
) {
  d.events.push({
    questionId: d.s.questionId,
    stepId: card.stepId,
    t: 'probe',
    value: card.value ?? '',
    candidates: card.misconceptionIds ?? [],
    choice,
    ...(movedOn && { movedOn: true }),
  });
}

// ---------------------------------------------------------------------------
// Content -> feed items.

function blockItems(
  d: Draft,
  blocks: readonly Block[],
  depth: number,
  experiment?: Experiment,
) {
  for (const b of blocks) {
    switch (b.type) {
      case 'tutor_text':
        append(d, {
          kind: 'tutor',
          depth,
          rich: b.text,
          blockId: b.blockId,
          longPress: b.longPress ?? true,
          ...(b.asks && { asks: b.asks }),
        });
        break;
      case 'math':
        append(d, { kind: 'math', depth, latex: b.latex, blockId: b.blockId });
        break;
      case 'feedback':
        append(d, { kind: 'feedback', depth, tone: b.kind, rich: b.text });
        break;
      case 'student_bubble':
        append(d, {
          kind: 'student',
          depth,
          content: { kind: 'rich', rich: b.text },
        });
        break;
      case 'component':
        // Tasks inside deep dives and intros are rejected by the loader.
        if (componentKind(b.spec) === 'visual') {
          appendComponent(d, b.spec, b.blockId, depth, undefined, experiment);
        } else {
          componentFallback(d, b.spec.component, depth);
        }
        break;
      default:
        // recap / self_report / skip_choice / nested blocks: not in Phase 1b.
        componentFallback(d, `block:${b.type}`, depth);
    }
  }
}

function appendComponent(
  d: Draft,
  spec: ComponentSpec,
  blockId: string,
  depth: number,
  stepId?: string,
  experiment?: Experiment,
  ai?: { trust?: NonNullable<FeedItem['trust']>; llmRequestId?: string },
) {
  const id = stepId ?? top(d)?.stepId ?? 'none';
  append(d, {
    kind: 'component',
    depth,
    spec,
    blockId,
    stepId: id,
    ...(experiment && { experiment }),
    ...ai,
  });
  logShown(d, spec, blockId, id);
}

/**
 * A solved (or revealed) EventPicker fills its value's cell in the progressive
 * law table: an updated copy is appended, the older one shrinks to one line.
 * The source says whether the student found it or was shown it.
 */
function fillLaw(d: Draft, step: TaskStep, source: 'solved' | 'revealed') {
  if (step.fillsLaw === undefined) {
    return;
  }
  const event = step.component.props.event as { args?: { value?: unknown } };
  const value = event.args?.value;
  let index = d.s.items.length - 1;
  while (index >= 0) {
    const i = d.s.items[index]!;
    if (i.kind === 'component' && i.blockId === step.fillsLaw) {
      break;
    }
    index -= 1;
  }
  const table = d.s.items[index];
  if (typeof value !== 'number' || table?.kind !== 'component') {
    return;
  }
  const filled = [
    ...((table.lessonState?.filled as JsonObject[] | undefined) ?? []),
    { value, source },
  ];
  d.s.items[index] = { ...table, superseded: true };
  d.s.items.push({
    key: nextKey(d, 'component'),
    kind: 'component',
    depth: table.depth,
    spec: table.spec,
    blockId: table.blockId,
    stepId: table.stepId,
    lessonState: { filled },
    trust: 'engine_computed',
  });
  d.events.push({
    questionId: d.s.questionId,
    stepId: step.id,
    t: 'component_event',
    component: table.spec.component,
    name: 'cell_filled_by_lesson',
    payload: { blockId: table.blockId, value, source },
  });
}

function componentFallback(d: Draft, component: string, depth: number) {
  append(d, { kind: 'component_fallback', depth, component });
  d.events.push({
    ...eventBase(d, top(d)),
    t: 'component_error',
    component,
    reason: 'unknown_component',
    detail: 'not in the Phase 1b registry',
  });
}

/** Appends main-path steps from the cursor until the next asked step (or the end). */
function advance(d: Draft) {
  const groups = d.c.question.groups;
  for (;;) {
    const group = groups[d.s.cursor.group];
    if (!group) {
      finish(d);
      return;
    }
    const step: Step | undefined = group.steps[d.s.cursor.step];
    if (!step) {
      d.s.cursor = { group: d.s.cursor.group + 1, step: 0 };
      continue;
    }
    d.s.cursor = { ...d.s.cursor, step: d.s.cursor.step + 1 };
    switch (step.kind) {
      case 'text':
        // Compressed (opt-in): explanation blocks are skipped, questions stay.
        if (!d.s.compressed) {
          append(d, {
            kind: 'tutor',
            depth: 0,
            rich: step.text,
            blockId: step.blockId,
            longPress: true,
            ...(step.asks && { asks: step.asks }),
          });
        }
        break;
      case 'math':
        if (!d.s.compressed) {
          append(d, {
            kind: 'math',
            depth: 0,
            latex: step.latex,
            blockId: step.blockId,
          });
        }
        break;
      case 'choice':
      case 'typed':
      case 'lines':
        pushFrame(
          d,
          { scope: 'main', questionId: d.c.question.id, stepId: step.id },
          0,
        );
        return;
      case 'component':
        if (isTaskStep(step)) {
          pushFrame(
            d,
            { scope: 'main', questionId: d.c.question.id, stepId: step.id },
            0,
          );
          return;
        }
        if (componentKind(step.component)) {
          appendComponent(d, step.component, step.blockId, 0, step.id);
          if (isGate(step.component.component, step.component.props)) {
            // Nothing after it appears before the student's tap.
            d.s.gate = { stepId: step.id };
            return;
          }
        } else {
          componentFallback(d, step.component.component, 0);
        }
        break;
      default:
        componentFallback(d, `step:${step.kind}`, 0);
    }
  }
}

function finish(d: Draft) {
  append(d, {
    kind: 'writeup',
    depth: 0,
    lines: d.c.question.writeup.modelFr,
  });
  append(d, { kind: 'done', depth: 0 });
  d.s.finished = true;
  d.events.push({
    questionId: d.s.questionId,
    stepId: 'part',
    t: 'part_done',
    ...partCounts(d),
  });
}

/**
 * The part's required acting steps (as the progress bar counts them): each
 * one the student did (answered, a task solved, a prediction tapped) or was
 * shown at the end of its hint ladder (revealed). Re-asked copies of a card
 * after a detour count once (its last copy).
 */
function partCounts(d: Draft) {
  const steps = d.c.question.groups
    .flatMap(g => g.steps)
    .filter(countsForProgress);
  let answered = 0;
  let revealed = 0;
  for (const s of steps) {
    const cards = d.s.items.filter(
      (i): i is FeedItemOf<'question'> =>
        i.kind === 'question' &&
        i.ref.scope === 'main' &&
        i.ref.stepId === s.id,
    );
    if (
      cards.some(c => c.revealed === true) ||
      d.s.skippedGates?.includes(s.id)
    ) {
      revealed += 1;
    } else {
      answered += 1;
    }
  }
  // D3 (2026-10-22): a detour step (variant, mini) revealed at least once
  // counts too; `answered` stays main steps only, so "done" is unchanged.
  const detours = new Set(
    d.s.items
      .filter(
        (i): i is FeedItemOf<'question'> =>
          i.kind === 'question' &&
          i.ref.scope !== 'main' &&
          i.revealed === true,
      )
      .map(i => JSON.stringify(i.ref)),
  );
  revealed += detours.size;
  return { counted: steps.length, answered, revealed };
}

// ---------------------------------------------------------------------------
// Detours: deep dives and variants. They pause the card below and re-ask it after.

/** The step's deep dive id when one could open now (exists, below the depth cap). */
function availableDeepDive(d: Draft, frame: Frame): string | undefined {
  const id = stepOf(d, frame).deepDiveId;
  if (
    id === undefined ||
    frame.depth >= MAX_DEPTH ||
    d.s.shownDeepDives.includes(id) ||
    !d.c.deepDives.has(id)
  ) {
    return undefined;
  }
  return id;
}

function openDeepDive(d: Draft, parent: Frame, id: string, reaction: Reaction) {
  const dive = d.c.deepDives.get(id)!;
  const depth = parent.depth + 1;
  d.s.shownDeepDives = [...d.s.shownDeepDives, id];
  updateCard(d, parent.cardKey, { status: 'paused' });
  d.events.push({
    ...eventBase(d, parent),
    t: 'component_event',
    component: 'DeepDive',
    name: 'shown',
    payload: { deepDiveId: id, representation: deepDiveRepresentation(dive) },
    reaction,
  });
  // Pushed directly: the paused card is no longer kept last, deep-dive content goes after it.
  d.s.items.push({
    key: nextKey(d, 'deep_dive_start'),
    kind: 'deep_dive_start',
    depth,
    deepDiveId: id,
  });
  // A deep dive with its own small urn: its components use it.
  const own = dive.experiment
    ? deepDiveContext(d.c.loaded.exercise, dive).experiment
    : undefined;
  blockItems(d, dive.blocks, depth, own);
  if (dive.mini) {
    pushFrame(d, { scope: 'mini', deepDiveId: id }, depth, reaction);
  } else {
    // No mini question: the deep dive ends at once (still logged as completed).
    d.events.push({
      ...eventBase(d, parent),
      t: 'deepdive',
      deepDiveId: id,
      outcome: 'completed',
      reaction,
    });
    setPending(d, 'detour_closed', parent.stepId);
  }
}

function experimentOf(d: Draft, v: Variant): Experiment | undefined {
  return variantContext(d.c.loaded.exercise, v).experiment;
}

/** Opens an authored variant over the current card (or alone, after a solved step). */
function openVariant(d: Draft, v: Variant, reaction: Reaction) {
  const parent = top(d);
  const depth = parent ? parent.depth + 1 : 0;
  d.s.shownVariants = [...d.s.shownVariants, v.id];
  const stepId = parent?.stepId ?? stepKey.variant(v.id);
  d.events.push({
    questionId: d.s.questionId,
    stepId,
    t: 'component_event',
    component: 'Variant',
    name: 'shown',
    payload: {
      variantId: v.id,
      kind: v.kind,
      representation: v.representation,
      ...(v.round !== undefined && { round: v.round }),
    },
    reaction,
  });
  if (parent) {
    updateCard(d, parent.cardKey, { status: 'paused' });
  }
  // Pushed directly (like deep dives): the paused card stays where it is.
  d.s.items.push({
    key: nextKey(d, 'variant_start'),
    kind: 'variant_start',
    depth,
    variantKind: v.kind,
  });
  // The intro belongs to the variant; its frame is pushed after so the card stays last.
  const experiment = v.experiment ? experimentOf(d, v) : undefined;
  for (const b of v.intro) {
    if (b.type === 'component' && componentKind(b.spec) === 'visual') {
      d.s.items.push({
        key: nextKey(d, 'component'),
        kind: 'component',
        depth,
        spec: b.spec,
        blockId: b.blockId,
        stepId: stepKey.variant(v.id),
        ...(experiment && { experiment }),
      });
      logShown(d, b.spec, b.blockId, stepKey.variant(v.id));
    } else {
      blockItems(d, [b], depth, experiment);
    }
  }
  pushFrame(d, { scope: 'variant', variantId: v.id }, depth, reaction);
}

function closeVariant(
  d: Draft,
  outcome: 'correct' | 'wrong' | 'revealed' | 'abandoned',
) {
  const frame = d.s.stack.pop()!;
  if (frame.ref.scope !== 'variant') {
    throw new Error('closeVariant without a variant');
  }
  const v = d.c.variants.get(frame.ref.variantId)!;
  countClosedDetour(d, frame, outcome !== 'abandoned');
  const parent = top(d);
  const reaction = withReaction(frame.reaction);
  if (v.kind === 'transfer' && outcome !== 'abandoned') {
    // The only source of transfer events: a changed version of a solved task.
    for (const skillId of v.step.skills.slice(0, 3)) {
      d.events.push({
        ...eventBase(d, frame),
        t: 'transfer',
        skillId,
        correct: outcome === 'correct',
        variantId: v.id,
        hintsUsed: Math.min(3, frame.hintLevel),
        ...reaction,
      });
    }
  }
  if (v.kind === 'simpler' && v.round !== undefined) {
    d.events.push({
      ...eventBase(d, frame),
      t: 'example_round',
      templateId: v.id,
      round: v.round,
      outcome:
        outcome === 'correct'
          ? 'correct'
          : outcome === 'abandoned'
          ? 'skipped'
          : 'wrong',
      ...reaction,
    });
  }
  const stepId = parent?.stepId ?? frame.stepId;
  d.events.push({
    questionId: d.s.questionId,
    stepId,
    t: 'component_event',
    component: 'Variant',
    name: 'closed',
    payload: { variantId: v.id, kind: v.kind, outcome },
    ...reaction,
  });
  setPending(d, 'detour_closed', stepId);
}

function returnTo(d: Draft, parent: Frame) {
  append(d, { kind: 'return', depth: parent.depth });
  const copy = { ...parent };
  d.s.stack[d.s.stack.length - 1] = copy;
  showCard(d, copy);
}

/** Closes the deep dive whose mini frame is on top; the planner decides what follows. */
function closeDeepDive(
  d: Draft,
  outcome: 'completed' | 'abandoned',
  miniCorrect?: boolean,
  helped?: boolean,
) {
  const mini = d.s.stack.pop()!;
  if (mini.ref.scope !== 'mini') {
    throw new Error('closeDeepDive without a deep dive');
  }
  countClosedDetour(d, mini, outcome === 'completed');
  const parent = top(d)!;
  d.events.push({
    ...eventBase(d, parent),
    t: 'deepdive',
    deepDiveId: mini.ref.deepDiveId,
    outcome,
    ...(miniCorrect !== undefined && { miniCorrect }),
    ...(helped !== undefined && { helped }),
    ...withReaction(mini.reaction),
  });
  setPending(d, 'detour_closed', parent.stepId);
}

// ---------------------------------------------------------------------------
// Hints.

function giveHint(d: Draft, frame: Frame, reaction: Reaction | null): boolean {
  const hints = stepOf(d, frame).hints ?? [];
  const next = hints[frame.hintLevel];
  if (!next) {
    return false;
  }
  frame.hintLevel += 1;
  const level = frame.hintLevel as 1 | 2 | 3;
  d.events.push({
    ...eventBase(d, frame),
    t: 'hint',
    level,
    ...(reaction && { reaction }),
  });
  updateCard(d, frame.cardKey, { hintLevel: frame.hintLevel });
  append(d, {
    kind: 'hint',
    depth: frame.depth,
    level,
    total: hints.length,
    rich: next,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Step completion.

function completeStep(
  d: Draft,
  frame: Frame,
  correct: boolean,
  revealed = false,
) {
  if (frame.ref.scope === 'mini') {
    const first = correct && frame.attempts === 0;
    // Task minis: revealed, or 2 wrong tries, means the deep dive did not help.
    const helped =
      stepOf(d, frame).kind === 'component'
        ? correct && frame.attempts < TASK_MINI_WRONG_TRIES_NOT_HELPED
        : first;
    closeDeepDive(d, 'completed', first, helped);
    return;
  }
  if (frame.ref.scope === 'variant') {
    closeVariant(
      d,
      !correct ? 'revealed' : frame.attempts === 0 ? 'correct' : 'wrong',
    );
    return;
  }
  d.s.stack.pop();
  if (correct) {
    // The planner may add a self-report, a transfer or an offer before moving on.
    setPending(d, 'correct', frame.stepId);
  } else if (revealed) {
    // D2: after a reveal the planner may open a fresh variant first.
    setPending(d, 'revealed', frame.stepId);
  } else {
    advance(d);
  }
}

function correctAnswerRich(d: Draft, frame: Frame): Rich {
  const answer = answerOf(d, frame);
  if (answer.kind === 'number') {
    return { math: fractionToLatex(answer.value) };
  }
  const step = stepOf(d, frame);
  if (answer.kind === 'lines') {
    // The goal's written form (engine-checked by the loader).
    const goal =
      step.kind === 'lines' && step.goalLatex !== undefined
        ? step.goalLatex
        : latexOfLine(answer.spec.goal, answer.spec.variables);
    const lhs = step.kind === 'lines' && step.lhs ? `${step.lhs}=` : '';
    return { math: `${lhs}${goal}` };
  }
  const option =
    step.kind === 'choice'
      ? step.options.find(
          o => answer.kind === 'option' && o.id === answer.optionId,
        )
      : undefined;
  return option?.label ?? { math: '?' };
}

function latexOfLine(src: string, variables: readonly string[]): string {
  const r = parseExpression(src, { variables });
  return r.ok ? toLatex(r.ast) : src;
}

/**
 * The misconception's own message, on the first wrong answer of a step only
 * (product owner, 2026-10-18): never repeated on a second wrong answer.
 */
/**
 * The message of a known mistake, once per misconception and card: a second,
 * different mistake gets its own message (not the generic "try again"); the
 * same mistake again does not repeat it.
 */
function misconceptionFeedback(
  d: Draft,
  frame: Frame,
  misconceptionId: string | undefined,
): Rich | undefined {
  if (
    misconceptionId === undefined ||
    frame.misconceptionsShown?.includes(misconceptionId)
  ) {
    return undefined;
  }
  const feedback = d.c.loaded.misconceptions.get(misconceptionId)?.feedback;
  if (feedback) {
    frame.misconceptionsShown = [
      ...(frame.misconceptionsShown ?? []),
      misconceptionId,
    ];
  }
  return feedback;
}

/**
 * One typed line of a lines step. The reducer re-checks it (the card's own
 * check is display only): an accepted line is logged as a component event,
 * a wrong line is a wrong answer (planner ladder), the goal form ends the step.
 */
function onLine(
  d: Draft,
  frame: Frame,
  step: Extract<FrameStep, { kind: 'lines' }>,
  rawLine: string,
  keys: string[] | undefined,
) {
  const answer = answerOf(d, frame);
  if (answer.kind !== 'lines') {
    return;
  }
  closeOpenCards(d);
  const base = eventBase(d, frame);
  const raw = rawLine.slice(0, LINE_MAX);
  if (keys) {
    d.events.push({
      ...base,
      t: 'component_event',
      component: 'LinesEditor',
      name: 'input_trace',
      payload: { keys: keys.slice(0, 100) },
    });
  }
  const accepted = frame.lines ?? [];
  const v = checkLine(answer.spec, accepted, raw);
  if (v.kind === 'unchanged') {
    // Neither right nor wrong, not a hint: the card asks for a change.
    d.events.push({
      ...base,
      t: 'component_event',
      component: 'LinesEditor',
      name: 'unchanged_line',
      payload: { raw },
    });
    return;
  }
  if (
    v.kind === 'unreadable' ||
    v.kind === 'parse_error' ||
    v.kind === 'undetermined'
  ) {
    d.events.push({
      ...base,
      t: 'component_event',
      component: 'LinesEditor',
      name: 'invalid_input',
      payload: {
        raw,
        reason:
          v.kind === 'unreadable'
            ? v.issue.kind
            : v.kind === 'parse_error'
            ? v.code
            : 'undetermined',
      },
    });
    // Not graded; the rules change nothing (rule.line_invalid.continue), the
    // AI tutor may explain this line (D22).
    setPending(d, 'line_invalid', frame.stepId);
    return;
  }
  if (v.kind === 'accepted') {
    const lines = [...accepted, raw];
    frame.lines = lines;
    updateCard(d, frame.cardKey, { lines });
    if (!v.final) {
      d.events.push({
        ...base,
        t: 'component_event',
        component: 'LinesEditor',
        name: 'line_accepted',
        payload: { index: lines.length - 1, raw },
      });
      return;
    }
    d.events.push({
      ...base,
      ...duration(d, frame),
      t: 'answer',
      kind: 'lines',
      value: lines,
      correct: true,
      attempt: frame.attempts + 1,
      ...(v.jumped && { jumped: true as const }),
    });
    updateCard(d, frame.cardKey, {
      status: 'done',
      result: { raw, correct: true },
    });
    d.s.items.push({
      key: nextKey(d, 'feedback'),
      kind: 'feedback',
      depth: frame.depth,
      tone: 'success',
      message: 'correct',
    });
    completeStep(d, frame, true);
    return;
  }
  // Wrong line: localized by the card; the misconception message once.
  d.events.push({
    ...base,
    t: 'component_event',
    component: 'LinesEditor',
    name: 'line_wrong',
    payload: {
      raw,
      where: v.where,
      ...(v.parentheses && { parentheses: v.parentheses }),
      ...(v.at && {
        at: { x: v.at.x, student: v.at.student, expected: v.at.expected },
      }),
    },
  });
  d.events.push({
    ...base,
    ...duration(d, frame),
    t: 'answer',
    kind: 'lines',
    value: raw,
    correct: false,
    ...(v.misconceptionId !== undefined && {
      misconceptionId: v.misconceptionId,
    }),
    attempt: frame.attempts + 1,
  });
  const feedback = misconceptionFeedback(d, frame, v.misconceptionId);
  frame.attempts += 1;
  delete frame.lastRaw;
  d.s.compressed = false;
  updateCard(d, frame.cardKey, { attempts: frame.attempts });
  if (feedback) {
    append(d, {
      kind: 'feedback',
      depth: frame.depth,
      tone: 'warning',
      rich: feedback,
    });
  }
  setPending(d, 'wrong', frame.stepId);
}

// ---------------------------------------------------------------------------
// Student actions.

function onAnswer(d: Draft, action: Extract<LessonAction, { type: 'answer' }>) {
  const frame = editTop(d);
  if (!frame) {
    return;
  }
  const step = stepOf(d, frame);
  if (step.kind === 'component') {
    return; // Task components answer through component_result.
  }
  if (step.kind === 'lines') {
    if ('line' in action.value) {
      onLine(d, frame, step, action.value.line, action.keys);
    }
    return;
  }
  const answer = answerOf(d, frame);
  const base = eventBase(d, frame);

  let correct: boolean;
  let misconceptionId: string | undefined;
  let feedback: Rich | undefined;
  let value: string;
  let numeric: string | undefined;
  let inferredBy: 'authored' | 'procedure' | undefined;
  let candidates: string[] = [];

  if (step.kind === 'choice') {
    if (!('optionId' in action.value)) {
      return;
    }
    const option = step.options.find(
      o => 'optionId' in action.value && o.id === action.value.optionId,
    );
    if (!option || answer.kind !== 'option') {
      return;
    }
    closeOpenCards(d);
    value = option.id;
    numeric = option.value;
    correct = option.id === answer.optionId;
    misconceptionId = option.misconceptionId;
    // Authored option feedback, else the misconception's (once per mistake).
    feedback =
      option.feedback ?? misconceptionFeedback(d, frame, misconceptionId);
    append(d, {
      kind: 'student',
      depth: frame.depth,
      content: { kind: 'rich', rich: option.label ?? { math: '?' } },
    });
  } else {
    if (!('raw' in action.value) || answer.kind !== 'number') {
      return;
    }
    closeOpenCards(d);
    const raw = action.value.raw.slice(0, SHORT_TEXT);
    if (action.keys) {
      d.events.push({
        ...base,
        t: 'component_event',
        component: 'NumericKeypad',
        name: 'input_trace',
        payload: { keys: action.keys.slice(0, 100) },
      });
    }
    const parsed = parseNumeric(raw);
    if (!parsed.ok) {
      d.events.push({
        ...base,
        t: 'component_event',
        component: 'NumericKeypad',
        name: 'invalid_input',
        payload: { raw, reason: parsed.reason },
      });
      append(d, {
        kind: 'feedback',
        depth: frame.depth,
        tone: 'info',
        message: 'invalidInput',
      });
      return;
    }
    value = raw;
    numeric = raw;
    correct = equals(parsed.value, answer.value);
    // C3: authored wrong answers first, then the engine's wrong procedures.
    const known = correct
      ? undefined
      : step.wrongAnswers?.find(w => {
          const v = parseNumeric(w.value);
          return v.ok && equals(v.value, parsed.value);
        });
    if (known) {
      inferredBy = 'authored';
      misconceptionId = known.misconceptionId;
    } else if (!correct) {
      candidates = [
        ...new Set(
          (answer.procedures ?? [])
            .filter(p => p.values.some(v => equals(v, parsed.value)))
            .map(p => p.misconceptionId),
        ),
      ];
      if (candidates.length > 0) {
        inferredBy = 'procedure';
        misconceptionId = candidates[0];
      }
    }
    // A hypothesis (several candidates) gets no misconception message: the
    // probe card asks instead.
    feedback =
      known?.feedback ??
      (candidates.length > 1
        ? undefined
        : misconceptionFeedback(d, frame, misconceptionId));
    append(d, {
      kind: 'student',
      depth: frame.depth,
      content: { kind: 'typed', raw },
    });
  }

  d.events.push({
    ...base,
    ...duration(d, frame),
    t: 'answer',
    kind: step.kind,
    value,
    correct,
    ...(!correct && misconceptionId !== undefined && { misconceptionId }),
    ...(!correct && inferredBy && { inferredBy }),
    ...(!correct && candidates.length > 0 && { candidates }),
    attempt: frame.attempts + 1,
  });

  if (correct) {
    updateCard(d, frame.cardKey, {
      status: 'done',
      result: { ...action.value, correct: true },
    });
    d.s.items.push({
      key: nextKey(d, 'feedback'),
      kind: 'feedback',
      depth: frame.depth,
      tone: 'success',
      message: 'correct',
    });
    completeStep(d, frame, true);
    return;
  }

  frame.attempts += 1;
  if (numeric !== undefined) {
    frame.lastRaw = numeric;
  } else {
    delete frame.lastRaw;
  }
  d.s.compressed = false;
  updateCard(d, frame.cardKey, { attempts: frame.attempts });
  // A known mistake already explained on this card gets no new message (the
  // planner's reaction follows); the generic one is only for unknown mistakes.
  if (feedback || misconceptionId === undefined) {
    append(d, {
      kind: 'feedback',
      depth: frame.depth,
      tone: 'warning',
      ...(feedback ? { rich: feedback } : { message: 'wrong' as UiMessage }),
    });
  }
  if (candidates.length > 1 && !frame.probed) {
    // C3: one short probe card per step; the planner reacts once it is answered or skipped.
    frame.probed = true;
    append(d, {
      kind: 'choice_card',
      depth: frame.depth,
      purpose: 'probe',
      choices: [...candidates.slice(0, 2), 'dismissed'],
      status: 'open',
      blocking: false,
      stepId: frame.stepId,
      ruleId: 'probe',
      misconceptionIds: candidates,
      value,
    });
    return;
  }
  setPending(d, 'wrong', frame.stepId);
}

function onNotSure(d: Draft) {
  const frame = editTop(d);
  if (!frame) {
    return;
  }
  closeOpenCards(d);
  // deepDiveId: the step's deep dive when it could open (the planner decides whether it does).
  const id = availableDeepDive(d, frame);
  d.events.push({
    ...eventBase(d, frame),
    ...duration(d, frame),
    t: 'not_sure',
    ...(id !== undefined && { deepDiveId: id }),
    attempt: frame.attempts + 1,
  });
  frame.notSures = (frame.notSures ?? 0) + 1;
  updateCard(d, frame.cardKey, { notSure: frame.notSures });
  d.s.compressed = false;
  append(d, {
    kind: 'student',
    depth: frame.depth,
    content: { kind: 'message', message: 'notSure' },
  });
  setPending(d, 'not_sure', frame.stepId);
}

function onReveal(d: Draft) {
  const frame = editTop(d);
  if (!frame) {
    return;
  }
  const hints = stepOf(d, frame).hints ?? [];
  if (frame.hintLevel < hints.length && !revealUnlocked(frame)) {
    return; // Rule 6: never before the end of the ladder (variant exception above).
  }
  closeOpenCards(d);
  d.events.push({
    ...eventBase(d, frame),
    ...duration(d, frame),
    t: 'reveal',
    hintsUsed: frame.hintLevel,
    attempt: frame.attempts + 1,
  });
  const step = stepOf(d, frame);
  if (step.kind === 'component') {
    // The component shows the engine's answer itself.
    updateCard(d, frame.cardKey, { status: 'done', revealed: true });
    fillLaw(d, step, 'revealed');
  } else {
    // Marked revealed too (part_done counts it as shown, not done).
    updateCard(d, frame.cardKey, { status: 'done', revealed: true });
    d.s.items.push({
      key: nextKey(d, 'answer'),
      kind: 'answer',
      depth: frame.depth,
      rich: correctAnswerRich(d, frame),
      trust: 'engine_computed',
    });
  }
  completeStep(d, frame, false, true);
}

/** B4: the step's own walk-through lines (a parent's would show the parent's numbers). */
function walkthroughOf(d: Draft, frame: Frame): Rich[] | undefined {
  return (stepOf(d, frame) as { walkthrough?: { lines: Rich[] } }).walkthrough
    ?.lines;
}

function logWalkthroughLine(d: Draft, frame: Frame, index: number) {
  d.events.push({
    ...eventBase(d, frame),
    t: 'component_event',
    component: 'Walkthrough',
    name: 'line',
    payload: { index },
  });
}

/** «التالي»: the next line; after the last one, the step's card again for the final value. */
function onWalkthroughNext(d: Draft) {
  const frame = editTop(d);
  const index = d.s.items.findIndex(
    i => i.kind === 'walkthrough' && !i.done && i.stepId === frame?.stepId,
  );
  const item = d.s.items[index];
  if (!frame || item?.kind !== 'walkthrough') {
    return;
  }
  const shown = item.shown + 1;
  const done = shown >= item.lines.length;
  d.s.items = d.s.items.map((x, i) =>
    i === index ? { ...item, shown, done } : x,
  );
  logWalkthroughLine(d, frame, shown - 1);
  if (done) {
    updateCard(d, frame.cardKey, { status: 'paused' });
    returnTo(d, frame);
  }
}

/** Optional tasks only. Logged with a reason; neither a pass nor a fail. */
function onSkip(d: Draft, action: Extract<LessonAction, { type: 'skip' }>) {
  const frame = editTop(d);
  if (!frame) {
    return;
  }
  const step = stepOf(d, frame);
  if (step.kind !== 'component' || !step.optional) {
    return;
  }
  closeOpenCards(d);
  d.events.push({
    ...eventBase(d, frame),
    ...duration(d, frame),
    t: 'skip',
    reason: action.reason,
  });
  updateCard(d, frame.cardKey, { status: 'done', skipped: true });
  completeStep(d, frame, false);
}

function onComponentResult(
  d: Draft,
  action: Extract<LessonAction, { type: 'component_result' }>,
) {
  const frame = editTop(d);
  if (!frame) {
    return;
  }
  const step = stepOf(d, frame);
  if (step.kind !== 'component') {
    return;
  }
  closeOpenCards(d);
  const hints = action.misconceptionHints ?? [];
  const known = hints.find(h => d.c.loaded.misconceptionIds.has(h));
  d.events.push({
    ...eventBase(d, frame),
    ...duration(d, frame),
    t: 'answer',
    kind: 'task',
    value: {
      component: step.component.component,
      ...action.details,
      misconceptionHints: hints,
    },
    correct: action.correct,
    ...(!action.correct && known !== undefined && { misconceptionId: known }),
    attempt: frame.attempts + 1,
  });
  if (action.correct) {
    updateCard(d, frame.cardKey, { status: 'done', result: { correct: true } });
    d.s.items.push({
      key: nextKey(d, 'feedback'),
      kind: 'feedback',
      depth: frame.depth,
      tone: 'success',
      message: 'correct',
    });
    fillLaw(d, step, 'solved');
    completeStep(d, frame, true);
    return;
  }
  frame.attempts += 1;
  delete frame.lastRaw;
  d.s.compressed = false;
  updateCard(d, frame.cardKey, { attempts: frame.attempts });
  // The component marks what is wrong; content can add words for a known pattern.
  const diagnosis = step.diagnoses?.find(x =>
    hints.includes(x.misconceptionId),
  );
  if (diagnosis) {
    append(d, {
      kind: 'feedback',
      depth: frame.depth,
      tone: 'warning',
      rich: diagnosis.feedback,
    });
  }
  setPending(d, 'wrong', frame.stepId);
}

function onLeave(d: Draft) {
  const frame = top(d);
  if (frame?.ref.scope !== 'mini' && frame?.ref.scope !== 'variant') {
    return;
  }
  closeOpenCards(d);
  updateCard(d, frame.cardKey, { status: 'paused' });
  if (frame.ref.scope === 'mini') {
    closeDeepDive(d, 'abandoned');
  } else {
    closeVariant(d, 'abandoned');
  }
}

/** "غيّر الطريقة" / "حاجة أسهل" on the active card. */
function onRequest(
  d: Draft,
  action: Extract<LessonAction, { type: 'request' }>,
) {
  const frame = top(d);
  if (!frame || frame.ref.scope === 'mini') {
    return;
  }
  closeOpenCards(d);
  d.events.push({
    ...eventBase(d, frame),
    ...duration(d, frame),
    t: 'request',
    kind: action.kind,
    attempt: frame.attempts + 1,
    ...(action.via && { via: action.via }),
  });
  append(d, {
    kind: 'student',
    depth: frame.depth,
    content: {
      kind: 'message',
      message: action.kind === 'change_method' ? 'changeMethod' : 'simpler',
    },
  });
  setPending(d, 'request', frame.stepId);
}

const CARD_CHOICES: Record<CardPurpose, readonly string[]> = {
  clarify: ['counting', 'why', 'link'],
  self_report: ['understood', 'guessed', 'dismissed'],
  compress: ['yes', 'no'],
  repair: ['yes', 'no'],
  teacher_note: ['yes', 'no'],
  // Probe cards list the candidate misconceptions themselves (C3).
  probe: ['dismissed'],
  ask_next: ['hint', 'deep_dive', 'dismissed'],
};

function addCard(
  d: Draft,
  purpose: CardPurpose,
  decision: Decision,
  stepId: string,
  extra: { choices?: string[]; variantId?: string } = {},
) {
  const blocking = top(d) === undefined;
  const card: NewItem = {
    kind: 'choice_card',
    depth: top(d)?.depth ?? 0,
    purpose,
    choices: extra.choices ?? [...CARD_CHOICES[purpose]],
    status: 'open',
    blocking,
    stepId,
    ruleId: decision.ruleId,
    ...(extra.variantId !== undefined && { variantId: extra.variantId }),
    ...(purpose === 'teacher_note' && {
      skillIds: decision.diagnosis.skillIds.slice(0, 10),
      misconceptionIds: decision.diagnosis.misconceptionIds.slice(0, 10),
    }),
  };
  append(d, card);
}

function onCardChoice(
  d: Draft,
  action: Extract<LessonAction, { type: 'card_choice' }>,
) {
  let index = d.s.items.length - 1;
  while (index >= 0) {
    const i = d.s.items[index]!;
    if (
      i.kind === 'choice_card' &&
      i.purpose === action.purpose &&
      i.status === 'open'
    ) {
      break;
    }
    index -= 1;
  }
  const card = d.s.items[index];
  if (card?.kind !== 'choice_card' || !card.choices.includes(action.choice)) {
    return;
  }
  d.s.items[index] = { ...card, status: 'answered', choice: action.choice };
  const base = { questionId: d.s.questionId, stepId: card.stepId };
  const yes = action.choice === 'yes';
  const depth = card.depth;
  switch (card.purpose) {
    case 'clarify':
      d.events.push({
        ...base,
        t: 'clarify',
        choice: action.choice as ClarifyChoice,
      });
      append(d, {
        kind: 'student',
        depth,
        content: {
          kind: 'message',
          message: `clarify.${action.choice}` as UiMessage,
        },
      });
      setPending(d, 'clarify', card.stepId);
      return;
    case 'self_report':
      d.events.push({
        ...base,
        t: 'self_report',
        value: action.choice as 'understood' | 'guessed' | 'dismissed',
      });
      append(d, {
        kind: 'student',
        depth,
        content: {
          kind: 'message',
          message: `selfReport.${action.choice}` as UiMessage,
        },
      });
      setPending(d, 'self_report', card.stepId);
      return;
    case 'compress':
      d.events.push({
        ...base,
        t: 'offer_response',
        offer: 'compress',
        accepted: yes,
      });
      if (yes) {
        d.s.compressed = true;
        append(d, {
          kind: 'feedback',
          depth,
          tone: 'info',
          message: 'compressOn',
        });
      }
      break;
    case 'repair': {
      d.events.push({
        ...base,
        t: 'offer_response',
        offer: 'repair',
        accepted: yes,
      });
      const v = card.variantId ? d.c.variants.get(card.variantId) : undefined;
      if (yes && v && top(d)) {
        openVariant(d, v, {
          reactionId: card.ruleId,
          representation: v.representation,
        });
      } else if (!yes) {
        // Declined: the help chips wait for the next wrong / "not sure" on the step.
        const frame = editTop(d);
        if (frame?.stepId === card.stepId) {
          frame.chipsHold = frame.attempts + (frame.notSures ?? 0);
          updateCard(d, frame.cardKey, { chipsHold: frame.chipsHold });
        }
      }
      break;
    }
    case 'ask_next': {
      d.events.push({
        ...base,
        t: 'offer_response',
        offer: 'ask_next',
        accepted: action.choice !== 'dismissed',
      });
      const frame = editTop(d);
      if (
        frame &&
        (action.choice === 'hint' || action.choice === 'deep_dive')
      ) {
        askNextHelp(d, frame, action.choice);
      }
      return;
    }
    case 'probe': {
      const confirmed = action.choice === 'dismissed' ? null : action.choice;
      logProbe(d, card, confirmed);
      // The line the answer held back: named plainly when confirmed, asked
      // for the hypothesis on «موش توّا». The planner's reaction follows.
      const frame = editTop(d);
      const id = confirmed ?? card.misconceptionIds?.[0];
      const m =
        id === undefined ? undefined : d.c.loaded.misconceptions.get(id);
      const line = confirmed
        ? m?.feedbackConfirmed ?? m?.feedback
        : m?.feedback;
      if (frame && id !== undefined && line) {
        frame.misconceptionsShown = [...(frame.misconceptionsShown ?? []), id];
        append(d, { kind: 'feedback', depth, tone: 'warning', rich: line });
      }
      setPending(d, 'wrong', card.stepId);
      return;
    }
    case 'teacher_note':
      d.events.push({
        ...base,
        t: 'offer_response',
        offer: 'teacher_note',
        accepted: yes,
      });
      if (yes) {
        d.events.push({
          ...base,
          t: 'teacher_note',
          noteId: `note-${d.s.seq + 1}`,
          skillIds: card.skillIds ?? [],
          misconceptionIds: card.misconceptionIds ?? [],
          ruleId: card.ruleId,
        });
        append(d, {
          kind: 'feedback',
          depth,
          tone: 'info',
          message: 'teacherNoteSaved',
        });
      }
      break;
  }
  if (card.blocking && top(d) === undefined && !d.s.finished) {
    advance(d);
  }
}

function askSnapshot(d: Draft) {
  const frame = top(d);
  return frame
    ? {
        stepKey: frame.stepKey,
        depth: frame.depth,
        attempts: frame.attempts,
        hintLevel: frame.hintLevel,
      }
    : { stepKey: 'none', depth: 0, attempts: 0, hintLevel: 0 };
}

function onAskLongPress(
  d: Draft,
  action: Extract<LessonAction, { type: 'ask_longpress' }>,
) {
  if (!d.c.asksByBlock.has(action.blockId)) {
    return;
  }
  const answer = d.c.asksByBlock.get(action.blockId)?.[action.mode];
  const frame = top(d);
  const quoted = action.quoted.slice(0, SHORT_TEXT);
  const math = action.quotedMath?.slice(0, SHORT_TEXT);
  d.events.push({
    ...eventBase(d, frame),
    t: 'ask',
    via: 'longpress',
    mode: action.mode,
    // Logged as before: the text, then its formula.
    quoted: [quoted, math].filter(Boolean).join(' ').slice(0, SHORT_TEXT),
    source: 'local',
    snapshot: {
      ...askSnapshot(d),
      blockId: action.blockId,
      ...(action.components && { components: action.components }),
    },
    ...(!answer && { unanswered: true }),
  });
  const depth = frame?.depth ?? 0;
  append(d, {
    kind: 'student',
    depth,
    content: {
      kind: 'quote',
      mode: action.mode,
      quoted,
      ...(math && { math }),
    },
  });
  if (answer) {
    append(d, { kind: 'ask_answer', depth, parts: answer });
    return;
  }
  // Round 1 "dead ends" (2026-10-22): never a dead end. The first time on a
  // block: the line, then an offer of the next hint or the deep dive; after
  // that, the help comes at once.
  const seen = d.s.deadEndBlocks?.includes(action.blockId) === true;
  if (!seen) {
    d.s.deadEndBlocks = [...(d.s.deadEndBlocks ?? []), action.blockId];
    append(d, {
      kind: 'feedback',
      depth,
      tone: 'info',
      message: 'noCannedAnswer',
    });
  }
  const active = editTop(d);
  const hintLeft =
    active !== undefined &&
    active.hintLevel < (stepOf(d, active).hints ?? []).length;
  const dive = active ? availableDeepDive(d, active) : undefined;
  if (!active || (!hintLeft && dive === undefined)) {
    append(d, {
      kind: 'feedback',
      depth,
      tone: 'info',
      message: 'noCannedAnswerField',
    });
    return;
  }
  if (seen) {
    askNextHelp(d, active, hintLeft ? 'hint' : 'deep_dive');
    return;
  }
  append(d, {
    kind: 'choice_card',
    depth: active.depth,
    purpose: 'ask_next',
    choices: [
      ...(hintLeft ? ['hint'] : []),
      ...(dive !== undefined ? ['deep_dive'] : []),
      'dismissed',
    ],
    status: 'open',
    blocking: false,
    stepId: active.stepId,
    ruleId: 'ask.no_canned_answer',
  });
}

const ASK_NEXT_REACTION: Reaction = {
  reactionId: 'ask.no_canned_answer',
  representation: 'ask_next',
};

/** The help an unanswered long-press leads to: the next hint, or the step's deep dive. */
function askNextHelp(d: Draft, frame: Frame, help: 'hint' | 'deep_dive') {
  closeOpenCards(d);
  if (help === 'hint') {
    giveHint(d, frame, ASK_NEXT_REACTION);
    return;
  }
  const id = availableDeepDive(d, frame);
  if (id !== undefined) {
    openDeepDive(d, frame, id, {
      ...ASK_NEXT_REACTION,
      representation: deepDiveRepresentation(d.c.deepDives.get(id)!),
    });
  }
}

function onAskField(
  d: Draft,
  action: Extract<LessonAction, { type: 'ask_field' }>,
) {
  const chip = action.chipId
    ? d.c.question.askChips?.find(c => c.id === action.chipId)
    : undefined;
  const text = action.text?.trim().slice(0, SHORT_TEXT);
  if (!chip && !text) {
    return;
  }
  const frame = top(d);
  d.events.push({
    ...eventBase(d, frame),
    t: 'ask',
    via: 'field',
    ...(text && { text }),
    source: 'local',
    snapshot: {
      ...askSnapshot(d),
      ...(chip && { chipId: chip.id }),
      ...(action.components && { components: action.components }),
    },
  });
  const depth = frame?.depth ?? 0;
  append(d, {
    kind: 'student',
    depth,
    content: chip
      ? { kind: 'rich', rich: chip.label }
      : { kind: 'text', text: text! },
  });
  append(
    d,
    chip
      ? { kind: 'ask_answer', depth, parts: chip.answer }
      : { kind: 'feedback', depth, tone: 'info', message: 'noCannedAnswer' },
  );
}

// ---------------------------------------------------------------------------
// Applying a planner decision.

/** Why this action cannot run in the current lesson state, or null. */
function stateRejects(d: Draft, a: Action): string | null {
  const frame = top(d);
  switch (a.kind) {
    case 'hint':
      return frame && frame.hintLevel < (stepOf(d, frame).hints?.length ?? 0)
        ? null
        : 'no hint left';
    case 'deep_dive':
      return frame && frame.depth < MAX_DEPTH && d.c.deepDives.has(a.deepDiveId)
        ? null
        : 'deep dive not possible here';
    case 'variant':
    case 'quiz':
    case 'revisit_prerequisite':
      return (frame?.depth ?? -1) < MAX_DEPTH ? null : 'depth cap';
    case 'walkthrough':
      return frame && walkthroughOf(d, frame) ? null : 'no walk-through here';
    case 'numeric_check':
      return frame?.lastRaw !== undefined && numericCheck(d, frame) !== null
        ? null
        : 'no numeric value to check';
    case 'ask_clarify':
    case 'show_component':
    case 'explain':
    case 'example':
      return frame ? null : 'needs an active card';
    default:
      return null;
  }
}

/** "your value + known = sum", every number from the engine (CLAUDE.md rule 1). */
function numericCheck(d: Draft, frame: Frame): Rich | null {
  const step = stepOf(d, frame);
  const check = 'check' in step ? step.check : undefined;
  const known = check ? d.c.loaded.values.get(check.known) : undefined;
  const v = frame.lastRaw === undefined ? null : parseNumeric(frame.lastRaw);
  if (!check || !known || !v?.ok) {
    return null;
  }
  const sum = add(v.value, known);
  return {
    ...check.text,
    math: `${fractionToLatex(v.value)} + ${fractionToLatex(
      known,
    )} = ${fractionToLatex(sum)}`,
  };
}

function applyAction(
  d: Draft,
  a: Action,
  decision: Decision,
  trigger: NonNullable<LessonState['pending']>['trigger'],
  pendingStepId: string,
) {
  const reaction: Reaction = {
    reactionId: decision.ruleId,
    representation: decision.representation ?? a.kind,
  };
  const frame = editTop(d);
  // Blocks written by the LLM (a component it chose included) are labelled as such.
  const ai: { trust?: 'ai_generated'; llmRequestId?: string } =
    decision.source === 'llm'
      ? {
          trust: 'ai_generated',
          ...(decision.llmRequestId !== undefined && {
            llmRequestId: decision.llmRequestId,
          }),
        }
      : {};
  switch (a.kind) {
    case 'continue':
      if (
        trigger === 'detour_closed' ||
        trigger === 'correct' ||
        trigger === 'self_report' ||
        trigger === 'revealed'
      ) {
        if (frame) {
          returnTo(d, frame);
        } else if (!d.s.finished) {
          advance(d);
        }
      } else if (trigger === 'not_sure' && frame) {
        const left = frame.hintLevel < (stepOf(d, frame).hints?.length ?? 0);
        if (!left) {
          append(d, {
            kind: 'feedback',
            depth: frame.depth,
            tone: 'info',
            message: 'ladderEnd',
          });
        }
      }
      return;
    case 'hint':
      giveHint(d, frame!, reaction);
      return;
    case 'deep_dive':
      openDeepDive(d, frame!, a.deepDiveId, {
        ...reaction,
        representation: deepDiveRepresentation(
          d.c.deepDives.get(a.deepDiveId)!,
        ),
      });
      return;
    case 'variant':
    case 'quiz': {
      const v = d.c.variants.get(a.variantId!)!;
      if (a.kind === 'variant' && a.offer && frame) {
        addCard(d, 'repair', decision, frame.stepId, { variantId: v.id });
        return;
      }
      openVariant(d, v, { ...reaction, representation: v.representation });
      return;
    }
    case 'revisit_prerequisite': {
      const v =
        d.c.menu
          .prerequisitesFor(a.skillId)
          .find(x => !d.s.shownVariants.includes(x.id)) ??
        d.c.menu.prerequisitesFor(a.skillId)[0]!;
      openVariant(d, v, { ...reaction, representation: v.representation });
      return;
    }
    case 'numeric_check':
      append(d, {
        kind: 'feedback',
        depth: frame!.depth,
        tone: 'info',
        rich: numericCheck(d, frame!)!,
        trust: 'engine_computed',
      });
      return;
    case 'ask_clarify':
      addCard(d, 'clarify', decision, frame!.stepId, {
        choices: a.choices ?? ['counting', 'why', 'link'],
      });
      return;
    case 'self_report':
      addCard(d, 'self_report', decision, pendingStepId);
      return;
    case 'compress_steps':
      if (!frame && !d.s.finished) {
        // Opt-in: the next step comes first, the offer sits just above its card.
        advance(d);
      }
      addCard(d, 'compress', decision, pendingStepId);
      return;
    case 'teacher_note':
      // B4 (2026-10-22): queued silently, no card (the walk-through or the
      // next hint is what the student sees).
      d.events.push({
        questionId: d.s.questionId,
        stepId: frame?.stepId ?? pendingStepId,
        t: 'teacher_note',
        noteId: nextKey(d, 'note'),
        skillIds: decision.diagnosis.skillIds.slice(0, 10),
        misconceptionIds: decision.diagnosis.misconceptionIds.slice(0, 10),
        ruleId: decision.ruleId,
        silent: true,
      });
      if (!frame && !d.s.finished) {
        advance(d);
      }
      return;
    case 'walkthrough': {
      const lines = frame ? walkthroughOf(d, frame) : undefined;
      if (!frame || !lines) {
        return;
      }
      closeOpenCards(d);
      append(d, {
        kind: 'walkthrough',
        depth: frame.depth,
        stepId: frame.stepId,
        lines,
        shown: 1,
        done: false,
      });
      logWalkthroughLine(d, frame, 0);
      return;
    }
    case 'show_component':
      append(d, {
        kind: 'tutor',
        depth: frame!.depth,
        rich: a.instruction,
        longPress: false,
        ...ai,
      });
      appendComponent(
        d,
        a.component,
        `plan-${d.s.seq + 1}`,
        frame!.depth,
        undefined,
        undefined,
        ai,
      );
      return;
    case 'explain':
    case 'example':
      for (const b of a.blocks) {
        if (b.type === 'tutor_text') {
          append(d, {
            kind: 'tutor',
            depth: frame!.depth,
            rich: b.text,
            longPress: false,
            ...ai,
          });
        } else if (b.type === 'math') {
          append(d, {
            kind: 'math',
            depth: frame!.depth,
            latex: b.latex,
            ...ai,
          });
        } else if (b.type === 'component') {
          appendComponent(
            d,
            b.spec,
            `plan-${d.s.seq + 1}`,
            frame!.depth,
            undefined,
            undefined,
            ai,
          );
        } else {
          for (const item of b.items) {
            append(d, {
              kind: 'tutor',
              depth: frame!.depth,
              rich: item,
              longPress: false,
              ...ai,
            });
          }
        }
      }
      return;
  }
}

function onApplyPlan(
  d: Draft,
  action: Extract<LessonAction, { type: 'apply_plan' }>,
) {
  const pending = d.s.pending;
  if (!pending) {
    return;
  }
  delete d.s.pending;
  // Validated again here: replay and LLM output go through the same gate.
  let decision = validateDecision(
    action.decision,
    d.c.menu,
    action.decision.source,
  );
  const actions = [
    decision.next,
    ...(decision.followUp ? [decision.followUp] : []),
  ];
  if (actions.some(a => rejectAction(a, d.c.menu) ?? stateRejects(d, a))) {
    decision = {
      ...decision,
      next: { kind: 'continue' },
      ruleId: 'fallback.not_applicable',
      source: 'fallback',
    };
    delete decision.followUp;
    delete decision.representation;
  }
  d.events.push({
    questionId: pending.questionId,
    stepId: pending.stepId,
    t: 'plan',
    trigger: pending.trigger,
    decision,
    ...(action.shownSource && { shownSource: action.shownSource }),
  });
  if (pending.trigger === 'request') {
    // One short line: what happens after "change method" / "easier".
    append(d, {
      kind: 'feedback',
      depth: top(d)?.depth ?? 0,
      tone: 'info',
      message: helpReason(d, decision.next),
    });
  }
  if (decision.nextMove) {
    // E2: every move decision is logged with what stopped it, if anything.
    d.events.push({
      questionId: pending.questionId,
      stepId: pending.stepId,
      t: 'next_move',
      ...decision.nextMove,
      ruleId: decision.ruleId,
    });
  }
  if (decision.ruleId === 'rule.after_reveal.fresh') {
    // D2: one line on why a new example comes (round 2).
    append(d, {
      kind: 'feedback',
      depth: top(d)?.depth ?? 0,
      tone: 'info',
      message: 'afterRevealReason',
    });
  }
  applyAction(d, decision.next, decision, pending.trigger, pending.stepId);
  if (decision.followUp) {
    applyAction(
      d,
      decision.followUp,
      decision,
      pending.trigger,
      pending.stepId,
    );
  }
  // A closed detour always ends by re-asking the question below it.
  const frame = top(d);
  const card = frame && d.s.items.find(i => i.key === frame.cardKey);
  if (card?.kind === 'question' && card.status === 'paused' && !d.s.pending) {
    returnTo(d, frame!);
  }
}

/**
 * The reason line after a help request (help chips, 2026-10-22): the detour
 * it opens, or, with nothing left, the next hint or "show the answer" once
 * the ladder is used up (never a dead end).
 */
function helpReason(d: Draft, next: Action): UiMessage {
  if (next.kind === 'deep_dive') {
    return 'helpReason.deepDive';
  }
  if (next.kind === 'variant') {
    const kind = d.c.variants.get(next.variantId)?.kind;
    return kind === 'simpler'
      ? 'helpReason.simpler'
      : kind === 'prerequisite'
      ? 'helpReason.prerequisite'
      : 'helpReason.alternative';
  }
  const frame = top(d);
  const card = frame && d.s.items.find(i => i.key === frame.cardKey);
  const hintsLeft =
    card?.kind === 'question' ? card.hintLevel < card.hintCount : false;
  return hintsLeft ? 'helpReason.hint' : 'helpReason.reveal';
}

// ---------------------------------------------------------------------------

export function startLesson(content: LessonContent, at = 0): StepResult {
  const d: Draft = {
    c: content,
    s: {
      questionId: content.question.id,
      items: [],
      stack: [],
      cursor: { group: 0, step: 0 },
      shownDeepDives: [],
      shownVariants: [],
      seq: 0,
      finished: false,
      compressed: false,
    },
    events: [],
    at,
  };
  append(d, {
    kind: 'statement',
    depth: 0,
    rich: content.loaded.exercise.statement,
  });
  append(d, { kind: 'statement', depth: 0, rich: content.question.goal });
  advance(d);
  return { state: d.s, events: d.events };
}

/** Actions by which the student acts on the top frame (a detour counts for the reveal unlock then). */
const ACTING = new Set<LessonAction['type']>([
  'answer',
  'not_sure',
  'hint',
  'reveal',
  'component_result',
  'skip',
  'request',
  'ask_longpress',
  'ask_field',
  'detour_acted',
]);

export function reduce(
  content: LessonContent,
  state: LessonState,
  action: LessonAction,
): StepResult {
  const d: Draft = {
    c: content,
    s: { ...state, items: [...state.items], stack: [...state.stack] },
    events: [],
    at: action.at,
  };
  // While a decision is pending only the decision itself is accepted.
  if (state.pending && action.type !== 'apply_plan') {
    return { state, events: [] };
  }
  if (ACTING.has(action.type) && top(d)?.ref.scope !== 'main') {
    const frame = editTop(d);
    if (frame && !frame.acted) {
      frame.acted = true;
    }
  }
  switch (action.type) {
    case 'answer':
      onAnswer(d, action);
      break;
    case 'not_sure':
      onNotSure(d);
      break;
    case 'hint': {
      const frame = editTop(d);
      if (frame) {
        closeOpenCards(d);
        giveHint(d, frame, null);
      }
      break;
    }
    case 'reveal':
      onReveal(d);
      break;
    case 'leave_deep_dive':
      onLeave(d);
      break;
    case 'ask_longpress':
      onAskLongPress(d, action);
      break;
    case 'ask_field':
      onAskField(d, action);
      break;
    case 'component_result':
      onComponentResult(d, action);
      break;
    case 'skip':
      onSkip(d, action);
      break;
    case 'gate_passed':
      if (d.s.gate?.stepId === action.stepId) {
        delete d.s.gate;
        if (action.how === 'skipped') {
          d.s.skippedGates = [...(d.s.skippedGates ?? []), action.stepId];
        }
        advance(d);
      }
      break;
    case 'request':
      onRequest(d, action);
      break;
    case 'card_choice':
      onCardChoice(d, action);
      break;
    case 'apply_plan':
      onApplyPlan(d, action);
      break;
    case 'detour_acted':
      break; // Marked above.
    case 'probe_drop':
      onProbeDrop(d);
      break;
    case 'walkthrough_next':
      onWalkthroughNext(d);
      break;
  }
  return { state: d.s, events: d.events };
}

/** The active asked step, for rendering its card. */
export function stepForRef(content: LessonContent, ref: AskRef): FrameStep {
  const key =
    ref.scope === 'main'
      ? stepKey.main(ref.questionId, ref.stepId)
      : ref.scope === 'mini'
      ? stepKey.mini(ref.deepDiveId)
      : stepKey.variant(ref.variantId);
  const step = content.steps.get(key);
  if (!step) {
    throw new Error(`missing step ${key}`);
  }
  return step;
}

/** The urn a card's components use: a variant's own experiment, else the exercise's. */
export function experimentForRef(
  content: LessonContent,
  ref: AskRef,
): Experiment | undefined {
  if (ref.scope === 'variant') {
    const v = content.variants.get(ref.variantId);
    if (v) {
      return variantContext(content.loaded.exercise, v).experiment;
    }
  }
  if (ref.scope === 'mini') {
    const dive = content.deepDives.get(ref.deepDiveId);
    if (dive) {
      return deepDiveContext(content.loaded.exercise, dive).experiment;
    }
  }
  return content.loaded.exercise.experiment;
}
