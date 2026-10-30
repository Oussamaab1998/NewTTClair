import type { AskInput } from '../../src/ai/tools/schemas';
import type { Experiment } from '../../src/engine/calls';
import { componentsCell } from './cli';
import {
  describeComponent,
  type ComponentContext,
  type ComponentInput,
} from './describeComponent';
import { actText, describeInput, toAct, type SimAct } from './simStudent';

const act = (over: Partial<SimAct>): SimAct => ({
  kind: 'free',
  text: null,
  raw: null,
  option_id: null,
  ids: null,
  token: null,
  groups: null,
  ...over,
});

const urn4r6n: Experiment = {
  urn: [
    ...[1, 2, 3, 4].map(i => ({
      id: `r${i}`,
      value: 1,
      color: 'red' as const,
    })),
    ...[1, 2, 3, 4, 5, 6].map(i => ({
      id: `n${i}`,
      value: 0,
      color: 'black' as const,
    })),
  ],
  draw: 'simultaneous',
  k: 3,
};

const ctx: ComponentContext = {
  cases: {
    C1: { kind: 'box', n: 4, k: 2 },
    C2: { kind: 'urn', reds: 2, blacks: 4, k: 3, j: 1 },
  },
  experiment: urn4r6n,
};

const component = (
  name: string,
  props: unknown,
  caseId: string | null = null,
): ComponentInput => ({
  kind: 'component',
  name,
  props_json: JSON.stringify(props),
  case_id: caseId,
});

describe('simulated student acts', () => {
  it('turns a component act into an explored event carrying his words', () => {
    const a = toAct(act({ kind: 'component', text: '7allit boite, fiha 6' }));
    expect(a).toEqual({
      kind: 'component',
      events: [
        {
          name: 'explored',
          payload: { how: 'done', note: '7allit boite, fiha 6' },
        },
      ],
      result: null,
    });
    expect(actText(a)).toBe('component: 7allit boite, fiha 6');
  });

  it('turns a formula act into a formula with its raw text', () => {
    const a = toAct(act({ kind: 'formula', raw: 'C(n,k)*(1/2)^n' }));
    expect(a).toEqual({ kind: 'formula', raw: 'C(n,k)*(1/2)^n' });
    expect(actText(a)).toBe('formula: C(n,k)*(1/2)^n');
    // A formula written in the text field still counts.
    expect(toAct(act({ kind: 'formula', text: 'n/2' }))).toEqual({
      kind: 'formula',
      raw: 'n/2',
    });
  });

  it('keeps the other kinds as before', () => {
    expect(toAct(act({ kind: 'line', raw: '720/6=120' }))).toEqual({
      kind: 'line',
      raw: '720/6=120',
    });
    expect(toAct(act({ kind: 'dont_know' }))).toEqual({ kind: 'dont_know' });
  });
});

describe('what the student is told about the input', () => {
  it('describes a formula field', () => {
    const input: AskInput = {
      kind: 'formula',
      expect: { expr: 'n/2', vars: ['n'] },
    };
    expect(describeInput(input)).toContain('letters n and k allowed');
  });

  it('describes a component with what it shows', () => {
    const input = component('Urn', { mode: 'select' }, 'C1');
    expect(describeInput(input, ctx)).toBe(
      'input: an interactive component on screen. An urn with the balls a b c d, 2 drawn together. You can tap balls to make one draw. Use it, then answer with kind "component" saying what you did and noticed',
    );
    expect(describeInput(input)).toContain('interactive component (Urn)');
  });
});

describe('component descriptions', () => {
  it('GroupBoxes: the closed boxes and what opening one shows', () => {
    const d = describeComponent(
      component('GroupBoxes', {
        balls: [
          { id: 'r1', value: 1, color: 'red' },
          { id: 'r2', value: 1, color: 'red' },
          { id: 'n1', value: 0, color: 'black' },
          { id: 'n2', value: 0, color: 'black' },
        ],
        k: 3,
      }),
      ctx,
    );
    expect(d).toContain(
      'one for each group of 3 balls among R1 R2 N1 N2: 4 closed boxes are listed (the first holds R1 R2 N1)',
    );
    expect(d).toContain('6 rows for a box of 3');
  });

  it('Urn on a box case and on the exercise urn', () => {
    expect(describeComponent(component('Urn', {}, 'C1'), ctx)).toBe(
      'An urn with the balls a b c d, 2 drawn together. You can look at the balls.',
    );
    expect(describeComponent(component('Urn', {}), ctx)).toBe(
      'An urn with the balls R1 R2 R3 R4 N1 N2 N3 N4 N5 N6, 3 drawn together. You can look at the balls.',
    );
  });

  it('OutcomeSpace writes the count only when showCount is not off', () => {
    expect(
      describeComponent(component('OutcomeSpace', {}, 'C2'), ctx),
    ).toContain('the screen writes the count: 20');
    expect(
      describeComponent(
        component('OutcomeSpace', { showCount: false }, 'C2'),
        ctx,
      ),
    ).not.toContain('count');
  });

  it('says when the settings or the case do not load', () => {
    expect(
      describeComponent(
        { kind: 'component', name: 'Urn', props_json: '{', case_id: null },
        ctx,
      ),
    ).toContain('did not load');
    expect(describeComponent(component('Urn', {}, 'C9'), ctx)).toContain(
      'not found',
    );
  });

  it('ChoiceProduct lists each stage, a pair stage as pairs', () => {
    const d = describeComponent(
      component('ChoiceProduct', {
        stages: [
          {
            size: 1,
            balls: [
              { id: 'r1', value: 1, color: 'red' },
              { id: 'r2', value: 1, color: 'red' },
            ],
          },
          {
            size: 2,
            balls: [
              { id: 'n1', value: 0, color: 'black' },
              { id: 'n2', value: 0, color: 'black' },
              { id: 'n3', value: 0, color: 'black' },
            ],
          },
        ],
      }),
      ctx,
    );
    expect(d).toContain('stage 1 lists its options (R1, R2)');
    expect(d).toContain('stage 2 lists its options (N1N2, N1N3, N2N3)');
  });
});

describe('summary cell', () => {
  it('lists components by name', () => {
    expect(componentsCell({ Urn: 1, GroupBoxes: 2 })).toBe(
      'GroupBoxes:2|Urn:1',
    );
    expect(componentsCell({})).toBe('');
  });
});
