/**
 * The route of a method question in the student's own order: the order of
 * the frames once his plan is accepted, the next stage's short name, and what
 * "show me" gives at the end of a ladder. Pure; moved out of the lesson
 * reducer with no change of behaviour (plan v2 A1), shared with the hybrid
 * conductor.
 */
import type { ResolvedAnswer } from '../content/loader';
import type { MethodFrameStep, Rich, Step } from '../content/schema';
import { parseExpression, toLatex } from '../engine/expression';
import { fractionToLatex } from '../engine/format';

/** The frames of a method group in the student's own order once his plan is accepted (D47). */
export function stepOrderFor(
  steps: readonly Step[],
  planOrder: readonly string[],
): string[] {
  const planAt = steps.findIndex(
    s => s.kind === 'mframe' && s.frame.type === 'plan',
  );
  const rank = (s: Step, i: number): number => {
    if (s.kind === 'mframe' && s.group !== undefined) {
      if (s.group === 'head') {
        return 1;
      }
      if (s.group === 'tail') {
        return 100;
      }
      const at = planOrder.indexOf(s.group);
      return at >= 0 ? 2 + at : 50;
    }
    return i < planAt ? 0 : 200;
  };
  return steps
    .map((s, i) => ({ id: s.id, r: rank(s, i), i }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map(x => x.id);
}

/** The short name of the stage after this card in HIS order, else the recipe or paper row. */
export function nextShortFor(
  step: MethodFrameStep,
  cardId: string,
  planOrder: readonly string[] | undefined,
): Rich | null {
  const roadmap = step.roadmap ?? [];
  const prefix = step.id.slice(0, step.id.length - cardId.length - 1);
  const roadmapShort = (id: string) => roadmap.find(r => r.id === id)?.short;
  if (planOrder) {
    const at = planOrder.indexOf(cardId);
    const next = planOrder[at + 1];
    if (at >= 0 && next !== undefined) {
      return roadmapShort(`${prefix}.${next}`) ?? null;
    }
    return (
      roadmapShort(`${prefix}.recipe`) ??
      roadmapShort(`${prefix}.paper`) ??
      null
    );
  }
  const i = roadmap.findIndex(r => r.id === step.id);
  return roadmap[i + 1]?.short ?? null;
}

/** What "show me" gives at the end of a ladder: the plan's cards, the word, the expected line, the true card. */
export function methodRevealRich(
  step: MethodFrameStep,
  answer: ResolvedAnswer,
): Rich {
  const f = step.frame;
  if (f.type === 'plan') {
    const runs: NonNullable<Rich['ar']> = [];
    f.cards.forEach((c, i) => {
      if (i > 0) {
        runs.push({ ar: ' ، ' });
      }
      runs.push(...(c.short.ar ?? []));
    });
    return { ar: runs };
  }
  if (f.type === 'read') {
    return { fr: f.targets[0]?.token ?? '?' };
  }
  if (f.type === 'cards') {
    return f.cards.find(c => c.truth === 'true')?.text ?? { math: '?' };
  }
  if (f.type === 'repair') {
    const shown = f.stages.find(st => st.type === 'show');
    return shown?.type === 'show' ? shown.text : { math: '?' };
  }
  if (
    f.type === 'lines' &&
    answer.kind === 'method' &&
    answer.frame === 'lines'
  ) {
    const main = answer.graph.nodes.find(n => n.planCard === f.key && n.main);
    const form = main?.forms[0];
    if (main && form) {
      const parsed = parseExpression(form, { variables: [] });
      return {
        math: `${parsed.ok ? toLatex(parsed.ast) : form} = ${fractionToLatex(
          main.value,
        )}`,
      };
    }
  }
  return { math: '?' };
}
