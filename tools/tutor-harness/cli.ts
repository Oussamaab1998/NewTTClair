/// <reference types="node" />
/**
 * AI tutor harness (plan step 6). Runs the app's own tutor (src/ai) against
 * a simulated student, and writes a readable transcript for the owner.
 *
 *   npm run tutor -- pack [exercise]                 print the prompt sizes and the exercise pack
 *   npm run tutor -- run --question 1 --persona owner [--exercise bac2022c-sc-ex2]
 *                        [--effort low|medium] [--turns 30] [--cap 2]
 *   npm run tutor -- run --questions 1,2,3a,3b --persona owner [--turns 30] [--cap 8]
 *
 * Several questions run like a student doing the exercise: one simulated
 * student, one budget (--cap, default $2 per question), each question
 * starting with what he earned in the earlier ones (carriedSummary) and an
 * in-memory profile updated after each question (profileDigest). --turns is
 * per question.
 *
 * Key: CLAUDE_API_KEY from the shell, else .env.llm.local; never printed.
 * Outputs (gitignored) in tools/tutor-harness/out/: <run>.md (transcript, a
 * section per question), <run>.json (raw messages), summary.csv (old
 * columns) and summary.v2.csv (with component and formula counts), one row
 * per question.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { AI_TUTOR } from '../../src/ai/config';
import { profileDigest } from '../../src/ai/profile/digest';
import {
  applySession,
  emptyProfile,
  type StudentProfile,
} from '../../src/ai/profile/profile';
import { createBudget, type Budget } from '../../src/ai/session/budget';
import { carriedSummary } from '../../src/ai/session/carry';
import type { CallLog, TurnOutcome } from '../../src/ai/session/loop';
import type { SessionState } from '../../src/ai/session/state';
import { toolDefinitions } from '../../src/ai/tools/schemas';
import {
  createMessagesTransport,
  type MessagesTransport,
} from '../../src/ai/transport/messagesApi';
import type { ApiMessage, Effort } from '../../src/ai/transport/wire';
import {
  core,
  createTutor,
  DEFAULT_TUTOR_CONFIG,
  exercisePack,
} from '../../src/ai/tutor';
import type { LoadedExercise } from '../../src/content/loader';
import { loadExercise } from '../../src/content/loader';
import scEx2 from '../../src/content/exercises/bac2022c-sc-ex2.json';
import scEx2Mis from '../../src/content/exercises/bac2022c-sc-ex2.misconceptions.json';
import { parseEnv } from '../replay/evalLib';
import { PERSONAS, type Persona } from './personas';
import {
  actText,
  describeInput,
  renderForStudent,
  SimStudent,
} from './simStudent';

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(__dirname, 'out');

const EXERCISES: Record<string, { raw: unknown; mis: unknown }> = {
  'bac2022c-sc-ex2': { raw: scEx2, mis: scEx2Mis },
};

function apiKey(): string {
  const envPath = path.join(root, '.env.llm.local');
  const file = existsSync(envPath)
    ? parseEnv(readFileSync(envPath, 'utf8'))
    : {};
  return process.env.CLAUDE_API_KEY ?? file.CLAUDE_API_KEY ?? '';
}

function load(id: string) {
  const e = EXERCISES[id];
  if (!e) {
    throw new Error(`unknown exercise ${id}`);
  }
  const r = loadExercise(e.raw, e.mis);
  if (!r.ok) {
    throw new Error(`load ${id}: ${r.errors.slice(0, 3).join('; ')}`);
  }
  return { loaded: r.loaded, raw: e.raw as never };
}

function args(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1] ?? '';
      i++;
    }
  }
  return out;
}

function packCommand(exerciseId: string): void {
  const { loaded, raw } = load(exerciseId);
  const p = exercisePack(loaded, raw);
  const tools = JSON.stringify(toolDefinitions());
  console.log(
    `core prompt: ${core().length} chars; tools: ${
      tools.length
    } chars; exercise pack: ${p.text.length} chars (about ${Math.round(
      (core().length + tools.length + p.text.length) / 3.2,
    )} tokens, cached)`,
  );
  console.log(`\n${p.text}`);
}

const pct = (a: number, b: number) =>
  b === 0 ? '0%' : `${Math.round((100 * a) / b)}%`;

/** Component and formula use in one question. */
export interface UseCounts {
  /** Component inputs shown to the student, by component name. */
  components: Record<string, number>;
  formulas: number;
  /** ask_student calls refused for a reason about the component. */
  componentRejections: number;
  studentComponentActs: number;
  studentFormulaActs: number;
}

