/**
 * The exercise pack: what the tutor knows about an exercise, as one
 * deterministic text (the second cached system block, shared by every
 * question of the exercise) plus the runtime objects the engine checks
 * against (each question's solution graph and slips, the plan cards, the
 * word that says whether order matters, the given numbers).
 * Every value in the text is computed by the engine (loader + templates).
 */
import type { Experiment } from '../../engine/calls';
import { frac } from '../../engine/rational';
import type { LoadedExercise } from '../../content/loader';
import type { Rich } from '../../content/schema';
import type { ReadEffect } from '../../method/frame';
import type { Graph, GraphNode } from '../../method/graph';
import { plain, type GraphRuntime } from '../checks/lines';
import { TUTOR_NOTES, type QuestionNotes } from './notes';

/** Plain text of authored rich text (model-facing only). */
export function richText(r: Rich | undefined): string {
  if (!r) {
    return '';
  }
  const parts: string[] = [];
  if (r.ar) {
    parts.push(r.ar.map(run => ('ar' in run ? run.ar : run.fr)).join(''));
  }
  if (r.fr) {
    parts.push(r.fr);
  }
  if (r.math) {
    parts.push(`$${r.math}$`);
  }
  return parts.join(' ');
}

export interface PlanCard {
  id: string;
  needs: string[];
  key: string;
  text: string;
  now: string;
  why: string;
  next: string;
}

/** The kind of a question that is not an urn (the main graph's `domain`). */
export type QuestionDomain = NonNullable<Graph['domain']>;

export interface QuestionPack {
  questionId: string;
  label: string;
  wording: string;
  main: GraphRuntime | null;
  /**
   * The main graph's domain; null (or absent, in a pack built by hand) for an
   * urn question. The AI layer switches on it: the move prompt, the tools,
   * the pack text and the reading of fractions in what the student is shown.
   */
  domain?: QuestionDomain | null;
  plan: PlanCard[];
  read: { token: string; effect: ReadEffect }[];
  /** Recipe cards: the clean recipe in order, and every card's kind. */
  recipe: { clean: string[]; kinds: Record<string, string> } | null;
  notes: QuestionNotes | null;
  /**
   * Numbers of the statement and the question wording ("4", "0.5", "1/2");
   * on a tree question also the fractions its figure gives ("5/12").
   */
  given: string[];
}

export interface ExercisePack {
  exerciseId: string;
  text: string;
  experiment: Experiment | null;
  questions: ReadonlyMap<string, QuestionPack>;
}

/** What each urn-template node counts (model-facing). */
const NODE_MEANING: Readonly<Record<string, string>> = {
  ord: 'ordered draws of the k balls (n*(n-1)*... with k factors)',
  orderings: 'orderings of k balls (k!)',
  total: 'all draws of k balls together (ordered draws / orderings)',
  fav_red: 'ways to choose the red part',
  fav_black: 'ways to choose the black part',
  none: 'draws with no red ball',
  fav: 'favourable draws (the parts multiplied)',
  result: 'the probability: favourable / total',
  seq: 'probability of one sequence of successes and failures',
  count: 'number of sequences with exactly k successes (C(n,k))',
  mean1: 'mean of one trial',
  meann: 'mean of n trials',
  var1: 'variance of one trial',
  varn: 'variance of n trials',
  // The two-event tree (src/method/templatesTree.ts).
  a_and_f: 'the path through A to F: p(A ∩ F), its two branches multiplied',
  na_and_f: 'the path through not A to F: p(Ā ∩ F)',
  not_a: 'the first-level branch to not A: p(Ā)',
  f_given_na: 'the branch to F after not A: p(F/Ā), F knowing not A',
  nf_given_a: 'the branch to not F after A (not F knowing A)',
  nf_given_na: 'the branch to not F after not A (not F knowing not A)',
  not_f: 'all of not F, by both paths',
  a_and_nf: 'the path through A to not F',
  na_and_nf: 'the path through not A to not F',
  na_given_nf:
    'not A knowing not F: the tree read backwards (a path over a total)',
};

const NUMBER = /\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/g;
const WORD_NUMBERS: Readonly<Record<string, string>> = {
  deux: '2',
  trois: '3',
  quatre: '4',
  cinq: '5',
  six: '6',
  sept: '7',
  huit: '8',
  neuf: '9',
  dix: '10',
};

