/**
 * Pure model of UrnTemplate: a worked example on a fresh urn, generated and
 * verified by the engine (`engine/urnVariants.ts`), seeded so the same props
 * always show the same example. "Another example" moves to the next seed.
 * No React.
 */
import { parseRat, ratToString } from '../../engine/rationalFormat';
import {
  generateUrnVariant,
  type FreshParent,
  type UrnVariant,
} from '../../engine/urnVariants';
import { frac, type Fraction } from '../../engine/rational';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingHow, type FindingPayload } from './finding';
import { UrnTemplatePropsSchema, type UrnTemplateProps } from './schemas';

const parentOf = (p: UrnTemplateProps): FreshParent => ({
  ...(p.parent?.answer !== undefined && { answer: parseRat(p.parent.answer)! }),
  wrong: (p.parent?.wrong ?? []).map(w => parseRat(w)!),
});

/** The example `bump` presses of "another example" after the first. */
export function urnExample(p: UrnTemplateProps, bump: number): UrnVariant {
  return generateUrnVariant({
    templateId: p.templateId,
    seed: ((p.seed - 1 + bump) % 10000) + 1,
    parent: parentOf(p),
  });
}

export function urnFinding(
  v: UrnVariant,
  route: readonly string[],
  how: FindingHow,
): FindingPayload {
  const own = how === 'found' || how === 'helped';
  return makeFinding({
    findingId: v.templateId === 'urn_exactly_j' ? 'urn.example' : 'urn.table_example',
    numbers: {
      ...(v.templateId === 'urn_exactly_j'
        ? { reds: String(v.urn.reds), blacks: String(v.urn.blacks), k: String(v.urn.k) }
        : { trials: String(v.urn.k), p: ratToString(v.p!) }),
      j: String(v.j),
      answer: ratToString(v.answer),
    },
    route: route.slice(0, 12),
    how,
    correct: null,
    ...(own && { calc: v.lines }),
  });
}

const parseTemplate = (props: Record<string, unknown>): UrnTemplateProps | null => {
  const r = UrnTemplatePropsSchema.safeParse(props);
  return r.success ? r.data : null;
};

export const URN_TEMPLATE_REVEALS: readonly RevealRule[] = [
  {
    value: 'example_values',
    note: 'the worked example writes its own total, favourable count and answer for the examples of the next seeds; by construction none is the answer or a known wrong value of the parent step',
    by: 'props',
    minHint: 0,
    values: p => {
      const t = parseTemplate(p);
      if (!t) {
        return [];
      }
      const out: Fraction[] = [];
      for (let bump = 0; bump <= 4; bump++) {
        const v = urnExample(t, bump);
        out.push(v.answer, frac(v.urn.reds), frac(v.urn.blacks), frac(v.urn.k), frac(v.j));
      }
      return out;
    },
  },
];
