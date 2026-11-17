/**
 * make_case on a TREE case (a prepared small case counted whole: n people,
 * a of them in A, af of those in F, naf of the others in F). The tool's
 * schema is not changed (the model can still only ask for a box or an urn);
 * the tree spec comes from the pack's prepared cases.
 */
import '../../method/library';
import { caseFacts } from '../move/pack';
import { caseHidesSlip } from '../move/tool';
import { plain } from '../checks/lines';
import {
  caseRuntime,
  newSession,
  treeCaseCounts,
  type CaseSpec,
} from '../session/state';
import { COMPUTE } from './compute';
import { MakeCaseSchema, toolDefinitions } from './schemas';

type TreeCase = Extract<CaseSpec, { kind: 'tree' }>;

const spec = (over: Partial<TreeCase> = {}): TreeCase => ({
  kind: 'tree',
  template: 'tree_conditional',
  node: 'f_given_na',
  n: 25,
  a: 16,
  af: 3,
  naf: 4,
  ...over,
});

const session = (known: string[] = []) => ({
  rt: newSession('synthetic-tree', 't2', null, known),
  experiment: null,
});

const make = (ctx: ReturnType<typeof session>, s: CaseSpec) =>
  COMPUTE.make_case!(ctx, { case: s, purpose: 'smaller' } as never);

interface Made {
  case_id: string;
  counts: Record<string, number>;
  rehearses: string;
  private_values: Record<string, string>;
  coincidences: string[];
  reused_numbers: string[];
}

describe('make_case on a tree case', () => {
  it("returns the case graph's values, its counts and the step it rehearses", () => {
    const ctx = session();
    const r = make(ctx, spec());
    expect(r.ok).toBe(true);
    const made = (r as { result: Made }).result;
    const graph = caseRuntime('x', spec())!.graph;
    expect(made.case_id).toBe('C1');
    expect(made.rehearses).toBe('f_given_na');
    expect(made.counts).toEqual(treeCaseCounts(spec()));
    expect(made.private_values).toEqual(
      Object.fromEntries(graph.nodes.map(n => [n.id, plain(n.value)])),
    );
    expect(made.private_values).toEqual({ not_a: '9/25', f_given_na: '4/9' });
    // The case is stored with its graph: his lines can be judged on it.
    expect(ctx.rt.state.cases.C1).toEqual(spec());
    expect(ctx.rt.graphs.get('C1')?.graph.domain).toBe('tree');
    // Its values and the counts on his screen are known numbers now.
    for (const n of ['9/25', '4/9', '25', '16', '9', '13', '7']) {
      expect(ctx.rt.state.known).toContain(n);
    }
  });

  it('names the slips whose value is the right value on the case', () => {
    // Taking the result to find the path that leads to it is right on any numbers.
    const other = spec({ template: 'tree_other_path', node: 'a_and_f' });
    const r = make(session(), other);
    const made = (r as { result: Made }).result;
    const table = caseRuntime('x', other)!.table;
    expect(made.coincidences).toEqual(
      table.dropped
        .filter(d => d.why === 'equals_right_value')
        .map(d => `${d.id} at ${d.nodeId}`),
    );
    expect(made.coincidences).toContain('uses_the_target at a_and_f');
    expect(caseHidesSlip(made.coincidences, 'uses_the_target')).toBe(true);
    expect(caseHidesSlip(made.coincidences, 'adds_along_path')).toBe(false);
    // The lesson's class of 25 hides no slip of the conditional.
    expect(
      (make(session(), spec()) as { result: Made }).result.coincidences,
    ).toEqual([]);
  });

  it('reports numbers already seen this session, as for an urn', () => {
    const r = make(session(['4/9']), spec());
    expect((r as { result: Made }).result.reused_numbers).toEqual([
      'f_given_na=4/9',
    ]);
  });

  it.each([
    ['af above a', spec({ af: 17 })],
    ['naf above n - a', spec({ naf: 10 })],
    ['nobody outside A', spec({ a: 25 })],
    ['a count that is not whole', spec({ n: 25.5 })],
  ])('refuses counts that make no tree: %s', (_name, bad) => {
    const ctx = session();
    const r = make(ctx, bad);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toMatch(/the counts do not make a tree/);
    expect(ctx.rt.state.cases).toEqual({});
  });

  it('refuses an unknown template and a step the template does not have', () => {
    expect(make(session(), spec({ template: 'tree_nowhere' }))).toMatchObject({
      ok: false,
    });
    const r = make(session(), spec({ node: 'na_given_nf' }));
    expect(!r.ok && r.error).toBe(
      'the template tree_conditional has no step na_given_nf',
    );
  });

  it('gives the pack its facts (caseFacts)', () => {
    const facts = caseFacts(spec(), ['2/3', '1/4', '5/12']);
    expect(facts.values).toEqual({ not_a: '9/25', f_given_na: '4/9' });
    expect(facts.coincidences).toEqual([]);
    expect(facts.reused).toEqual([]);
    expect(() => caseFacts(spec({ af: 17 }), [])).toThrow(/prepared case/);
  });

  it('leaves the tool as the model sees it: a box or an urn only', () => {
    expect(
      MakeCaseSchema.safeParse({ case: spec(), purpose: 'smaller' }).success,
    ).toBe(false);
    const def = toolDefinitions().find(t => t.name === 'make_case')!;
    expect(JSON.stringify(def)).not.toContain('tree');
    // An urn case comes back as before.
    const urn = make(session(), {
      kind: 'urn',
      reds: 2,
      blacks: 4,
      k: 3,
      j: 1,
    });
    expect(urn).toMatchObject({
      ok: true,
      result: { case_id: 'C1', k: 3, balls: expect.any(Array) },
    });
    expect(
      Object.keys((urn as { result: Record<string, unknown> }).result),
    ).toEqual([
      'case_id',
      'balls',
      'k',
      'private_values',
      'coincidences',
      'reused_numbers',
    ]);
  });
});
