/**
 * What a component on screen shows the simulated student, in plain words.
 * The harness cannot render React Native components, so the student model
 * reads this description instead, built from the props the tutor chose and,
 * for components that draw the urn, from the case it named (or the exercise
 * urn). Only what the component itself would show (its "Reveals" line in
 * src/components/catalogMeta.ts) is stated; a count the component writes
 * only after an action is said to appear after that action.
 */
import type { CaseSpec } from '../../src/ai/session/state';
import type { AskInput } from '../../src/ai/tools/schemas';
import { CATALOG_META } from '../../src/components/catalogMeta';
import type { ComponentName } from '../../src/components/contract';
import type { Experiment } from '../../src/engine/calls';
import { factorial, outcomeCountOf } from '../../src/engine/combinatorics';
import { listBoxes } from '../../src/engine/grouping';
import type { Ball } from '../../src/engine/probability';

export type ComponentInput = Extract<AskInput, { kind: 'component' }>;

export interface ComponentContext {
  /** The session's small cases (make_case). */
  cases: Readonly<Record<string, CaseSpec>>;
  /** The exercise urn, when the exercise has one. */
  experiment: Experiment | null;
}

/** Components whose balls come from the case or the exercise urn, not from props. */
const DRAWS_THE_URN = new Set([
  'Urn',
  'OutcomeSpace',
  'EventPicker',
  'ComplementView',
  'LawBuilder',
  'LawChart',
]);

