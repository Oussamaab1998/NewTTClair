/**
 * B3 content fields: `addresses` on deep dives and ask chips, `link` on
 * asked steps (an earlier result whose value the engine computes).
 */
import ex2 from './exercises/bac2022c-ex2.json';
import ex2Misconceptions from './exercises/bac2022c-ex2.misconceptions.json';
import { loadExercise } from './loader';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errorsOf = (raw: unknown) => {
  const r = loadExercise(raw, ex2Misconceptions);
  return r.ok ? [] : r.errors;
};
type Linked = { link?: { resultRef: string; text: Record<string, unknown> } };
const s7 = (raw: typeof ex2) =>
  raw.parts[0]!.groups[0]!.steps.find(s => s.id === 's7') as unknown as Linked;

describe('B3 content: clarify targets', () => {
  it('Ex 2 loads with them: pairs_listing serves "counting", why_complement serves "why", 1b/s7 links nNoZero', () => {
    expect(errorsOf(ex2)).toEqual([]);
    expect(ex2.deepDives.find(d => d.id === 'pairs_listing')).toMatchObject({
      addresses: ['counting'],
    });
    expect(
      ex2.parts[0]!.askChips!.find(c => c.id === 'why_complement'),
    ).toMatchObject({ addresses: ['why'] });
    expect(s7(ex2).link?.resultRef).toBe('nNoZero');
  });

  it('rejects a link to an unknown value', () => {
    const raw = clone(ex2);
    s7(raw).link!.resultRef = 'ghost';
    expect(errorsOf(raw)).toContain('1b/s7: link uses unknown value ghost');
  });

  it("rejects math in the link text (the value is the engine's)", () => {
    const raw = clone(ex2);
    s7(raw).link!.text.math = '3';
    expect(errorsOf(raw)).toContain(
      '1b/s7: link text has math (the value comes from the engine)',
    );
  });

  it('rejects an unknown clarify answer in addresses', () => {
    const raw = clone(ex2);
    (
      raw.deepDives.find(d => d.id === 'pairs_listing') as {
        addresses?: string[];
      }
    ).addresses = ['magic'];
    expect(errorsOf(raw).join('\n')).toMatch(/addresses/);
  });
});
