import type { Finding } from '../content/schema';
import { buildUrnGraph } from './graph';
import { buildFindings, fillSkeleton } from './findings';

const graph = buildUrnGraph({ reds: 4, blacks: 6, k: 3, j: 1 });
const rich = (s: string) => ({ ar: [{ ar: s }] });
const findings: Finding[] = [
  {
    id: 'f_total',
    title: rich('t'),
    nodes: ['total'],
    reasons: { total: rich('r') },
    rule: { text: rich('rule'), condition: rich('cond') },
    bridge: true,
  },
  {
    id: 'f_fav',
    title: rich('f'),
    nodes: ['fav_red', 'fav_black', 'fav'],
    reasons: {},
    viaCard: 'p_reason',
    rule: { text: rich('rule2'), condition: rich('cond2') },
    bridge: true,
  },
];
const base = {
  findings,
  graph,
  methodId: 'm1',
  picks: {} as Record<string, string>,
  trueCard: (pick: string, card: string) =>
    pick === 'm1.p_reason' && card === 'r_true',
};

describe('what he found is built from his own accepted lines only', () => {
  it('a derived total gives its line, its reason, the rule with its condition and the bridge to the exam notation', () => {
    const r = buildFindings({
      ...base,
      lines: { total: '10*9*8/(3*2*1) = 120' },
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.lines).toEqual([
      { nodeId: 'total', raw: '10*9*8/(3*2*1) = 120', reason: rich('r') },
    ]);
    expect(r[0]!.rule).toEqual({ text: rich('rule'), condition: rich('cond') });
    expect(r[0]!.bridge).toEqual([
      {
        nodeId: 'total',
        did: '10*9*8/(3*2*1) = 120',
        exam: 'C_{10}^{3} = 120',
      },
    ]);
  });

  it('a bare 120 is "unexplained": no line, no rule, no bridge', () => {
    expect(buildFindings({ ...base, lines: { total: '120' } })).toEqual([]);
  });

  it('a bare 4 is fine for the red part (it is a count); the rule waits for every node and the right reason', () => {
    const lines = {
      fav_red: '4',
      fav_black: '6*5/(2*1) = 15',
      fav: '4*15 = 60',
    };
    const noPick = buildFindings({ ...base, lines });
    expect(noPick[0]!.lines.map(l => l.nodeId)).toEqual([
      'fav_red',
      'fav_black',
      'fav',
    ]);
    expect(noPick[0]!.rule).toBeNull(); // the combine reason was not picked right
    const withPick = buildFindings({
      ...base,
      lines,
      picks: { 'm1.p_reason': 'r_true' },
    });
    expect(withPick[0]!.rule).not.toBeNull();
    expect(withPick[0]!.bridge.map(b => b.exam)).toEqual([
      'C_{4}^{1} = 4',
      'C_{6}^{2} = 15',
    ]);
  });

  it('a finding with some nodes missing shows what there is and no rule', () => {
    const r = buildFindings({
      ...base,
      lines: { fav_black: '6*5/(2*1) = 15' },
      picks: { 'm1.p_reason': 'r_true' },
    });
    expect(r[0]!.lines).toHaveLength(1);
    expect(r[0]!.rule).toBeNull();
  });

  it('nothing is invented: the same log twice gives the same findings', () => {
    const a = buildFindings({
      ...base,
      lines: { total: '10*9*8/(3*2*1) = 120' },
    });
    const b = buildFindings({
      ...base,
      lines: { total: '10*9*8/(3*2*1) = 120' },
    });
    expect(a).toEqual(b);
  });
});

describe('the paper skeleton fills from accepted lines only', () => {
  const skeleton = [
    { id: 'k1', fr: 'Le nombre de tirages possibles est {total}.' },
    { id: 'k3', fr: 'Donc P(A) = {fav}/{total} = {result}.' },
  ];
  it('a blank is filled with the value of his line; the others stay blank, never a value he did not compute', () => {
    const r = fillSkeleton({
      skeleton,
      graph,
      lines: { total: '10*9*8/(3*2*1) = 120' },
    });
    expect(r[0]!.parts).toEqual([
      { text: 'Le nombre de tirages possibles est ' },
      { node: 'total', value: '120' },
      { text: '.' },
    ]);
    expect(r[1]!.parts.filter(p => 'node' in p)).toEqual([
      { node: 'fav', value: null },
      { node: 'total', value: '120' },
      { node: 'result', value: null },
    ]);
  });

  it('an unexplained line fills nothing', () => {
    const r = fillSkeleton({ skeleton, graph, lines: { total: '120' } });
    expect(r[0]!.parts.find(p => 'node' in p)).toEqual({
      node: 'total',
      value: null,
    });
  });
});