export const emptyCounts = (): UseCounts => ({
  components: {},
  formulas: 0,
  componentRejections: 0,
  studentComponentActs: 0,
  studentFormulaActs: 0,
});

/** "GroupBoxes:2|Urn:1" (sorted), or "" when none. */
export const componentsCell = (c: Record<string, number>): string =>
  Object.entries(c)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, n]) => `${name}:${n}`)
    .join('|');

interface QuestionResult {
  questionId: string;
  ended: Extract<TurnOutcome, { kind: 'ended' }> | null;
  turns: number;
  calls: CallLog[];
  studentUsd: number;
  counts: UseCounts;
  state: SessionState;
  messages: ApiMessage[];
  secs: number;
  /** A capped budget stops the whole run. */
  capped: boolean;
}

async function runQuestion(o: {
  loaded: LoadedExercise;
  raw: never;
  questionId: string;
  student: SimStudent;
  transport: MessagesTransport;
  budget: Budget;
  effort: Effort;
  maxTurns: number;
  profile: string | null;
  carried: string | null;
  md: string[];
}): Promise<QuestionResult> {
  const { md } = o;
  const calls: CallLog[] = [];
  const counts = emptyCounts();
  const t = createTutor({
    loaded: o.loaded,
    raw: o.raw,
    questionId: o.questionId,
    transport: o.transport,
    budget: o.budget,
    config: { ...DEFAULT_TUTOR_CONFIG, effort: o.effort },
    profile: o.profile,
    carried: o.carried,
    onCall: c => calls.push(c),
  });
  md.push(
    `## Question ${o.questionId}`,
    `Carried from earlier questions: ${o.carried ?? '(none)'}`,
    `Profile given to the tutor: ${(o.profile ?? '(new student)')
      .split('\n')
      .join(' / ')}`,
    '',
  );
  let studentUsd = 0;
  let turns = 0;
  let capped = false;
  let ended: QuestionResult['ended'] = null;
  const t0 = Date.now();
  let outcome: TurnOutcome = await t.session.start(t.context);
  while (turns < o.maxTurns) {
    if (outcome.kind === 'error') {
      md.push(
        `> **error** ${outcome.error}${
          outcome.detail ? ` (${outcome.detail})` : ''
        }`,
      );
      capped = outcome.error === 'capped';
      if (outcome.retryable && !capped) {
        md.push('> retrying once');
        outcome = await t.session.retry();
        if (outcome.kind === 'error') {
          md.push(`> **error again** ${outcome.error}`);
          capped = outcome.error === 'capped';
          break;
        }
        continue;
      }
      break;
    }
    if (outcome.kind === 'ended') {
      ended = outcome;
      md.push(
        `### Question closed: ${outcome.outcome}`,
        `Summary: ${outcome.summary}`,
        `Next time: ${outcome.nextTime}`,
      );
      break;
    }
    turns += 1;
    const input = outcome.input;
    if (input.kind === 'component') {
      counts.components[input.name] = (counts.components[input.name] ?? 0) + 1;
    } else if (input.kind === 'formula') {
      counts.formulas += 1;
    }
    const ctx = { cases: t.rt.state.cases, experiment: t.pack.experiment };
    md.push(
      `### Turn ${turns} (${outcome.intent})`,
      '**Tutor:**',
      ...renderForStudent(outcome.blocks)
        .split('\n')
        .map(l => (l.startsWith('[formula] ') ? `    ${l.slice(10)}` : l)),
      input.kind === 'component'
        ? `_input: component ${input.name} (case ${
            input.case_id ?? 'exercise urn'
          }) ${input.props_json.slice(0, 400)}_`
        : `_${describeInput(input)}_`,
      ...(input.kind === 'component'
        ? [`_the student sees: ${describeInput(input, ctx)}_`]
        : []),
      '',
    );
    const { act, costUsd } = await o.student.answer(outcome.blocks, input, ctx);
    studentUsd += costUsd;
    if (act.kind === 'component') {
      counts.studentComponentActs += 1;
    } else if (act.kind === 'formula') {
      counts.studentFormulaActs += 1;
    }
    md.push(`**Student:** ${actText(act)}`);
    outcome = await t.session.reply(act);
    const checked = t.session.lastChecked;
    if (checked) {
      md.push(`> engine: \`${JSON.stringify(checked.result).slice(0, 600)}\``);
    }
    md.push('');
  }
  counts.componentRejections = calls
    .flatMap(c => c.rejected)
    .filter(r => /component/i.test(r)).length;
  return {
    questionId: o.questionId,
    ended,
    turns,
    calls,
    studentUsd,
    counts,
    state: t.rt.state,
    messages: t.session.messages,
    secs: Math.round((Date.now() - t0) / 1000),
    capped,
  };
}

