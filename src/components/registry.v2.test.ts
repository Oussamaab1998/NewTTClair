import * as registry from './registry';
import { CATALOG_META } from './catalogMeta';
import { COMPONENT_NAMES } from './contract';
import { PROBABILITY2_COMPONENTS } from './probability2/names';
import { completeReveals } from './reveals';
import { plannerComponents } from '../planner/llm/plannerFormat';

const real = registry.componentMeta;

describe('offeredToPlanner: new components stay out of the AI planner until its round', () => {
  it('missing means offered (nothing existing changes); false means not offered', () => {
    expect(registry.isOfferedToPlanner({})).toBe(true);
    expect(registry.isOfferedToPlanner({ offeredToPlanner: true })).toBe(true);
    expect(registry.isOfferedToPlanner({ offeredToPlanner: false })).toBe(false);
    expect(registry.isOfferedToPlanner(undefined)).toBe(false);
  });

  it('plannerComponents skips an entry flagged false, and only that one', () => {
    const before = plannerComponents();
    expect(before).toContain('Urn');
    const spy = jest
      .spyOn(registry, 'componentMeta')
      .mockImplementation(name =>
        name === 'Urn' ? { ...real('Urn')!, offeredToPlanner: false } : real(name),
      );
    try {
      const after = plannerComponents();
      expect(after).not.toContain('Urn');
      expect(after).toEqual(before.filter(n => n !== 'Urn'));
    } finally {
      spy.mockRestore();
    }
  });

  it('no registered component is flagged false yet except the new ones: today\'s registry is unchanged', () => {
    for (const name of COMPONENT_NAMES) {
      const meta = real(name);
      if (meta && !PROBABILITY2_COMPONENTS.includes(name)) {
        expect(meta.offeredToPlanner).toBeUndefined();
      }
    }
  });
});

describe('every probability2 component declares what it reveals (hard rule 9)', () => {
  it('is registered with reveals declared, offeredToPlanner false, and a catalog entry', () => {
    for (const name of PROBABILITY2_COMPONENTS) {
      const meta = real(name);
      expect(meta).toBeDefined();
      expect(Array.isArray(meta?.reveals)).toBe(true);
      expect(completeReveals(meta?.reveals)).toBe(true);
      expect(meta?.offeredToPlanner).toBe(false);
      expect(CATALOG_META[name]).toBeDefined();
      expect(Array.isArray(CATALOG_META[name]?.reveals)).toBe(true);
    }
  });

  it('offeredToPlanner may be true only with complete reveals (product owner, 2026-10-27)', () => {
    for (const name of PROBABILITY2_COMPONENTS) {
      const meta = real(name);
      if (meta && meta.offeredToPlanner !== false) {
        expect(completeReveals(meta.reveals)).toBe(true);
      }
    }
  });

  it('the list holds only registered, distinct names', () => {
    expect(new Set(PROBABILITY2_COMPONENTS).size).toBe(PROBABILITY2_COMPONENTS.length);
    for (const name of PROBABILITY2_COMPONENTS) {
      expect(COMPONENT_NAMES).toContain(name);
    }
  });
});

describe('the explored gate has an exit (change 2): the event name opens it, whatever `how` says', () => {
  it('opensGate looks at the name only, so a skipped exploration never traps the student', () => {
    // CurveCompare is a reserved name with no view: borrow it for one test.
    const table = registry.REGISTRY as Record<string, unknown>;
    table.CurveCompare = { ...real('Urn')!, gate: ['explored'] };
    try {
      expect(registry.isGate('CurveCompare')).toBe(true);
      expect(registry.opensGate('CurveCompare', 'explored')).toBe(true); // how: done or skipped alike
      expect(registry.opensGate('CurveCompare', 'finding')).toBe(false); // a finding is not a gate event
      expect(registry.opensGate('CurveCompare', 'cell_tapped')).toBe(false);
    } finally {
      delete table.CurveCompare;
    }
    expect(registry.isGate('CurveCompare')).toBe(false);
  });
});