function numbersIn(text: string): string[] {
  const out = (text.match(NUMBER) ?? []).map(n =>
    n.replace(/\s+/g, '').replace(',', '.'),
  );
  for (const [word, digit] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      out.push(digit);
    }
  }
  // 0.5 is also shown as 1/2.
  if (out.includes('0.5')) {
    out.push('1/2');
  }
  return out;
}

/**
 * Numbers of a tree statement: a fraction (`\frac{5}{12}`, `\dfrac{5}{12}`,
 * `5/12`) is ONE number, in lowest terms as the engine writes it. Its
 * numerator and denominator are never numbers of their own: a given is a
 * tile he may tap and a number a reply may show, and 5 or 12 alone is
 * neither. Number words are left out for the same reason (« deux évènements »
 * is not a 2 to compute with).
 */
function treeNumbersIn(text: string): string[] {
  const out: string[] = [];
  const whole = (a: string, b: string): string => {
    if (Number(b) !== 0) {
      out.push(plain(frac(Number(a), Number(b))));
    }
    return ' ';
  };
  const rest = text
    .replace(
      /\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g,
      (_m, a: string, b: string) => whole(a, b),
    )
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_m, a: string, b: string) => whole(a, b));
  return [
    ...out,
    ...(rest.match(/\d+(?:[.,]\d+)?/g) ?? []).map(n => n.replace(',', '.')),
  ];
}

/**
 * The given numbers of a question. An urn question: the numbers written in
 * the statement and the wording. A tree question: first the fractions its
 * graph says the statement gives (two of the three are printed only on the
 * figure), then the statement's numbers, each fraction whole.
 */
export function givenNumbers(
  main: GraphRuntime | null,
  texts: readonly string[],
): string[] {
  if (main?.graph.domain !== 'tree') {
    return texts.flatMap(numbersIn);
  }
  return [
    ...(main.graph.givens ?? []).map(plain),
    ...texts.flatMap(treeNumbersIn),
  ];
}

/**
 * What each node of the numbered-ball templates counts (model-facing;
 * src/method/templatesLaw.ts): balls carry numbers, not colours.
 */
export const NUM_NODE_MEANING: Readonly<Record<string, string>> = {
  ord: 'ordered draws of the k balls (n*(n-1)*... with k factors)',
  orderings: 'orderings of k balls (k!)',
  total: 'all draws of k balls together, card(Ω)',
  fav: 'favourable draws of the event',
  none: 'draws of the opposite event (no ball carries the number)',
  p_none: 'probability of the opposite event: its draws / all draws',
  result: 'the probability asked',
  sum: 'the probabilities of the law added: 1',
  mean: 'E(X): each value times its probability, added',
  square: 'E(X²): each value squared times its probability, added',
  var: 'V(X) = E(X²) − E(X)²',
};

/** A node's meaning for the model: numbered balls have their own table. */
export function nodeMeaning(g: Graph, n: GraphNode): string {
  if (g.template?.startsWith('num_')) {
    const m = NUM_NODE_MEANING[n.id];
    if (m) {
      return m;
    }
    if (n.label?.startsWith('p(X')) {
      return `${n.label}: draws giving this value / all draws`;
    }
  }
  return NODE_MEANING[n.id] ?? `${n.role} (${n.unit})`;
}

/**
 * The urn line of a pack: red and black balls as before; balls that carry
 * numbers and no colour are listed by their numbers.
 */
export function urnLine(e: Experiment, style: 'exercise' | 'question'): string {
  const numbered = e.urn.every(b => b.color === undefined);
  if (numbered) {
    const values = e.urn.map(b => b.value).join(', ');
    return style === 'exercise'
      ? `Urn: ${e.urn.length} balls carrying the numbers ${values} (no colours), ${e.k} drawn, draw: ${e.draw}. "main" lists and engine_call "exercise" use these balls.`
      : `Urn: ${e.urn.length} balls numbered ${values}, ${e.k} drawn, draw ${e.draw}.`;
  }
  const reds = e.urn.filter(b => b.color === 'red').length;
  const blacks = e.urn.length - reds;
  return style === 'exercise'
    ? `Urn: ${reds} red (R1..R${reds}), ${blacks} black (N1..N${blacks}), ${e.k} drawn, draw: ${e.draw}. "main" lists and engine_call "exercise" use these balls.`
    : `Urn: ${reds} red, ${blacks} black, ${e.k} drawn, draw ${e.draw}.`;
}