/** The metrics of one question, as Markdown lines and as the CSV cells. */
function metricsOf(r: QuestionResult) {
  const { calls } = r;
  const tutorUsd = calls.reduce((s, c) => s + c.costUsd, 0);
  const input = calls.reduce(
    (s, c) =>
      s +
      c.usage.input +
      c.usage.cacheRead +
      c.usage.cacheWrite5m +
      c.usage.cacheWrite1h,
    0,
  );
  const cacheRead = calls.reduce((s, c) => s + c.usage.cacheRead, 0);
  const lat = calls.map(c => c.latencyMs).sort((x, y) => x - y);
  const p = (q: number) =>
    lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] ?? 0;
  const rejected = calls.flatMap(c => c.rejected);
  const perTurn = new Map<number, number>();
  for (const c of calls) {
    perTurn.set(c.turn, (perTurn.get(c.turn) ?? 0) + c.latencyMs);
  }
  const waits = [...perTurn.values()].sort((x, y) => x - y);
  const w = (q: number) =>
    waits[Math.min(waits.length - 1, Math.floor(q * waits.length))] ?? 0;
  const s = r.state;
  const c = r.counts;
  const lines = [
    `### Metrics, question ${r.questionId}`,
    `- student turns: ${r.turns}; tutor model calls: ${calls.length}; wall time ${r.secs} s`,
    `- wait per student turn (all calls of the turn): p50 ${
      Math.round(w(0.5) / 100) / 10
    } s, p95 ${Math.round(w(0.95) / 100) / 10} s; per call p50 ${
      Math.round(p(0.5) / 100) / 10
    } s`,
    `- cost: tutor $${tutorUsd.toFixed(
      3,
    )}, simulated student $${r.studentUsd.toFixed(3)}; cache read ${pct(
      cacheRead,
      input,
    )} of tutor input`,
    `- components shown: ${
      componentsCell(c.components) || '(none)'
    }; formula inputs: ${c.formulas}; component rejections: ${
      c.componentRejections
    }; student component acts: ${
      c.studentComponentActs
    }; student formula acts: ${c.studentFormulaActs}`,
    `- rejected tool calls: ${rejected.length}${
      rejected.length ? ` (${rejected.slice(0, 12).join(' | ')})` : ''
    }`,
    `- his lines: ${s.lines.length}; credited: ${JSON.stringify(
      s.credited,
    )}; cases: ${JSON.stringify(s.cases)}`,
    `- paper: ${s.paper.map(l => l.fr).join(' / ') || '(empty)'}`,
    `- observations: ${
      s.observations.map(o => `${o.kind}: ${o.note}`).join(' | ') || '(none)'
    }`,
    `- component requests: ${
      s.componentRequests.map(x => x.name).join(', ') || '(none)'
    }`,
    '',
  ];
  const cells = [
    r.turns,
    calls.length,
    r.ended !== null,
    tutorUsd.toFixed(4),
    r.studentUsd.toFixed(4),
    pct(cacheRead, input),
    (w(0.5) / 1000).toFixed(1),
    (w(0.95) / 1000).toFixed(1),
    rejected.length,
  ].join(',');
  return { lines, cells, tutorUsd };
}

const CSV_HEAD =
  'run,exercise,question,persona,effort,turns,calls,ended,tutor_usd,student_usd,cache_read_pct,wait_p50_s,wait_p95_s,rejected';

function appendCsv(file: string, head: string, row: string): void {
  const csv = path.join(outDir, file);
  if (!existsSync(csv)) {
    writeFileSync(csv, `${head}\n`);
  }
  appendFileSync(csv, `${row}\n`);
}

