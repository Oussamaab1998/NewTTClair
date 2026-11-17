import { parseDevHybridActs } from './launch';

describe('-devHybridActs', () => {
  it('reads the acts in order', () => {
    expect(
      parseDevHybridActs(
        'start,dontKnow,dontKnow,line:2/3*1/4=1/6,back,choice:s_true,sheet:found',
      ),
    ).toEqual([
      { type: 'start' },
      { type: 'dontKnow' },
      { type: 'dontKnow' },
      { type: 'line', raw: '2/3*1/4=1/6' },
      { type: 'back' },
      { type: 'choice', optionId: 's_true' },
      { type: 'sheet', tab: 'found' },
    ]);
  });

  it('keeps the commas of a line (a decimal, C(n,k))', () => {
    expect(
      parseDevHybridActs('line:C(10,3)=120, line:0,5*2=1 ,dontKnow'),
    ).toEqual([
      { type: 'line', raw: 'C(10,3)=120' },
      { type: 'line', raw: '0,5*2=1' },
      { type: 'dontKnow' },
    ]);
  });

  it('ignores what it does not know, and an empty argument', () => {
    expect(parseDevHybridActs(null)).toEqual([]);
    expect(parseDevHybridActs('')).toEqual([]);
    expect(
      parseDevHybridActs('tap,line:,choice:,sheet:paper,sheet:road,Start'),
    ).toEqual([{ type: 'sheet', tab: 'road' }]);
  });
});