/** A step written with a letter, for the model: where his lines start and end. */
export function exprNodeLine(n: GraphNode): string {
  const e = n.expr!;
  return `- ${n.id}: lines in ${e.variable}, from ${e.ref} (the question's quantity) to ${
    e.goals.length > 0 ? e.goals.join(' or ') : 'any equal formula'
  }. Plan card: ${n.planCard}. Each line must equal the one before it.`;
}

function nodeLine(n: GraphNode, g: Graph): string {
  if (n.expr) {
    return exprNodeLine(n);
  }
  const meaning = nodeMeaning(g, n);
  const forms = n.forms.slice(0, 3).join('  |  ');
  return `- ${n.id} = ${plain(n.value)}: ${meaning}. Plan card: ${n.planCard}${
    n.main ? '' : ' (supporting step)'
  }. Accepted forms: ${forms}`;
}

function graphSection(rt: GraphRuntime): string[] {
  const lines = [
    `Private solution graph "main" (never show a value he has not earned):`,
    ...rt.graph.nodes.map(n => nodeLine(n, rt.graph)),
  ];
  const byNode = new Map<string, string[]>();
  for (const c of rt.table.kept) {
    const list = byNode.get(c.nodeId) ?? [];
    list.push(`${c.id}: ${c.exprs[0] ?? '?'} = ${plain(c.value)}`);
    byNode.set(c.nodeId, list);
  }
  if (byNode.size > 0) {
    lines.push(
      'Known slips (engine values; a line matching one is labelled with its id):',
    );
    for (const [node, list] of byNode) {
      lines.push(`- at ${node}: ${list.join('; ')}`);
    }
  }
  const coincident = rt.table.dropped.filter(
    d => d.why === 'equals_right_value',
  );
  if (coincident.length > 0) {
    lines.push(
      `Slips that give the right number by coincidence here (a right value may hide them): ${coincident
        .map(d => `${d.id} at ${d.nodeId}`)
        .join(', ')}`,
    );
  }
  return lines;
}

interface MethodStepLike {
  id: string;
  kind: string;
  /** Values this question takes from an earlier one: name -> {from: "1/m1", node}. */
  inputs?: Record<string, { from: string; node: string }>;
  plan?: { cards: PlanCardJson[] };
  read?: { targets: { token: string; effect: ReadEffect }[] };
  target?: Rich;
  methodCard?: { type: Rich; steps: Rich[]; checks: Rich[] };
  recipe?: {
    pool: { id: string; kind: string; text: Rich }[];
    clean: string[];
  };
  skeleton?: { id: string; fr: string }[];
  similar?: { id: string; kind: string; statement: Rich }[];
}

interface PlanCardJson {
  id: string;
  needs: string[];
  key: string;
  text: Rich;
  header?: { now: Rich; why: Rich; next: Rich };
}

interface RawPart {
  id: string;
  groups: { steps: MethodStepLike[] }[];
}

/**
 * Builds the pack of an exercise whose questions are method steps
 * (bac2022c-sc-ex2). The loader expands a method step into frames, so the
 * authored fields (plan, read, recipe, similar...) come from the raw JSON.
 */
