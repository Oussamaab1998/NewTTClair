import { serialize } from '../lines/editor';
import { buildTiles, MAX_TILES } from './tiles';
import { studentLine } from './sampleLines';

describe('buildTiles', () => {
  it('the statement numbers, then the values of his credited lines', () => {
    const tiles = buildTiles(
      ['10', '3'],
      [
        studentLine('L1', '10*9*8=720', 'credit'),
        studentLine('L2', '10*9*8/6=121', 'slip'),
        studentLine('L3', '10*9*8/(3*2*1)=120', 'credit'),
      ],
    );
    expect(tiles.map(t => [t.text, t.source])).toEqual([
      ['10', 'given'],
      ['3', 'given'],
      ['720', 'earned'],
      ['120', 'earned'],
    ]);
    expect(serialize(tiles[2]!.nodes)).toBe('720');
  });
  it('never a value he did not earn (a slip, an unchecked line)', () => {
    const tiles = buildTiles(
      [],
      [
        studentLine('L1', '10*9=91', 'slip'),
        studentLine('L2', '720/6=120', null),
      ],
    );
    expect(tiles).toEqual([]);
  });
  it('a fraction is a stacked fraction; a decimal is written with a comma; equal values once', () => {
    const tiles = buildTiles(
      ['0.5', '10'],
      [
        studentLine('L1', '60/120=1/2', 'credit'),
        studentLine('L2', '5+5=10', 'credit'),
      ],
    );
    expect(tiles.map(t => t.text)).toEqual(['0,5', '10']);
    const frac = buildTiles([], [studentLine('L1', '7/15', 'credit')]);
    expect(frac[0]?.nodes[0]?.k).toBe('frac');
  });
  it('at most MAX_TILES, keeping his newest values', () => {
    const lines = Array.from({ length: 12 }, (_, i) =>
      studentLine(`L${i}`, `${i + 20}`, 'credit'),
    );
    const tiles = buildTiles(['4'], lines);
    expect(tiles).toHaveLength(MAX_TILES);
    expect(tiles[0]?.text).toBe('4');
    expect(tiles[tiles.length - 1]?.text).toBe('31');
  });
});