interface UrnView {
  balls: Ball[];
  k: number;
  draw: Experiment['draw'];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** R1.., N1.. for coloured balls, a.. for letters, else the ball's number. */
export function ballLabel(b: Ball, all: readonly Ball[]): string {
  if (b.color === 'red' || b.color === 'black') {
    const same = all.filter(x => x.color === b.color);
    return `${b.color === 'red' ? 'R' : 'N'}${same.indexOf(b) + 1}`;
  }
  return /^[a-h]$/.test(b.id) ? b.id : String(b.value);
}

function urnOf(ctx: ComponentContext, caseId: string | null): UrnView | null {
  if (caseId !== null) {
    const spec = ctx.cases[caseId];
    if (!spec) {
      return null;
    }
    if (spec.kind === 'box') {
      return {
        balls: 'abcdefgh'
          .slice(0, spec.n)
          .split('')
          .map(id => ({ id, value: 0 })),
        k: spec.k,
        draw: 'simultaneous',
      };
    }
    return {
      balls: [
        ...Array.from({ length: spec.reds }, (_, i) => ({
          id: `r${i + 1}`,
          value: 1,
          color: 'red' as const,
        })),
        ...Array.from({ length: spec.blacks }, (_, i) => ({
          id: `n${i + 1}`,
          value: 0,
          color: 'black' as const,
        })),
      ],
      k: spec.k,
      draw: 'simultaneous',
    };
  }
  return ctx.experiment
    ? {
        balls: ctx.experiment.urn,
        k: ctx.experiment.k,
        draw: ctx.experiment.draw,
      }
    : null;
}

const labels = (balls: readonly Ball[]): string =>
  balls.map(b => ballLabel(b, balls)).join(' ');

const DRAW_WORDS: Record<Experiment['draw'], string> = {
  simultaneous: 'drawn together',
  ordered: 'drawn one after the other',
  ordered_with_replacement: 'drawn one after the other, put back each time',
};

/** Balls given in the props (GroupBoxes, ChoiceProduct stages). */
function propBalls(v: unknown): Ball[] {
  return Array.isArray(v)
    ? v.filter(isObj).map(b => ({
        id: String(b.id),
        value: typeof b.value === 'number' ? b.value : 0,
        ...(b.color === 'red' || b.color === 'black'
          ? { color: b.color as 'red' | 'black' }
          : {}),
      }))
    : [];
}

function describeUrnComponent(
  name: string,
  props: Record<string, unknown>,
  urn: UrnView,
): string {
  const head = `the balls ${labels(urn.balls)}, ${urn.k} ${
    DRAW_WORDS[urn.draw]
  }`;
  switch (name) {
    case 'Urn':
      return props.mode === 'select'
        ? `An urn with ${head}. You can tap balls to make one draw.`
        : `An urn with ${head}. You can look at the balls.`;
    case 'OutcomeSpace': {
      const count = outcomeCountOf(urn.draw, urn.balls.length, urn.k);
      return `Every possible draw of ${head} is shown as a tile you can scan and tap${
        props.showCount === false
          ? ''
          : `; the screen writes the count: ${count}`
      }.`;
    }
    case 'EventPicker':
      return `Every possible draw of ${head} is shown; you tap the draws of the event, then submit and it says if your choice is right.`;
    case 'ComplementView':
      return `A bar split between an event and its opposite, for ${head}; you can switch between the two.`;
    case 'LawBuilder':
      return `A table of the values of X with empty probability cells, for ${head}; you fill the cells.`;
    case 'LawChart':
      return `Bars of the law of X for ${head}; you reveal the steps one at a time.`;
    default:
      return `A picture of ${head}.`;
  }
}

function describeGroupBoxes(props: Record<string, unknown>): string {
  const balls = propBalls(props.balls);
  const k = typeof props.k === 'number' ? props.k : 0;
  if (balls.length === 0 || k < 1 || k > balls.length) {
    return 'Boxes of balls (the settings did not load).';
  }
  const boxes = listBoxes(balls, k);
  const first = boxes[0]?.ballIds.map(id =>
    ballLabel(balls.find(b => b.id === id)!, balls),
  );
  return [
    `Boxes, one for each group of ${k} balls among ${labels(balls)}: ${
      boxes.length
    } closed boxes are listed (the first holds ${first?.join(' ') ?? '?'}).`,
    `Opening a box shows every order of its balls (${factorial(
      k,
    )} rows for a box of ${k}); after the first box is opened the screen writes the number of boxes, the orders per box and the ordered draws.`,
    'You open boxes one at a time.',
  ].join(' ');
}

function describeChoiceProduct(props: Record<string, unknown>): string {
  const stages = Array.isArray(props.stages) ? props.stages.filter(isObj) : [];
  const parts = stages.map((st, i) => {
    const size = typeof st.size === 'number' ? st.size : 1;
    const balls = propBalls(st.balls);
    const names =
      balls.length > 0
        ? balls.map(b => ballLabel(b, balls))
        : Array.isArray(st.labels)
        ? st.labels.map(String)
        : [];
    const options =
      size > 1 && balls.length >= size
        ? listBoxes(balls, size).map(b =>
            b.ballIds
              .map(id => ballLabel(balls.find(x => x.id === id)!, balls))
              .join(''),
          )
        : names;
    return `stage ${i + 1} lists its options (${options.join(', ')})`;
  });
  return `Two stages of choice: ${parts.join(
    '; ',
  )}. You pick one option in each stage and see the cell they make; after both picks the screen writes the product and the sum.`;
}

function describePartWhole(props: Record<string, unknown>): string {
  const whole = String(props.whole ?? '?');
  if (props.mode === 'feedback') {
    return `A bar from 0 to ${whole} (the whole). Your own value ${String(
      props.part ?? '?',
    )} is placed on it${
      props.part !== undefined
        ? ', and flagged when it goes past the whole'
        : ''
    }.`;
  }
  if (props.mode === 'fraction_of_quantity') {
    return `A bar from 0 to ${whole}; you drag a handle to place ${String(
      props.fraction ?? 'the fraction',
    )} of it.`;
  }
  return `A bar from 0 to ${whole} (the whole); you drag a stepped handle to place a value.`;
}

function describeSlots(props: Record<string, unknown>): string {
  const n = typeof props.n === 'number' ? props.n : '?';
  const k = typeof props.k === 'number' ? props.k : '?';
  return `${n} slots in a row; you mark ${k} of them, add the pattern to your list, and are told when a pattern repeats. When you press "that is all" the screen writes how many patterns there are.`;
}

/** The component as the simulated student sees it on screen. */
export function describeComponent(
  input: ComponentInput,
  ctx: ComponentContext,
): string {
  let props: Record<string, unknown>;
  try {
    const p: unknown = JSON.parse(input.props_json);
    props = isObj(p) ? p : {};
  } catch {
    return `An interactive ${input.name} whose settings did not load (it shows nothing useful).`;
  }
  if (DRAWS_THE_URN.has(input.name)) {
    const urn = urnOf(ctx, input.case_id);
    return urn
      ? describeUrnComponent(input.name, props, urn)
      : `An interactive ${input.name} with no balls (case ${
          input.case_id ?? 'exercise'
        } not found): it shows nothing useful.`;
  }
  switch (input.name) {
    case 'GroupBoxes':
      return describeGroupBoxes(props);
    case 'ChoiceProduct':
      return describeChoiceProduct(props);
    case 'PartWholeBar':
      return describePartWhole(props);
    case 'SlotsPattern':
      return describeSlots(props);
    default: {
      const meta = CATALOG_META[input.name as ComponentName];
      return meta
        ? `An interactive ${input.name}. You: ${
            meta.studentAction
          } (settings: ${input.props_json.slice(0, 200)})`
        : `An unknown component ${input.name}.`;
    }
  }
}
