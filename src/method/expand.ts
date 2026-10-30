/**
 * The loader's expansion of an authored `method` block into ordinary steps:
 * one opening text, the plan frame, the read frame, one lines frame per BUILT
 * plan card, the picks placed after a card, the recipe and the similar
 * questions, each an asked step with its own hint ladder (docs/
 * METHOD_LESSON_PROGRESS.md, "Integration design"). Everything the student
 * will read is scanned here (D41): no "part" / "combine", and no digit,
 * formula or how-word in a header or the opening card.
 *
 * Pure: returns a new exercise and the errors found; never throws.
 */
import type {
  CardsFrame,
  ExtraFrame,
  Exercise,
  MethodFrameStep,
  MethodStep,
  PlanCard,
  PlanCardRef,
  Rich,
  RoadmapEntry,
  Step,
} from '../content/schema';
// The domain templates register when the library is loaded.
import './library';
import { buildGraphFor, templateOf } from './templates';
import { studentFacingIssues } from './words';

type Block = Exercise['parts'][number]['groups'][number]['steps'][number];

export function urnCounts(
  ex: Exercise,
): { reds: number; blacks: number; k: number } | null {
  const urn = ex.experiment?.urn;
  if (!urn) {
    return null;
  }
  const reds = urn.filter(b => b.value === 1).length;
  const blacks = urn.filter(b => b.value === 0).length;
  return reds + blacks === urn.length
    ? { reds, blacks, k: ex.experiment!.k }
    : null;
}

function hasCycle(cards: readonly PlanCard[]): boolean {
  const needs = new Map(cards.map(c => [c.id, c.needs]));
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): boolean => {
    const s = state.get(id) ?? 0;
    if (s === 1) {
      return true;
    }
    if (s === 2) {
      return false;
    }
    state.set(id, 1);
    const cyclic = (needs.get(id) ?? []).some(n => needs.has(n) && visit(n));
    state.set(id, 2);
    return cyclic;
  };
  return cards.some(c => visit(c.id));
}

const refOf = (c: PlanCard): PlanCardRef => ({
  id: c.id,
  key: c.key,
  short: c.short,
  text: c.text,
  header: c.header,
  needs: c.needs,
});

function openingText(m: MethodStep): Block {
  const runs: NonNullable<Rich['ar']> = [];
  const lines = [...m.opening.route, m.opening.help];
  lines.forEach((line, i) => {
    if (i > 0) {
      runs.push({ ar: '\n' });
    }
    runs.push(...(line.ar ?? []));
  });
  return {
    id: `${m.id}.opening`,
    blockId: `${m.blockId}.opening`,
    trust: m.trust,
    skills: [],
    kind: 'text',
    text: { ar: runs },
  } as Block;
}

/** The first sentence of the statement that holds one of the words to find (the whole statement if none). */
export function sentenceWith(
  statement: string,
  tokens: readonly string[],
): string {
  const sentences = statement
    .split(/(?<=[.!?])\s+/u)
    .filter(x => x.trim() !== '');
  const hit = sentences.find(sen =>
    tokens.some(t => sen.toLowerCase().includes(t.toLowerCase())),
  );
  return (hit ?? statement).trim();
}

type Head = { now: Rich; why: Rich; next: Rich };

