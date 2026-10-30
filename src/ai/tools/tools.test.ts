import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import { newSession, type SessionRuntime } from '../session/state';
import { BOOKKEEPING } from './bookkeeping';
import { COMPUTE, judgeLine, type ToolContext } from './compute';
import { toolDefinitions, toolNamed, TOOL_SPECS } from './schemas';

function q1(): ToolContext {
  const graph = buildGraphFor(
    { template: 'urn_exactly_j', args: { j: 1 } },
    { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
  );
  const rt: SessionRuntime = newSession(
    'bac2022c-sc-ex2',
    '1',
    { id: 'main', graph, table: mutationsFor(graph), extra: [] },
    ['4', '6', '3', '10', '1/2'],
  );
  return { rt, experiment: null };
}

const run = (ctx: ToolContext, name: string, input: unknown) =>
  (COMPUTE[name] ?? BOOKKEEPING[name])!(ctx, input as never);

describe('tool definitions', () => {
  it('are sorted by name, without $schema, one per spec', () => {
    const defs = toolDefinitions();
    expect(defs.map(d => d.name)).toEqual(
      [...TOOL_SPECS.map(t => t.name)].sort(),
    );
    expect(defs.every(d => !('$schema' in d.input_schema))).toBe(true);
    expect(JSON.stringify(toolDefinitions())).toBe(JSON.stringify(defs));
  });

  it('accept a tool name that differs only in letter case', () => {
    expect(toolNamed('Ask_Student')?.name).toBe('ask_student');
    expect(toolNamed('nope')).toBeUndefined();
  });
});

describe('compute tools', () => {
  it('evaluate gives exact sides and makes the values known', () => {
    const ctx = q1();
    const r = run(ctx, 'evaluate', { lines: ['336/(3*2*1)=56'] });
    expect(r).toMatchObject({
      ok: true,
      result: [{ equal: true, value: '56' }],
    });
    expect(ctx.rt.state.known).toEqual(expect.arrayContaining(['336', '56']));
  });

  it('check_line matches the expected node', () => {
    const ctx = q1();
    expect(
      run(ctx, 'check_line', {
        line: '6*5/(2*1)=15',
        expect: { kind: 'node', graph: 'main', node: 'fav_black' },
      }),
    ).toMatchObject({
      ok: true,
      result: { match: { verdict: 'credit', node: 'fav_black' } },
    });
  });

  it('test_rule breaks "always /2" on three balls out of five', () => {
    const r = run(q1(), 'test_rule', {
      rule: 'o/2',
      predicts: 'groups',
      cases: [
        { n: 4, k: 2 },
        { n: 5, k: 3 },
      ],
    });
    expect(r).toMatchObject({
      ok: true,
      result: [
        { predicted: '6', actual: '6', holds: true },
        { predicted: '30', actual: '10', holds: false, listable_by_hand: true },
      ],
    });
  });

  it('make_case warns about the 3-out-of-4 coincidence and reused numbers', () => {
    const ctx = q1();
    const r = run(ctx, 'make_case', {
      case: { kind: 'box', n: 4, k: 3 },
      purpose: 'smaller',
    });
    expect(r).toMatchObject({
      ok: true,
      result: {
        case_id: 'C1',
        balls: ['a', 'b', 'c', 'd'],
        private_values: { ordered: '24', orderings: '6', groups: '4' },
      },
    });
    const res = (r as { result: { coincidences: string[] } }).result;
    expect(res.coincidences).toContain('balls n = groups');
  });

  it('a box case lists its groups and credits the right count', () => {
    const ctx = q1();
    run(ctx, 'make_case', {
      case: { kind: 'box', n: 4, k: 2 },
      purpose: 'smaller',
    });
    expect(
      run(ctx, 'list_outcomes', {
        case_id: 'C1',
        what: 'groups',
        reds_exactly: null,
      }),
    ).toMatchObject({
      ok: true,
      result: { count: 6, items: ['a b', 'a c', 'a d', 'b c', 'b d', 'c d'] },
    });
    expect(
      judgeLine(ctx.rt, '4*3=12', {
        kind: 'node',
        graph: 'C1',
        node: 'ordered',
      }).match,
    ).toMatchObject({ verdict: 'credit', node: 'ordered' });
    expect(
      judgeLine(ctx.rt, '4*3=12', { kind: 'node', graph: 'C1', node: 'groups' })
        .match,
    ).toMatchObject({ verdict: 'other_step', node: 'ordered' });
  });

  it('an urn case is a graph lines are matched on', () => {
    const ctx = q1();
    const r = run(ctx, 'make_case', {
      case: { kind: 'urn', reds: 2, blacks: 4, k: 3, j: 1 },
      purpose: 'smaller',
    });
    expect(r).toMatchObject({
      ok: true,
      result: { case_id: 'C1', private_values: { total: '20', fav: '12' } },
    });
    expect(
      run(ctx, 'list_outcomes', {
        case_id: 'C1',
        what: 'groups',
        reds_exactly: 1,
      }),
    ).toMatchObject({ ok: true, result: { count: 12 } });
  });

  it('a value expectation checks simplification', () => {
    const ctx = q1();
    expect(
      judgeLine(ctx.rt, '15/25=3/5', {
        kind: 'value',
        expr: '15/25',
        reduced: true,
      }).match,
    ).toMatchObject({ verdict: 'credit', unsimplified: false });
    expect(
      judgeLine(ctx.rt, '15/25', { kind: 'value', expr: '3/5', reduced: true })
        .match,
    ).toMatchObject({ verdict: 'credit', unsimplified: true });
  });

  it('refuses bad inputs with a reason', () => {
    expect(
      run(q1(), 'make_case', {
        case: { kind: 'urn', reds: 1, blacks: 1, k: 3, j: 1 },
        purpose: 'smaller',
      }),
    ).toMatchObject({ ok: false });
    expect(
      run(q1(), 'test_rule', {
        rule: 'x+1',
        predicts: 'groups',
        cases: [{ n: 4, k: 2 }],
      }),
    ).toMatchObject({ ok: false });
  });
});

describe('bookkeeping tools', () => {
  it('the paper fills only from his own credited lines', () => {
    const ctx = q1();
    const j = judgeLine(ctx.rt, '720/6=120', {
      kind: 'node',
      graph: 'main',
      node: 'total',
    });
    ctx.rt.state.lines.push({
      id: 'L1',
      raw: '720/6=120',
      turn: 1,
      graph: 'main',
      expected: 'total',
      verdict: j.verdict,
      match: j.match,
    });
    expect(
      run(ctx, 'write_paper', {
        lines: [
          {
            fr: 'Tirage simultané de 3 boules parmi 10 : C(10,3) = 120 tirages.',
            from_line: 'L1',
          },
        ],
      }),
    ).toMatchObject({ ok: true });
    expect(
      run(ctx, 'write_paper', {
        lines: [{ fr: 'P(A) = 60/120', from_line: 'L1' }],
      }),
    ).toMatchObject({ ok: false });
    expect(
      run(ctx, 'write_paper', {
        lines: [{ fr: 'Donc P(A) = 1/2.', from_line: null }],
      }),
    ).toMatchObject({ ok: true });
  });

  it('the roadmap names steps without numbers', () => {
    const ctx = q1();
    const base = {
      stages: [
        { id: 'plan', title: 'الخطة' },
        { id: 'total', title: 'نعدّو الكل' },
      ],
      current: 'plan',
      done: [],
      now: 'نرتّبو الخطوات',
      why: 'باش نعرفو شنوّة نعملو',
      next: 'نعدّو الكل',
    };
    expect(run(ctx, 'set_roadmap', base)).toMatchObject({ ok: true });
    expect(
      run(ctx, 'set_roadmap', { ...base, now: 'نحسبو ستّة' }),
    ).toMatchObject({ ok: true });
    expect(
      run(ctx, 'set_roadmap', { ...base, why: 'نقسمو على 6' }),
    ).toMatchObject({ ok: false });
  });
});
