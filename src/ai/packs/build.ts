/**
 * The exercise pack: what the tutor knows about an exercise, as one
 * deterministic text (the second cached system block, shared by every
 * question of the exercise) plus the runtime objects the engine checks
 * against (each question's solution graph and slips, the plan cards, the
 * word that says whether order matters, the given numbers).
 * Every value in the text is computed by the engine (loader + templates).
 */
import type { Experiment } from '../../engine/calls';
import type { LoadedExercise } from '../../content/loader';
import type { Rich } from '../../content/schema';
import type { ReadEffect } from '../../method/frame';
import type { GraphNode } from '../../method/graph';
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

export interface QuestionPack {
  questionId: string;
  label: string;
  wording: string;
  main: GraphRuntime | null;
  plan: PlanCard[];
  read: { token: string; effect: ReadEffect }[];
  /** Recipe cards: the clean recipe in order, and every card's kind. */
  recipe: { clean: string[]; kinds: Record<string, string> } | null;
  notes: QuestionNotes | null;
  /** Numbers of the statement and the question wording ("4", "0.5", "1/2"). */
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

function nodeLine(n: GraphNode): string {
  const meaning = NODE_MEANING[n.id] ?? `${n.role} (${n.unit})`;
  const forms = n.forms.slice(0, 3).join('  |  ');
  return `- ${n.id} = ${plain(n.value)}: ${meaning}. Plan card: ${n.planCard}${
    n.main ? '' : ' (supporting step)'
  }. Accepted forms: ${forms}`;
}

function graphSection(rt: GraphRuntime): string[] {
  const lines = [
    `Private solution graph "main" (never show a value he has not earned):`,
    ...rt.graph.nodes.map(nodeLine),
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
    const reds = experiment.urn.filter(b => b.color === 'red').length;
    const blacks = experiment.urn.length - reds;
    sections.push(
      `Urn: ${reds} red (R1..R${reds}), ${blacks} black (N1..N${blacks}), ${experiment.k} drawn, draw: ${experiment.draw}. "main" lists and engine_call "exercise" use these balls.`,
    );
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
      ...numbersIn(statement),
      ...numbersIn(wording),
      ...(experiment ? [String(experiment.urn.length)] : []),
      ...carried,
    ];
    questions.set(part.id, {
      questionId: part.id,
      label: pq?.label ?? part.id,
      wording,
      main,
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
