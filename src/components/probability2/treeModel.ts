/**
 * Pure model of ProbabilityTree: the leaves and their paths, the expression
 * of a path (its visible values with a multiplication sign between them,
 * never a result), the spoken description of the picture, its finding and
 * what it reveals. The picture computes nothing: every value it writes is one
 * of its props. No React.
 */
import type { TFunction } from 'i18next';

import { frac, type Fraction } from '../../engine/rational';
import { parseRat } from '../../engine/rationalFormat';
import { pathTo } from '../../engine/tree';
import type { RevealRule } from '../reveals';
import { makeFinding, type FindingPayload } from './finding';
import {
  ProbabilityTreePropsSchema,
  engineTree,
  type ProbabilityTreeProps,
  type TreeLeafProps,
} from './schemas';
import { countForm, parseTreeLabel, valueForm, valueParts } from './treeText';

/** Every branch in reading order: a branch, then the branches leaving its end. */
export const allEdges = (p: ProbabilityTreeProps): TreeLeafProps[] =>
  p.branches.flatMap(b => [b, ...(b.children ?? [])]);

/** The ends of the paths, top to bottom. */
export const leafIds = (p: ProbabilityTreeProps): string[] =>
  p.branches.flatMap(b => (b.children ? b.children.map(c => c.id) : [b.id]));

/** The branches from the root to the end of `id` (the engine walks the tree), or null. */
export function pathOf(
  p: ProbabilityTreeProps,
  id: string,
): TreeLeafProps[] | null {
  const ids = pathTo(engineTree(p.branches), id)?.map(b => b.id);
  if (!ids) {
    return null;
  }
  const byId = new Map(allEdges(p).map(e => [e.id, e]));
  return ids.flatMap(x => byId.get(x) ?? []);
}

/** Does the picture write the value of this branch (its count, in counts mode)? */
export function showsValue(e: TreeLeafProps, counts: boolean): boolean {
  const form = counts ? countForm(e, true) : valueForm(e, false);
  return form !== null && form.kind !== 'unknown';
}

/** Every branch of the path to this leaf shows its value. */
export function pathKnown(p: ProbabilityTreeProps, leaf: string): boolean {
  const counts = p.rootCount !== undefined;
  return pathOf(p, leaf)?.every(e => showsValue(e, counts)) ?? false;
}

/**
 * The path to a leaf as an expression: the values written on its branches
 * with a multiplication sign between them, never their product. Null when a
 * branch of the path shows no value, and in counts mode (counts are not
 * multiplied).
 */
export function pathLatex(
  p: ProbabilityTreeProps,
  leaf: string,
): string | null {
  if (p.rootCount !== undefined || !pathKnown(p, leaf)) {
    return null;
  }
  return (pathOf(p, leaf) ?? [])
    .map(e => {
      const v = valueParts(e.p ?? '');
      return v.kind === 'frac' ? `\\frac{${v.num}}{${v.den}}` : v.text;
    })
    .join(' \\times ');
}

/** What the student did with the tree: how many paths it has and how many are fully written. Never a product. */
export function treeFinding(
  p: ProbabilityTreeProps,
  route: readonly string[],
): FindingPayload {
  const leaves = leafIds(p);
  return makeFinding({
    findingId: 'tree.paths',
    numbers: {
      leaves: String(leaves.length),
      known: String(leaves.filter(id => pathKnown(p, id)).length),
    },
    route: route.slice(0, 12),
    how: 'found',
    correct: null,
  });
}

/** A label as it is said: the letter, or "not A" for an overline. */
export function spokenLabel(latex: string, t: TFunction): string {
  const l = parseTreeLabel(latex);
  return l.overline ? t('pv2.tree.not', { label: l.text }) : l.text;
}

/**
 * The whole picture in words, branch by branch in reading order: its value
 * as written, "unknown" for a "?", "empty" for a blank branch, and whether it
 * is the branch of the current step or the value asked for.
 */
export function describeTree(p: ProbabilityTreeProps, t: TFunction): string {
  const counts = p.rootCount !== undefined;
  const value = (e: TreeLeafProps): string => {
    const form = counts ? countForm(e, true) : valueForm(e, false);
    if (form === null) {
      return t('pv2.tree.blank');
    }
    if (form.kind === 'unknown') {
      return t('pv2.tree.unknown');
    }
    const text = form.kind === 'frac' ? `${form.num}/${form.den}` : form.text;
    return e.show === 'found' ? t('pv2.tree.found', { value: text }) : text;
  };
  const sentence = (e: TreeLeafProps, parent: TreeLeafProps | null): string =>
    [
      parent
        ? t('pv2.tree.branchAfter', {
            parent: spokenLabel(parent.latex, t),
            label: spokenLabel(e.latex, t),
            value: value(e),
          })
        : t('pv2.tree.branch', {
            label: spokenLabel(e.latex, t),
            value: value(e),
          }),
      ...(p.mark.includes(e.id) ? [t('pv2.tree.marked')] : []),
      ...(p.ask === e.id ? [t('pv2.tree.asked')] : []),
    ].join(' ');
  return [
    t('pv2.tree.title'),
    ...(p.rootCount === undefined
      ? []
      : [t('pv2.tree.root', { count: String(p.rootCount) })]),
    ...p.branches.flatMap(b => [
      sentence(b, null),
      ...(b.children ?? []).map(c => sentence(c, b)),
    ]),
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Reveals

export const PROBABILITY_TREE_REVEALS: readonly RevealRule[] = [
  {
    value: 'branch_values',
    note: 'the tree writes the values passed in its props and shown as given or found (in counts mode: the count at the root and every shown count); a hidden or blank branch writes nothing, and no product or sum is ever computed on screen',
    by: 'props',
    minHint: 0,
    values: props => {
      const r = ProbabilityTreePropsSchema.safeParse(props);
      if (!r.success) {
        return [];
      }
      const counts = r.data.rootCount !== undefined;
      const out: Fraction[] = counts ? [frac(r.data.rootCount ?? 0)] : [];
      for (const e of allEdges(r.data)) {
        if (!showsValue(e, counts)) {
          continue;
        }
        const v = counts ? frac(e.count ?? 0) : parseRat(e.p ?? '');
        if (v) {
          out.push(v);
        }
      }
      return out;
    },
  },
];