export function buildExercisePack(
  loaded: LoadedExercise,
  raw: { parts: RawPart[] },
): ExercisePack {
  const ex = loaded.exercise;
  const notesOf = TUTOR_NOTES[ex.id] ?? {};
  // \\val{id} in authored text -> the engine value.
  const vals = (t: string): string =>
    t.replace(/\\val\{([A-Za-z0-9_.-]+)\}/g, (m, id: string) => {
      const v = loaded.values.get(id);
      return v ? plain(v) : m;
    });
  const statement = richText(ex.statement as Rich);
  const questions = new Map<string, QuestionPack>();
  const sections: string[] = [
    `# Exercise ${ex.id}`,
    `Statement (French, exam wording): ${statement}`,
  ];
  const experiment =
    'experiment' in ex && ex.experiment ? (ex.experiment as Experiment) : null;
  if (experiment) {
    sections.push(urnLine(experiment, 'exercise'));
  }
  const paperQuestions = ex.paper?.parts.flatMap(p => p.questions) ?? [];
  for (const part of ex.parts) {
    const step = raw.parts
      .find(p => p.id === part.id)
      ?.groups.flatMap(g => g.steps)
      .find(st => st.kind === 'method');
    const pq = paperQuestions.find(q => q.id === part.id);
    const wording = (pq?.wording ?? []).map(w => richText(w as Rich)).join(' ');
    const notes = notesOf[part.id] ?? null;
    let main: GraphRuntime | null = null;
    for (const [key, a] of loaded.answers) {
      if (
        key.startsWith(`${part.id}/`) &&
        a.kind === 'method' &&
        a.frame === 'lines'
      ) {
        main = { id: 'main', graph: a.graph, table: a.table, extra: a.extra };
        break;
      }
    }
    const plan: PlanCard[] = (step?.plan?.cards ?? []).map(c => ({
      id: c.id,
      needs: c.needs,
      key: c.key,
      text: richText(c.text),
      now: richText(c.header?.now),
      why: richText(c.header?.why),
      next: richText(c.header?.next),
    }));
    const read = step?.read?.targets ?? [];
    // Results of earlier questions this one builds on (Q2 reuses the total,
    // Q3 takes p = P(A)): the student has them, so the tutor may show them.
    const carried = Object.values(step?.inputs ?? {}).flatMap(ref => {
      const earlier = questions.get(ref.from.split('/')[0] ?? '');
      const node = earlier?.main?.graph.nodes.find(n => n.id === ref.node);
      return node ? [plain(node.value)] : [];
    });
    const given = [
      ...givenNumbers(main, [statement, wording]),
      ...(experiment ? [String(experiment.urn.length)] : []),
      ...carried,
    ];
    questions.set(part.id, {
      questionId: part.id,
      label: pq?.label ?? part.id,
      wording,
      main,
      domain: main?.graph.domain ?? null,
      plan,
      read,
      recipe: step?.recipe
        ? {
            clean: step.recipe.clean,
            kinds: Object.fromEntries(
              step.recipe.pool.map(p => [p.id, p.kind]),
            ),
          }
        : null,
      notes,
      given: [...new Set(given)],
    });
    const sec: string[] = [
      '',
      `## Question ${pq?.label ?? part.id} (id "${part.id}")`,
      `Exam wording (French): ${wording}`,
    ];
    if (step?.target) {
      sec.push(`Result the exam gives: ${vals(richText(step.target))}`);
    }
    if (plan.length > 0) {
      sec.push(
        'Plan cards (show them shuffled with input "order", card ids as option ids; a card must come after the cards it needs):',
        ...plan.map(
          c =>
            `- ${c.id} «${c.text}» needs [${c.needs.join(
              ', ',
            )}]. Roadmap lines: now «${c.now}», why «${c.why}», next «${
              c.next
            }»`,
        ),
      );
    }
    if (read.length > 0) {
      sec.push(
        `The word of the statement that says whether order matters (input "tap_word" on the French statement): ${read
          .map(t => `«${t.token}» -> ${JSON.stringify(t.effect)}`)
          .join('; ')}`,
      );
    }
    if (main) {
      sec.push(...graphSection(main));
    }
    if (notes) {
      sec.push(
        'Route (how this question usually goes):',
        ...notes.route.map(r => `- ${r}`),
        notes.notationAfter
          ? `Exam notation (C(n,k)) only after he computed node "${notes.notationAfter}" himself.`
          : 'No exam notation gate.',
        `Skills: ${notes.skills.join(
          ', ',
        )}. Older prerequisites to probe if he stalls: ${notes.prerequisites.join(
          ', ',
        )}.`,
        'Components that fit (input "component"; after his own try or «ما نعرفش», never before):',
        ...notes.components.map(c => `- ${c.name}: ${c.when}`),
      );
    }
    if (step?.methodCard) {
      sec.push(
        `Method card (${richText(
          step.methodCard.type,
        )}): steps ${step.methodCard.steps
          .map(s => `«${richText(s)}»`)
          .join(' ')}; checks ${step.methodCard.checks
          .map(s => `«${richText(s)}»`)
          .join(' ')}`,
      );
    }
    if (step?.recipe) {
      sec.push(
        `Recipe cards (input "order"; clean recipe = ${step.recipe.clean.join(
          ', ',
        )}; the others are distractors):`,
        ...step.recipe.pool.map(
          p => `- ${p.id} (${p.kind}) «${richText(p.text)}»`,
        ),
      );
    }
    if (step?.skeleton) {
      sec.push(
        `Paper skeleton (fill with his own credited lines): ${step.skeleton
          .map(k => k.fr)
          .join(' / ')}`,
      );
    }
    if (step?.similar) {
      sec.push(
        'Similar questions without help (create them with make_case using these numbers):',
        ...step.similar.map(
          s => `- ${s.id} (${s.kind}): ${richText(s.statement)}`,
        ),
      );
    }
    sections.push(...sec);
  }
  return {
    exerciseId: ex.id,
    text: sections.join('\n'),
    experiment,
    questions,
  };
}
