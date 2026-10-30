/**
 * The registry of graph templates (docs/METHOD_LESSON_PLAN.md, addendum C and
 * D): a template turns the arguments of a `method` block into the expected
 * solution graph and says which plan-card keys it has. Questions are DATA
 * that name a template; a new kind of question adds an entry HERE (domain
 * code), never a line of the reducer, the loader or the schema.
 */
import { EngineError, type Fraction } from '../engine/rational';
import { buildUrnGraph, type Graph, type Order } from './graph';

export interface GraphCtx {
  /** The exercise's urn counts (reds, blacks, balls drawn), when it has one. */
  urn?: { reds: number; blacks: number; k: number };
  /** Values of earlier questions' nodes (cross-question inputs). */
  inputs: Readonly<Record<string, Fraction>>;
}

export type Args = Readonly<Record<string, unknown>>;

export interface Template {
  id: string;
  /** The plan-card keys of the template, in route order. */
  cardKeys: readonly string[];
  build(args: Args, ctx: GraphCtx): Graph;
  /** The engine call whose value a card's main node has, for the procedure rows of the content. */
  call?(
    cardKey: string,
    args: Args,
    ctx: GraphCtx,
  ): { fn: string; args: unknown } | null;
}

const int = (args: Args, key: string, fallback?: number): number => {
  const v = args[key];
  if (typeof v === 'number' && Number.isInteger(v)) {
    return v;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new EngineError(`template argument ${key} must be an integer`);
};

/** The urn of a question: its own arguments, else the exercise's. */
export function urnOf(
  args: Args,
  ctx: GraphCtx,
): { reds: number; blacks: number; k: number } {
  const own = ['reds', 'blacks', 'k'].every(k => typeof args[k] === 'number');
  if (own) {
    return {
      reds: int(args, 'reds'),
      blacks: int(args, 'blacks'),
      k: int(args, 'k'),
    };
  }
  if (!ctx.urn) {
    throw new EngineError(
      'this template needs the exercise urn or reds, blacks and k',
    );
  }
  return ctx.urn;
}

const eventExactly = (j: number) => ({
  id: 'value_eq',
  args: { valueFn: { id: 'count_value', args: { value: 1 } }, value: j },
});

const URN_CARDS = ['total', 'fav', 'ratio'] as const;

/** "Exactly j red among the k drawn" (j = 0 is "no red"): the nodes are generic over j. */
const urnExactlyJ: Template = {
  id: 'urn_exactly_j',
  cardKeys: URN_CARDS,
  build(args, ctx) {
    const u = urnOf(args, ctx);
    const order: Order = args.order === 'ordered' ? 'ordered' : 'unordered';
    const g = buildUrnGraph({ ...u, j: int(args, 'j') }, order);
    return { ...g, template: 'urn_exactly_j', cards: URN_CARDS };
  },
  call(cardKey, args) {
    const event = eventExactly(int(args, 'j'));
    return cardKey === 'total'
      ? { fn: 'outcomeCount', args: {} }
      : cardKey === 'fav'
      ? { fn: 'count', args: { event } }
      : cardKey === 'ratio'
      ? { fn: 'probability', args: { event } }
      : null;
  },
};

const REGISTRY = new Map<string, Template>([[urnExactlyJ.id, urnExactlyJ]]);

/** Domain modules register their templates here (Question 2, Question 3). */
export function registerTemplate(t: Template): void {
  REGISTRY.set(t.id, t);
}
export const templateOf = (id: string): Template | undefined =>
  REGISTRY.get(id);
export const templateIds = (): string[] => [...REGISTRY.keys()];

export function buildGraphFor(
  g: { template: string; args: Args },
  ctx: GraphCtx,
): Graph {
  const t = REGISTRY.get(g.template);
  if (!t) {
    throw new EngineError(`unknown graph template ${g.template}`);
  }
  return t.build(g.args, ctx);
}