async function runCommand(a: Record<string, string>): Promise<void> {
  const exerciseId = a.exercise ?? 'bac2022c-sc-ex2';
  const questions = (a.questions ?? a.question ?? '1')
    .split(',')
    .map(q => q.trim())
    .filter(q => q !== '');
  const persona: Persona | undefined = PERSONAS[a.persona ?? 'owner'];
  if (!persona) {
    throw new Error(`unknown persona; use ${Object.keys(PERSONAS).join(', ')}`);
  }
  const effort = (a.effort ?? AI_TUTOR.effort) as Effort;
  const maxTurns = Number(a.turns ?? 30);
  const capUsd = Number(a.cap ?? 2 * questions.length);
  const key = apiKey();
  if (!key) {
    throw new Error('no CLAUDE_API_KEY (shell or .env.llm.local)');
  }
  const { loaded, raw } = load(exerciseId);
  const pack = exercisePack(loaded, raw);
  for (const q of questions) {
    if (!pack.questions.has(q)) {
      throw new Error(`no question ${q} in ${exerciseId}`);
    }
  }
  const transport = createMessagesTransport({ apiKey: key });
  const budget = createBudget({ sessionCapUsd: capUsd });
  const student = new SimStudent({
    persona,
    statement: pack.text.split('\n')[1] ?? '',
    transport,
    budget,
    model: AI_TUTOR.model,
  });

  const runId = `${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}-${exerciseId}-q${questions.join('-')}-${
    persona.id
  }-${effort}`;
  const md: string[] = [
    `# Tutor run ${runId}`,
    `Exercise ${exerciseId}, questions ${questions.join(
      ', ',
    )}; student persona: ${persona.id}; tutor: ${
      AI_TUTOR.model
    }, effort ${effort}; cap $${capUsd} for the run; ${maxTurns} turns per question.`,
    '',
  ];
  const results: QuestionResult[] = [];
  let profile: StudentProfile | null = null;
  for (const questionId of questions) {
    const notes = pack.questions.get(questionId)?.notes ?? null;
    const r = await runQuestion({
      loaded,
      raw,
      questionId,
      student,
      transport,
      budget,
      effort,
      maxTurns,
      profile: profile ? profileDigest(profile, notes) : null,
      carried: carriedSummary(results.map(x => x.state)),
      md,
    });
    results.push(r);
    md.push(...metricsOf(r).lines);
    // The profile the next question starts from (in memory, this run only).
    profile = applySession(profile ?? emptyProfile(Date.now()), {
      state: r.state,
      outcome: r.ended?.outcome ?? 'stopped',
      summary: r.ended?.summary ?? '',
      nextTime: r.ended?.nextTime ?? '',
      now: Date.now(),
    });
    if (r.capped) {
      md.push('> budget reached: the run stops here', '');
      break;
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `${runId}.md`), md.join('\n'));
  writeFileSync(
    path.join(outDir, `${runId}.json`),
    JSON.stringify(
      results.map(r => ({
        question: r.questionId,
        calls: r.calls,
        state: r.state,
        messages: r.messages,
      })),
      null,
      1,
    ),
  );
  for (const r of results) {
    const { cells } = metricsOf(r);
    const lead = `${runId},${exerciseId},${r.questionId},${persona.id},${effort}`;
    appendCsv('summary.csv', CSV_HEAD, `${lead},${cells}`);
    appendCsv(
      'summary.v2.csv',
      `${CSV_HEAD},components,formulas,component_rejections`,
      `${lead},${cells},${componentsCell(r.counts.components)},${
        r.counts.formulas
      },${r.counts.componentRejections}`,
    );
  }
  const total = results.reduce(
    (s, r) => s + metricsOf(r).tutorUsd + r.studentUsd,
    0,
  );
  for (const r of results) {
    console.log(metricsOf(r).lines.join('\n'));
  }
  console.log(
    `total cost $${total.toFixed(3)}; transcript: ${path.relative(
      root,
      path.join(outDir, `${runId}.md`),
    )}`,
  );
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  if (cmd === 'pack') {
    packCommand(
      rest[0] && !rest[0].startsWith('--') ? rest[0] : 'bac2022c-sc-ex2',
    );
  } else if (cmd === 'run') {
    await runCommand(a);
  } else {
    console.log(
      'usage: npm run tutor -- pack [exercise] | run --question 1 | --questions 1,2,3a,3b --persona owner [--effort medium] [--turns 30] [--cap 2 per question]',
    );
  }
}

// Not when imported by a test.
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : 'failed');
    process.exitCode = 1;
  });
}