function expandOne(
  ex: Exercise,
  m: MethodStep,
  errors: string[],
): Step[] | null {
  const before = errors.length;
  const err = (msg: string) => errors.push(`${m.id}: ${msg}`);
  const urn = urnCounts(ex) ?? undefined;
  const tpl = templateOf(m.graph.template);
  let nodeIds = new Set<string>();
  if (!tpl) {
    err(`unknown graph template ${m.graph.template}`);
  } else if (!m.inputs) {
    // With inputs from an earlier question the graph can only be built by the loader (it has them); it checks it there.
    try {
      const g = buildGraphFor(m.graph, { ...(urn && { urn }), inputs: {} });
      nodeIds = new Set(g.nodes.map(n => n.id));
    } catch (e) {
      err(`graph: ${(e as Error).message}`);
    }
  }

  const cards = m.plan.cards;
  const ids = cards.map(c => c.id);
  if (new Set(ids).size !== ids.length) {
    err('plan cards need distinct ids');
  }
  const keys = cards.map(c => c.key);
  if (new Set(keys).size !== keys.length) {
    err('each plan card needs its own key');
  }
  for (const c of cards) {
    if (tpl && !tpl.cardKeys.includes(c.key)) {
      err(`${c.id}: the template ${tpl.id} has no card key ${c.key}`);
    }
    for (const n of c.needs) {
      if (!ids.includes(n) || n === c.id) {
        err(`${c.id}: needs unknown card ${n}`);
      }
    }
  }
  if (hasCycle(cards)) {
    err('plan cards wait for each other (cycle)');
  }
  for (const id of m.builtFrames ?? []) {
    if (!ids.includes(id)) {
      err(`builtFrames names no card: ${id}`);
    }
  }
  const pickIds = m.picks.map(p => p.id);
  const routeIds = [...pickIds, ...m.extras.map(x => x.id)];
  if (new Set(routeIds).size !== routeIds.length) {
    err('picks and extras need distinct ids');
  }
  for (const p of [...m.picks, ...m.extras]) {
    const places = [
      ...ids,
      'plan',
      'read',
      ...routeIds.filter(x => x !== p.id),
    ];
    if (!places.includes(p.after)) {
      err(`${p.id}: unknown place after ${p.after}`);
    }
  }
  const statement = (m.read.sentence ?? ex.statement.fr ?? '').toLowerCase();
  for (const t of m.read.targets) {
    if (!statement.includes(t.token.toLowerCase())) {
      err(
        `read token "${t.token}" is not in the ${
          m.read.sentence ? 'sentence' : 'statement'
        }`,
      );
    }
  }
  for (const f of m.findings) {
    for (const n of f.nodes) {
      if (nodeIds.size > 0 && !nodeIds.has(n)) {
        err(`finding ${f.id}: unknown node ${n}`);
      }
    }
    if (f.viaCard !== undefined && !pickIds.includes(f.viaCard)) {
      err(`finding ${f.id}: unknown pick ${f.viaCard}`);
    }
  }
  for (const line of m.skeleton) {
    for (const hit of line.fr.matchAll(/\{([a-z0-9_]+)\}/g)) {
      if (nodeIds.size > 0 && !nodeIds.has(hit[1]!)) {
        err(`skeleton ${line.id}: unknown node {${hit[1]}}`);
      }
    }
  }
  for (const slot of m.similar ?? []) {
    try {
      buildGraphFor(slot.graph, { ...(urn && { urn }), inputs: {} });
    } catch (e) {
      err(`similar ${slot.id}: ${(e as Error).message}`);
    }
  }
  if (m.recipe) {
    const poolIds = m.recipe.pool.map(p => p.id);
    for (const c of m.recipe.clean) {
      if (!poolIds.includes(c)) {
        err(`recipe: clean card ${c} is not in the pool`);
      }
    }
  }

  // Everything the student reads (D41).
  const scan = (label: string, r: Rich, header: boolean) => {
    for (const issue of studentFacingIssues(r, { header })) {
      err(`${label}: ${issue}`);
    }
  };
  [...m.opening.route, m.opening.help].forEach((r, i) =>
    scan(`opening ${i}`, r, true),
  );
  const heads: [string, Head][] = [
    ['plan header', m.plan.header],
    ['read header', m.read.header],
    ['paper header', m.paper.header],
    ...cards.map(c => [`${c.id} header`, c.header] as [string, Head]),
    ...m.picks.map(p => [`${p.id} header`, p.header] as [string, Head]),
    ...m.extras.map(x => [`${x.id} header`, x.header] as [string, Head]),
    ...(m.recipe ? [['recipe header', m.recipe.header] as [string, Head]] : []),
  ];
  for (const [label, h] of heads) {
    scan(`${label}.now`, h.now, true);
    scan(`${label}.why`, h.why, true);
    scan(`${label}.next`, h.next, true);
  }
  const plain: [string, Rich][] = [
    ['plan prompt', m.plan.prompt],
    ['plan short', m.plan.short],
    ['read prompt', m.read.prompt],
    ['read short', m.read.short],
    ['notOrderWord', m.read.notOrderWord],
    ['paper short', m.paper.short],
    ...m.plan.hints.map((h, i) => [`plan hint ${i + 1}`, h] as [string, Rich]),
    ...m.read.hints.map((h, i) => [`read hint ${i + 1}`, h] as [string, Rich]),
    ...cards.flatMap(c => [
      [`${c.id} short`, c.short] as [string, Rich],
      [`${c.id} text`, c.text] as [string, Rich],
      [`${c.id} prompt`, c.prompt] as [string, Rich],
      ...c.hints.map((h, i) => [`${c.id} hint ${i + 1}`, h] as [string, Rich]),
    ]),
    ...m.picks.flatMap(p => [
      [`${p.id} prompt`, p.prompt] as [string, Rich],
      [`${p.id} short`, p.short] as [string, Rich],
      ...p.hints.map((h, i) => [`${p.id} hint ${i + 1}`, h] as [string, Rich]),
      ...p.cards.map(
        (c, i) => [`${p.id} card ${i + 1}`, c.text] as [string, Rich],
      ),
    ]),
    ...(m.recipe
      ? [
          ['recipe prompt', m.recipe.prompt] as [string, Rich],
          ...m.recipe.pool.map(
            (c, i) => [`recipe card ${i + 1}`, c.text] as [string, Rich],
          ),
        ]
      : []),
    ...(m.methodCard
      ? [
          ['method card type', m.methodCard.type] as [string, Rich],
          ...m.methodCard.steps.map(
            (c, i) => [`method card step ${i + 1}`, c] as [string, Rich],
          ),
          ...m.methodCard.checks.map(
            (c, i) => [`method card check ${i + 1}`, c] as [string, Rich],
          ),
        ]
      : []),
  ];
  for (const [label, r] of plain) {
    scan(label, r, false);
  }
  if (errors.length > before) {
    return null;
  }

  const roadmap: RoadmapEntry[] = [
    {
      id: `${m.id}.plan`,
      kind: 'plan',
      short: m.plan.short,
      header: m.plan.header,
    },
    {
      id: `${m.id}.read`,
      kind: 'read',
      short: m.read.short,
      header: m.read.header,
    },
    ...cards.map(c => ({
      id: `${m.id}.${c.id}`,
      kind: 'card' as const,
      short: c.short,
      header: c.header,
    })),
    ...(m.recipe
      ? [
          {
            id: `${m.id}.recipe`,
            kind: 'recipe' as const,
            short: m.recipe.short,
            header: m.recipe.header,
          },
        ]
      : []),
    {
      id: `${m.id}.paper`,
      kind: 'paper',
      short: m.paper.short,
      header: m.paper.header,
    },
  ];
  const base = {
    trust: m.trust,
    skills: m.skills,
    roadmap,
    graph: m.graph,
    methodId: m.id,
    ...(m.inputs && { inputs: m.inputs }),
    ...(m.target && { target: m.target }),
  };
  const plan: MethodFrameStep = {
    ...base,
    id: `${m.id}.plan`,
    blockId: `${m.blockId}.plan`,
    kind: 'mframe',
    prompt: m.plan.prompt,
    hints: m.plan.hints,
    header: m.plan.header,
    short: m.plan.short,
    group: 'head',
    frame: { type: 'plan', cards: cards.map(refOf) },
    sheet: { findings: m.findings, skeleton: m.skeleton },
  };
  const read: MethodFrameStep = {
    ...base,
    id: `${m.id}.read`,
    blockId: `${m.blockId}.read`,
    kind: 'mframe',
    prompt: m.read.prompt,
    hints: m.read.hints,
    header: m.read.header,
    short: m.read.short,
    group: 'head',
    frame: {
      type: 'read',
      sentence:
        m.read.sentence ??
        sentenceWith(
          ex.statement.fr ?? '',
          m.read.targets.map(t => t.token),
        ),
      targets: m.read.targets,
      notOrderWord: m.read.notOrderWord,
    },
  };
  const pickFrame = (p: CardsFrame, group: string): MethodFrameStep => ({
    ...base,
    id: `${m.id}.${p.id}`,
    blockId: `${m.blockId}.${p.id}`,
    kind: 'mframe',
    prompt: p.prompt,
    hints: p.hints,
    ...(p.deepDiveId !== undefined && { deepDiveId: p.deepDiveId }),
    header: p.header,
    short: p.short,
    group,
    frame: {
      type: 'cards',
      after: p.after,
      evaluator: p.evaluator,
      args: p.args,
      cards: p.cards,
    },
  });
  const extraFrame = (x: ExtraFrame, group: string): MethodFrameStep => ({
    ...base,
    id: `${m.id}.${x.id}`,
    blockId: `${m.blockId}.${x.id}`,
    kind: 'mframe',
    prompt: x.prompt,
    hints: [],
    header: x.header,
    short: x.short,
    group,
    frame: { type: 'repair', stages: x.stages },
  });
  /** The picks and extras that follow `afterId`, and the ones that follow those. */
  const routeAfter = (afterId: string, group: string): MethodFrameStep[] => [
    ...m.picks
      .filter(p => p.after === afterId && p.id !== afterId)
      .flatMap(p => [pickFrame(p, group), ...routeAfter(p.id, group)]),
    ...m.extras
      .filter(x => x.after === afterId && x.id !== afterId)
      .flatMap(x => [extraFrame(x, group), ...routeAfter(x.id, group)]),
  ];
  /** A card with no lines frame of its own (a recognise pick) is worked by the pick that has its id. */
  const ownPick = (cardId: string): MethodFrameStep[] =>
    m.picks
      .filter(p => p.id === cardId && p.after === cardId)
      .flatMap(p => [pickFrame(p, cardId), ...routeAfter(p.id, cardId)]);
  const built = new Set(m.builtFrames ?? ids);
  const lines = cards.flatMap((c): MethodFrameStep[] =>
    built.has(c.id)
      ? [
          {
            ...base,
            id: `${m.id}.${c.id}`,
            blockId: `${m.blockId}.${c.id}`,
            kind: 'mframe',
            prompt: c.prompt,
            hints: c.hints,
            ...(c.deepDiveId !== undefined && { deepDiveId: c.deepDiveId }),
            ...(c.walkthrough && { walkthrough: c.walkthrough }),
            header: c.header,
            short: c.short,
            group: c.id,
            frame: {
              type: 'lines',
              cardId: c.id,
              key: c.key,
              ...(c.procedures && { procedures: c.procedures }),
              ...(c.wrongAnswers && { wrongAnswers: c.wrongAnswers }),
            },
          } as MethodFrameStep,
          ...routeAfter(c.id, c.id),
        ]
      : ownPick(c.id),
  );
  const tail: MethodFrameStep[] = [
    ...(m.recipe
      ? [
          {
            ...base,
            id: `${m.id}.recipe`,
            blockId: `${m.blockId}.recipe`,
            kind: 'mframe',
            prompt: m.recipe.prompt,
            hints: m.recipe.hints,
            header: m.recipe.header,
            short: m.recipe.short,
            group: 'tail',
            frame: {
              type: 'recipe',
              pool: m.recipe.pool,
              clean: m.recipe.clean,
              ...(m.methodCard && { methodCard: m.methodCard }),
            },
          } as MethodFrameStep,
        ]
      : []),
    ...(m.similar ?? []).map(
      (slot): MethodFrameStep => ({
        ...base,
        id: `${m.id}.sim_${slot.id}`,
        blockId: `${m.blockId}.sim_${slot.id}`,
        kind: 'mframe',
        prompt: slot.statement,
        graph: slot.graph,
        group: 'tail',
        frame: { type: 'similar', slot },
      }),
    ),
  ];
  return [
    openingText(m) as Step,
    plan as Step,
    read as Step,
    ...(routeAfter('plan', 'head') as Step[]),
    ...(routeAfter('read', 'head') as Step[]),
    ...(lines as Step[]),
    ...(tail as Step[]),
  ];
}

export function expandMethodSteps(ex: Exercise): {
  exercise: Exercise;
  errors: string[];
} {
  const errors: string[] = [];
  let touched = false;
  const parts = ex.parts.map(p => ({
    ...p,
    groups: p.groups.map(g => ({
      ...g,
      steps: g.steps.flatMap((s): Step[] => {
        if (s.kind !== 'method') {
          return [s];
        }
        touched = true;
        return expandOne(ex, s, errors) ?? [];
      }),
    })),
  }));
  return touched
    ? { exercise: { ...ex, parts }, errors }
    : { exercise: ex, errors };
}
