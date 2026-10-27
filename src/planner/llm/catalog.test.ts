import { CATALOG_META } from '../../components/catalogMeta';
import { COMPONENT_NAMES } from '../../components/contract';
import { REGISTRY } from '../../components/registry';
import { buildCatalog, catalogText } from './catalog';
import { plannerComponents } from './plannerFormat';

describe('component catalog (AI tutor v2)', () => {
  it('every registered component has catalog meta, and no unregistered name has any', () => {
    const registered = COMPONENT_NAMES.filter(n => REGISTRY[n]);
    expect(Object.keys(CATALOG_META).sort()).toEqual([...registered].sort());
  });

  it('lists exactly the components the LLM may show (no graded tasks)', () => {
    const ids = buildCatalog().map(e => e.id);
    expect(ids).toEqual(plannerComponents());
    for (const task of ['EventPicker', 'LawBuilder', 'VariationTableBuilder']) {
      expect(ids).not.toContain(task);
    }
  });

  it('entries carry when-to-use, skills, the student action and props without experiment fields', () => {
    const outcome = buildCatalog().find(e => e.id === 'OutcomeSpace');
    expect(outcome?.teaches).toEqual(REGISTRY.OutcomeSpace?.teaches);
    expect(outcome?.whenToUse.length).toBeGreaterThan(20);
    expect(outcome?.studentAction.length).toBeGreaterThan(5);
    expect(outcome?.props).not.toMatch(/\bballs\b|\bdraw\b|\bk\?:/);
    // LLM_PROPS_EXCLUDED: LawChart.law is never offered.
    expect(buildCatalog().find(e => e.id === 'LawChart')?.props).not.toMatch(
      /\blaw\??:/,
    );
    // Containers name their slots as Spec, not the full component list.
    expect(buildCatalog().find(e => e.id === 'PredictReveal')?.props).toContain(
      'reveal: Spec',
    );
  });

  it('is deterministic (part of the cached prompt prefix)', () => {
    expect(catalogText()).toBe(catalogText());
    expect(catalogText()).toMatchSnapshot();
  });

  it('tightened props (simulation 2026-10-22): NumericTwin rules, no FunctionPlot markers, the RTL rule for insight text', () => {
    const text = catalogText();
    const line = (id: string) =>
      text.split('\n').find(l => l.startsWith(`- ${id}:`)) ?? '';
    expect(line('NumericTwin')).toMatch(/Props rules: .*never LaTeX/);
    expect(line('FunctionPlot')).not.toMatch(/markers\?:/);
    expect(line('Urn')).toMatch(/Arabic script only/);
    expect(line('OutcomeSpace')).toMatch(/showCount false/);
  });
});

