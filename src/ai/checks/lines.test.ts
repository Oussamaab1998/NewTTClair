import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import { mathSegments, readFreeText } from './freeText';
import {
  lineVerdict,
  matchOnGraph,
  readLine,
  type GraphRuntime,
} from './lines';

// bac2022c-sc-ex2 Question 1: 4 red, 6 black, 3 drawn together, exactly one red.
const graph = buildGraphFor(
  { template: 'urn_exactly_j', args: { j: 1 } },
  { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
);
const main: GraphRuntime = {
  id: 'main',
  graph,
  table: mutationsFor(graph),
  extra: [],
};
const none = new Set<string>();

const check = (raw: string, node?: string) => {
  const r = readLine(raw);
  return {
    v: lineVerdict(r),
    m: matchOnGraph(main, r.chain, none, node),
  };
};

describe('AI line checks on Question 1 (engine verdicts)', () => {
  it('credits the total written as a line, with or without the C notation', () => {
    for (const raw of ['10*9*8/(3*2*1)=120', '720/6=120', 'C(10,3)=120']) {
      const { v, m } = check(raw);
      expect(v).toMatchObject({ readable: true, equal: true, value: '120' });
      expect(m).toMatchObject({ verdict: 'credit', node: 'total' });
    }
    expect(check('C(10,3)=120').v.notation).toBe(true);
  });

  it('reads a line without "=" as its value, flagged unfinished', () => {
    const { v } = check('11*10*9');
    expect(v).toMatchObject({ unfinished: true, value: '990' });
    expect(check('10*9*8').m).toMatchObject({ node: 'ord' });
  });

  it('computes both readings of 720/3*2*1 and names the bracket slip', () => {
    const { v, m } = check('720/3*2*1=480');
    expect(v).toMatchObject({ equal: true, value: '480' });
    // His whole line with the brackets he may have meant; the value is its first side's.
    expect(v.readback).toEqual({
      grouped: '720/(3*2*1)=480',
      grouped_value: '120',
    });
    expect(m).toMatchObject({ verdict: 'slip', slip: 'bracket_left_to_right' });
  });

  it('names the missing division in the black part', () => {
    expect(check('6*5=30', 'fav_black').m).toMatchObject({
      verdict: 'slip',
      slip: 'drop_division',
      node: 'fav_black',
    });
  });

  it('flags a swapped ratio above one', () => {
    const { v, m } = check('120/60=2', 'result');
    expect(m).toMatchObject({
      verdict: 'slip',
      slip: 'swap_numerator_denominator',
    });
    expect(check('56/30=28/15').v.checks.above_one).toBe(true);
    expect(v.checks.above_one).toBe(false);
  });

  it('shows where the two sides of a line disagree', () => {
    expect(check('10*9*8=980').v).toMatchObject({
      equal: false,
      mismatch_at: 0,
      sides: [
        { text: '10*9*8', value: '720' },
        { text: '980', value: '980' },
      ],
    });
  });

  it('keeps a probability label apart and credits the result', () => {
    const { v, m } = check('P(A)=60/120=1/2');
    expect(v.label).toBe('P(A)');
    expect(m).toMatchObject({ verdict: 'credit', node: 'result' });
    expect(readLine('p(X=0)=7/10').label).toBe('p(X=0)');
  });

  it('notices a fraction written without simplifying', () => {
    expect(check('25/55').v.checks.unreduced_written).toBe(true);
    expect(check('5/11').v.checks.unreduced_written).toBe(false);
  });

  it('accepts powers and an x between digits as times', () => {
    expect(check('2^3=8').v).toMatchObject({ readable: true, equal: true });
    expect(check('11x10x9=990').v).toMatchObject({ equal: true });
  });

  it('says why a line cannot be read', () => {
    expect(check('10*(9').v).toMatchObject({
      readable: false,
      reason: 'syntax',
    });
  });
});

describe('maths inside a free answer', () => {
  it('keeps the maths of an Arabizi answer and drops the Arabizi digits', () => {
    expect(
      mathSegments(
        '7asb ma fi mo5i bch ne7sb lkol gadech li houma 8+3 =11 o madem bch nejbdou 3 na3ml haka 11*10*9 , kn jena bch nejbdou 4 na3ml 11*10*9*8',
      ),
    ).toEqual(['8+3 =11', '3', '11*10*9', '4', '11*10*9*8']);
    expect(
      mathSegments(
        'sondou9 fih 8 kwer , bcc nejbdou 3 , tirajet lkol = 8*7*6 =336 ama 5atr houma mch mnadhmin 336/3*2*1= 336/6 = 56',
      ),
    ).toEqual(['8', '3', '8*7*6 =336', '336/3*2*1= 336/6 = 56']);
    expect(
      mathSegments('R1 m3a 6 tirajs k7ol o R2 m3a 6 tiraj k7ol tji 12'),
    ).toEqual(['6', '6', '12']);
  });

  it('reads each segment with the engine', () => {
    const [a] = readFreeText('star lawl lezm nsal7ouh : 990/3*2*1 =660');
    expect(a?.verdict).toMatchObject({
      equal: true,
      value: '660',
      readback: { grouped_value: '165' },
    });
  });

  it('reads a solution written over several lines line by line', () => {
    expect(
      mathSegments('14*13*12=2184\n2184/6=364\nحمراء: 5\nكحل: 9*8=72, 72/2=36'),
    ).toEqual(['14*13*12=2184', '2184/6=364', '5', '9*8=72', '72/2=36']);
    expect(mathSegments('C(10, 3)=120; 0,5')).toEqual(['C(10, 3)=120', '0,5']);
  });

  it('finds nothing in a plain "I don\'t know"', () => {
    expect(mathSegments('ma na3rfch mnin nabda lhna')).toEqual([]);
  });
});

describe('what he did with a component', () => {
  it('counts actions, keeps findings and his note', () => {
    const { summariseEvents } = jest.requireActual(
      './autoCheck',
    ) as typeof import('./autoCheck');
    const s = summariseEvents([
      { name: 'box_opened', payload: { box: 'a-b-c' } },
      { name: 'box_opened', payload: { box: 'a-b-d' } },
      {
        name: 'finding',
        payload: {
          findingId: 'per_box',
          numbers: [6],
          correct: true,
          route: 'open',
          how: 'done',
        },
      },
      { name: 'explored', payload: { how: 'done', note: 'kol boite fiha 6' } },
    ]);
    expect(s.counts).toEqual({ box_opened: 2, finding: 1, explored: 1 });
    expect(s.findings).toEqual([
      { findingId: 'per_box', numbers: [6], correct: true, route: 'open' },
    ]);
    expect(s.notes).toEqual(['kol boite fiha 6']);
  });
});
