/**
 * Dry run of the hybrid conductor (plan v2 A2), free: a scripted student
 * plays a question, no AI is called, and every act is tagged with the tier
 * that would answer it ([instant], [light:reason], [deep:reason]) and the
 * prepared reply that is shown without an AI move. The owner reads it to
 * judge the decision table before any paid run.
 *
 *   npm run tutor -- conduct --script owner-q1
 *
 * Output: tools/tutor-harness/out/conduct-<script>-<time>.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { StudentAct } from '../../src/ai/checks/autoCheck';
import { richText } from '../../src/ai/packs/build';
import type { LoadedExercise } from '../../src/content/loader';
import {
  act,
  applyFallback,
  questionCtx,
  startQuestion,
  view,
} from '../../src/hybrid/conductor/conductor';
import type { Tier } from '../../src/hybrid/conductor/types';
import { isTouring, roadView } from '../../src/hybrid/tour/tour';
import type { MethodNote } from '../../src/method/note';
import type { ReplyPart } from '../../src/method/replies';

/** Plan v2 estimates per call, to be replaced by measured figures (A6). */
const EST_USD: Record<Tier, number> = {
  instant: 0,
  light: 0.0005,
  deep: 0.012,
};

interface Script {
  exercise: string;
  question: string;
  about?: string;
  acts: StudentAct[];
}

function actText(a: StudentAct): string {
  switch (a.kind) {
    case 'line':
      return `line: ${a.raw}${a.readback ? ` (reads it ${a.readback})` : ''}`;
    case 'free':
      return `free: ${a.text}`;
    case 'order':
      return `order: ${a.ids.join(' > ')}`;
    case 'tap_word':
      return `tap: ${a.token}`;
    case 'choice':
      return `choice: ${a.optionId}`;
    case 'list':
      return `list: ${a.groups.map(g => g.join('')).join(', ')}`;
    case 'formula':
      return `formula: ${a.raw}`;
    default:
      return a.kind;
  }
}

function noteText(n: MethodNote): string {
  switch (n.kind) {
    case 'recap':
      return `recap: found «${richText(n.found)}», next «${richText(
        n.next ?? undefined,
      )}»`;
    case 'credit':
      return `credit ${n.nodeId}${n.support ? ' (intermediate)' : ''}${
        n.unsimplified ? ' (not simplified yet)' : ''
      }`;
    case 'neutral':
      return `neutral ${n.code}${n.line ? ` «${n.line}»` : ''}${
        n.check ? ` check ${n.check}` : ''
      }`;
    case 'target':
      return `target: his «${n.line}» next to «${richText(n.target)}»`;
    case 'plan_violation':
      return `plan: «${richText(n.card)}» needs ${n.needs
        .map(r => `«${richText(r)}»`)
        .join(', ')}`;
    case 'review':
      return `review «${n.raw}»: ${n.outcome}${n.nodeId ? ` ${n.nodeId}` : ''}${
        n.id ? ` (${n.id})` : ''
      }`;
    default:
      return n.kind;
  }
}

function partText(p: ReplyPart): string {
  switch (p.kind) {
    case 'student':
      return '';
    case 'note':
      return `- [${p.tone}] ${noteText(p.note)}`;
    case 'feedback':
      return `- [${p.tone}] ${richText(p.rich)}`;
    case 'message':
      return `- [${p.tone}] (${p.message})`;
  }
}

export function conductCommand(
  a: Record<string, string>,
  load: (exerciseId: string) => { loaded: LoadedExercise; raw: never },
  root: string,
  outDir: string,
): void {
  const name = a.script ?? 'owner-q1';
  const script = JSON.parse(
    readFileSync(
      path.join(root, 'tools/tutor-harness/scripts', `${name}.json`),
      'utf8',
    ),
  ) as Script;
  const { loaded, raw } = load(script.exercise);
  const ctx = questionCtx(loaded, raw, script.question);
  let state = startQuestion(ctx);
  const md: string[] = [
    `# Conductor dry run: ${name}`,
    `Exercise ${script.exercise}, question ${script.question}. No AI is called: each act shows the tier that would answer and the prepared reply (what he reads when no AI move replaces it).`,
    script.about ? `Script: ${script.about}` : '',
    '',
  ];
  const tally: Record<Tier, number> = { instant: 0, light: 0, deep: 0 };
  for (const [i, studentAct] of script.acts.entries()) {
    const before = isTouring(ctx, state)
      ? { frameId: 'trip', type: 'map' }
      : view(ctx, state);
    if (!before) {
      md.push(`> the question ended before act ${i + 1}`);
      break;
    }
    const r = act(ctx, state, studentAct);
    // No AI here: the prepared reply is what he reads.
    state = applyFallback(r.state, r.out);
    tally[r.out.tier] += 1;
    const tag =
      r.out.tier === 'instant'
        ? '[instant]'
        : `[${r.out.tier}:${r.out.reason}]`;
    md.push(
      `### ${i + 1}. ${before.frameId} (${before.type})`,
      `**Student:** ${actText(studentAct)}`,
      `**${tag}** ${
        r.out.tier === 'instant'
          ? r.out.reason
          : 'prepared reply if no AI move:'
      }${r.out.advanced ? ' → next step' : ''}`,
      ...r.out.reply.map(partText).filter(t => t !== ''),
      ...(r.out.readback
        ? [
            `- asks how he meant it: «${r.out.readback.literal}» or «${r.out.readback.grouped}»`,
          ]
        : []),
      '',
    );
  }
  const road = roadView(ctx, state);
  const lineText = (l: {
    says: Parameters<typeof richText>[0];
    fr: string | null;
  }) => `${richText(l.says)}${l.fr ? ` [${l.fr}]` : ''}`;
  md.push(
    '## The map («الطريق») at the end',
    `- have: ${road.have.map(lineText).join(' | ')}`,
    `- goal: ${road.goal ? lineText(road.goal) : '(none)'}`,
    ...road.steps.map(
      x => `- ${x.status} ${richText(x.title)}${x.line ? `: ${x.line}` : ''}`,
    ),
    ...road.after.map(x => `- ${x.status} ${richText(x.says)}`),
    '',
  );
  const total = tally.instant + tally.light + tally.deep;
  const est = tally.light * EST_USD.light + tally.deep * EST_USD.deep;
  md.push(
    '## Totals',
    `- acts: ${total}; instant ${tally.instant} (${Math.round(
      (100 * tally.instant) / Math.max(1, total),
    )}%), light ${tally.light}, deep ${tally.deep}`,
    `- estimated AI cost for this question: $${est.toFixed(
      4,
    )} (plan estimates: light $${EST_USD.light}, deep $${
      EST_USD.deep
    } per call; to be measured)`,
    `- ended: ${state.done}; credited: ${JSON.stringify(
      state.session.credited,
    )}; his plan: ${state.planOrder?.join(' > ') ?? '(none)'}`,
  );
  mkdirSync(outDir, { recursive: true });
  const file = path.join(
    outDir,
    `conduct-${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`,
  );
  writeFileSync(file, md.join('\n'));
  console.log(md.slice(-4).join('\n'));
  console.log(`transcript: ${path.relative(root, file)}`);
}
