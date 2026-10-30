import { checkList, listedByFirstBall } from './repair';

const balls = ['a', 'b', 'c', 'd'].map(id => ({ id, label: id.toUpperCase() }));
// the four groups of three among four balls
const groups = [
  ['a', 'b', 'c'],
  ['a', 'b', 'd'],
  ['a', 'c', 'd'],
  ['b', 'c', 'd'],
];
const stage = { balls, groups };

describe('the list he builds', () => {
  it('a complete list, in any order and any order inside a group, is complete; duplicates are merged', () => {
    const v = checkList(
      stage,
      [
        ['d', 'c', 'b'],
        ['a', 'b', 'c'],
        ['c', 'a', 'd'],
        ['a', 'b', 'd'],
        ['a', 'c', 'b'],
      ],
      0,
    );
    expect(v.complete).toBe(true);
    expect(v.merged).toHaveLength(4);
  });

  it('an incomplete list: level 1 is the same whatever is missing (one group, or three)', () => {
    const one = checkList(stage, groups.slice(0, 3), 0);
    const three = checkList(stage, groups.slice(0, 1), 0);
    expect(one).toMatchObject({ complete: false, level: 1 });
    expect(three).toMatchObject({ complete: false, level: 1 });
    expect(JSON.stringify({ ...one, merged: 0 })).toBe(
      JSON.stringify({ ...three, merged: 0 }),
    );
  });

  it('level 2 names a ball of a missing group (the first ball that has one); level 3 adds one group', () => {
    const l2 = checkList(stage, groups.slice(0, 3), 1);
    expect(l2).toMatchObject({ level: 2, ball: 'b' });
    const l3 = checkList(stage, groups.slice(0, 2), 5);
    expect(l3.level).toBe(3);
    expect(l3.group).toEqual(['a', 'c', 'd']);
  });

  it('a group that is not among the groups is not counted (it cannot complete the list)', () => {
    const v = checkList(stage, [['a', 'b', 'z'], ...groups.slice(0, 3)], 0);
    expect(v.complete).toBe(false);
    expect(v.merged).toHaveLength(3);
  });

  it('listing by the first ball is a habit that is detected, not graded', () => {
    expect(listedByFirstBall(stage, groups)).toBe(true);
    expect(listedByFirstBall(stage, [groups[3]!, groups[0]!])).toBe(false);
  });
});
