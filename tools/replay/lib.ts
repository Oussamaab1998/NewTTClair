/**
 * Replay harness (docs/PLANNER.md, measurement plan). Pure functions; the CLI
 * (cli.ts) does the file I/O.
 * - readLog: event logs in the CURRENT JSONL format (one EventSchema event per line).
 * - convertLegacy: the prototype-3 log (docs/samples/ex2_session_1.jsonl) to the
 *   current format. Steps are mapped with a GUESSED map; every field the old
 *   log lacks is listed in a sidecar as "unknown" (never invented).
 * - replayDecisions: at each decision point, the situation, the state summary
 *   and what the rules planner decides (rule id, action, representation).
 * - agreement: planner decisions vs a labels file (a teacher's preferred action).
 */
import { z } from 'zod';

import { stepKey, type LoadedExercise } from '../../src/content/loader';
import { buildMenu } from '../../src/planner/planner';
import { createRulesPlanner, type RulesPlanner } from '../../src/planner/rules';
import type { Action, Decision } from '../../src/planner/schema';
import {
  buildSituation,
  triggerOf,
  type Situation,
} from '../../src/planner/situation';
import {
  catalogFor,
  eventStepKey,
  type Catalog,
} from '../../src/state/catalog';
import {
  EventSchema,
  type Event,
  type EventDraft,
} from '../../src/telemetry/events';
import { EventLog, fixedClock } from '../../src/telemetry/log';

// ---------------------------------------------------------------------------
// Reading logs (current format).

export interface ReadResult {
  events: Event[];
  errors: { line: number; issue: string }[];
}

export function readLog(text: string): ReadResult {
  const events: Event[] = [];
  const errors: ReadResult['errors'] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') {
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      errors.push({ line: i + 1, issue: 'not JSON' });
      return;
    }
    const r = EventSchema.safeParse(json);
    if (r.success) {
      events.push(r.data);
    } else {
      errors.push({
        line: i + 1,
        issue: r.error.issues
          .slice(0, 3)
          .map(x => `${x.path.join('.')}: ${x.message}`)
          .join('; '),
      });
    }
  });
  return { events, errors };
}

// ---------------------------------------------------------------------------
// Legacy (prototype 3) conversion.

export const LEGACY_VERSION = 'legacy-proto3';

export const LegacyMapSchema = z.strictObject({
  note: z.string(),
  guess: z.literal(true),
  contentVersion: z.literal(LEGACY_VERSION),
  /** Old step id -> question id. */
  questions: z.record(z.string(), z.string()),
  /** Old step id -> current step id, or null when the step is not in our content. */
  steps: z.record(z.string(), z.string().nullable()),
  /** Old deep dive id -> current deep dive id. */
  deepDives: z.record(z.string(), z.string()),
  /** GUESSED answer kinds for old steps not in our content (e.g. "in" = typed input). */
  kinds: z.record(z.string(), z.enum(['choice', 'typed', 'task'])).optional(),
});
export type LegacyMap = z.infer<typeof LegacyMapSchema>;

const LegacyEventSchema = z.looseObject({
  t: z.string(),
  at: z.string().optional(),
  o: z.string().optional(),
  deep: z.string().optional(),
  level: z.number().optional(),
});

export interface Unknowns {
  note: string;
  /** Fields unknown for every event. */
  global: Record<string, string>;
  events: {
    index: number;
    legacyLine: number;
    unknown: string[];
    derived: string[];
  }[];
}

export interface ConvertResult {
  events: Event[];
  unknowns: Unknowns;
  errors: string[];
}

/** Converts the prototype log. Missing facts stay missing: listed as unknown, not filled in. */
export function convertLegacy(
  text: string,
  map: LegacyMap,
  loaded: LoadedExercise,
): ConvertResult {
  const lines = text
    .split('\n')
    .map((l, i) => ({ l: l.trim(), n: i + 1 }))
    .filter(x => x.l !== '');
  const parsed = lines.map(x => ({
    n: x.n,
    e: LegacyEventSchema.parse(JSON.parse(x.l)),
  }));
  const log = new EventLog(
    {
      sessionId: 'legacy-ex2-session-1',
      studentId: 'legacy-unknown',
      exerciseId: loaded.exercise.id,
      contentVersion: map.contentVersion,
    },
    fixedClock(0),
  );
  const out: Event[] = [];
  const meta: Unknowns['events'] = [];
  const errors: string[] = [];
  const wrongs = new Map<string, number>();
  let open: {
    deepDiveId: string;
    parent: string;
    question: string;
    miniWrong: number;
  } | null = null;

  const kindOf = (
    question: string,
    stepId: string,
  ): 'choice' | 'typed' | 'task' | null => {
    const s = loaded.exercise.parts
      .find(q => q.id === question)
      ?.groups.flatMap(g => g.steps)
      .find(x => x.id === stepId);
    if (!s) {
      return null;
    }
    return s.kind === 'choice'
      ? 'choice'
      : s.kind === 'typed'
      ? 'typed'
      : 'task';
  };
  const where = (at: string) => {
    const question = map.questions[at] ?? 'unknown';
    const mapped = map.steps[at];
    return {
      question,
      stepId: mapped ?? at,
      known: mapped !== null && mapped !== undefined,
    };
  };
  const emit = (
    n: number,
    draft: EventDraft,
    unknown: string[],
    derived: string[],
  ) => {
    const [e] = log.append([draft]);
    out.push(e!);
    meta.push({ index: out.length - 1, legacyLine: n, unknown, derived });
  };
  const closeOpen = (
    n: number,
    outcome: 'completed' | 'abandoned',
    miniCorrect?: boolean,
  ) => {
    if (!open) {
      return;
    }
    emit(
      n,
      {
        questionId: open.question,
        stepId: open.parent,
        t: 'deepdive',
        deepDiveId: open.deepDiveId,
        outcome,
        ...(miniCorrect !== undefined && { miniCorrect }),
      },
      [],
      outcome === 'abandoned'
        ? ['outcome (no end in the old log)']
        : ['outcome', 'miniCorrect'],
    );
    open = null;
  };

  parsed.forEach(({ n, e }, i) => {
    switch (e.t) {
      case 'mode': {
        const next = parsed.slice(i + 1).find(x => x.e.at !== undefined)?.e.at;
        const question = next ? map.questions[next] ?? 'unknown' : 'unknown';
        emit(
          n,
          {
            questionId: question,
            stepId: 'none',
            t: 'mode',
            value: e.o === 'try_alone' ? 'try_alone' : 'guided',
          },
          ['result'],
          ['questionId (from the next event)'],
        );
        return;
      }
      case 'correct':
      case 'wrong': {
        const correct = e.t === 'correct';
        if (e.at === 'mini') {
          if (!open) {
            errors.push(`line ${n}: mini answer outside a deep dive`);
            return;
          }
          const o: NonNullable<typeof open> = open;
          const mini = loaded.exercise.deepDives.find(
            d => d.id === o.deepDiveId,
          )?.mini;
          emit(
            n,
            {
              questionId: o.question,
              stepId: stepKey.mini(o.deepDiveId),
              t: 'answer',
              kind: mini?.kind === 'choice' ? 'choice' : 'typed',
              value: null,
              correct,
              attempt: o.miniWrong + 1,
            },
            ['value', 'durationMs', 'misconceptionId'],
            ['kind (from current content)', 'attempt (counted)'],
          );
          if (correct) {
            closeOpen(n, 'completed', o.miniWrong === 0);
          } else {
            o.miniWrong += 1;
          }
          return;
        }
        const w = where(e.at ?? 'unknown');
        if (open && open.parent === w.stepId) {
          closeOpen(n, 'abandoned');
        }
        const key = `${w.question}/${w.stepId}`;
        const kind = w.known ? kindOf(w.question, w.stepId) : null;
        const guessed = kind ? undefined : map.kinds?.[e.at ?? ''];
        emit(
          n,
          {
            questionId: w.question,
            stepId: w.stepId,
            t: 'answer',
            kind: kind ?? guessed ?? 'choice',
            value: null,
            correct,
            attempt: (wrongs.get(key) ?? 0) + 1,
          },
          [
            'value',
            'durationMs',
            'misconceptionId',
            ...(kind || guessed ? [] : ['kind']),
          ],
          [
            'attempt (counted)',
            ...(kind ? ['kind (from current content)'] : []),
            ...(guessed ? ['kind (GUESSED map)'] : []),
            'stepId (guessed map)',
          ],
        );
        if (!correct) {
          wrongs.set(key, (wrongs.get(key) ?? 0) + 1);
        }
        return;
      }
      case 'not_sure': {
        const w = where(e.at ?? 'unknown');
        const deepDiveId =
          e.deep !== undefined ? map.deepDives[e.deep] : undefined;
        emit(
          n,
          {
            questionId: w.question,
            stepId: w.stepId,
            t: 'not_sure',
            ...(deepDiveId !== undefined && { deepDiveId }),
            attempt: (wrongs.get(`${w.question}/${w.stepId}`) ?? 0) + 1,
          },
          ['durationMs'],
          ['attempt (counted)', 'stepId (guessed map)'],
        );
        if (deepDiveId !== undefined) {
          emit(
            n,
            {
              questionId: w.question,
              stepId: w.stepId,
              t: 'component_event',
              component: 'DeepDive',
              name: 'shown',
              payload: { deepDiveId, representation: 'text', derived: true },
            },
            [],
            ['whole event (the old log implies the deep dive opened)'],
          );
          open = {
            deepDiveId,
            parent: w.stepId,
            question: w.question,
            miniWrong: 0,
          };
        }
        return;
      }
      case 'transfer_ok': {
        // Mislabeled in the prototype: a mini question answered right, NOT a transfer (DATA.md).
        if (!open) {
          errors.push(`line ${n}: transfer_ok outside a deep dive`);
          return;
        }
        const o: NonNullable<typeof open> = open;
        const mini = loaded.exercise.deepDives.find(
          d => d.id === o.deepDiveId,
        )?.mini;
        emit(
          n,
          {
            questionId: o.question,
            stepId: stepKey.mini(o.deepDiveId),
            t: 'answer',
            kind: mini?.kind === 'choice' ? 'choice' : 'typed',
            value: null,
            correct: true,
            attempt: o.miniWrong + 1,
          },
          ['value', 'durationMs'],
          [
            't (old "transfer_ok" = mini answered right)',
            'kind (from current content)',
          ],
        );
        closeOpen(n, 'completed', o.miniWrong === 0);
        return;
      }
      case 'hint': {
        const w = where(e.at ?? 'unknown');
        const level = Math.min(3, Math.max(1, e.level ?? 1)) as 1 | 2 | 3;
        emit(
          n,
          { questionId: w.question, stepId: w.stepId, t: 'hint', level },
          [],
          ['stepId (guessed map)'],
        );
        return;
      }
      default:
        errors.push(`line ${n}: unknown legacy event ${e.t}`);
    }
  });

  return {
    events: out,
    unknowns: {
      note:
        'Converted from the prototype-3 log. The step map is a GUESS (see the map file). ' +
        'Fields listed as unknown are absent from the old log; nothing was invented.',
      global: {
        ts: 'unknown (synthetic, order only)',
        durationMs: 'unknown for every event',
        studentId: 'unknown',
        contentVersion: `${LEGACY_VERSION}: steps mapped by a guess onto ${loaded.exercise.contentVersion}`,
        componentEvents: 'unknown (the prototype did not log them)',
        selfReport: 'never asked in the prototype',
      },
      events: meta,
    },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Replaying decisions.

export interface DecisionRow {
  point: number;
  eventIndex: number;
  step: string;
  trigger: Situation['trigger'];
  happened: string;
  state: string;
  ruleId: string;
  action: string;
  kind: Action['kind'];
  representation: string;
  /** What the app decided at that point, if the log has its plan event. */
  logged?: string;
  unknown: string[];
}

export function catalogForLog(
  loaded: LoadedExercise,
  events: readonly Event[],
): Catalog {
  const catalog = catalogFor(loaded);
  if (events.some(e => e.contentVersion === LEGACY_VERSION)) {
    // Guessed mapping: legacy step ids were mapped onto the current content's ids.
    catalog.versions.set(
      LEGACY_VERSION,
      catalog.versions.get(loaded.exercise.contentVersion)!,
    );
  }
  return catalog;
}

export function describeAction(a: Action): string {
  switch (a.kind) {
    case 'variant':
      return `variant ${a.variantId}${a.offer ? ' (offered)' : ''}`;
    case 'deep_dive':
      return `deep_dive ${a.deepDiveId}`;
    case 'hint':
      return `hint ${a.level}`;
    case 'revisit_prerequisite':
      return `prerequisite ${a.skillId}`;
    case 'ask_clarify':
      return `ask_clarify (${(a.choices ?? []).join(' / ')})`;
    case 'show_component':
      return `show ${a.component.component}`;
    default:
      return a.kind;
  }
}

function happened(e: Event, s: Situation): string {
  switch (e.t) {
    case 'answer':
      return `${e.correct ? 'right' : 'wrong'} (attempt ${e.attempt}, value ${
        e.value === null ? 'unknown' : JSON.stringify(e.value)
      })`;
    case 'not_sure':
      return `not sure${
        e.deepDiveId ? ` (deep dive ${e.deepDiveId} available)` : ''
      }`;
    case 'deepdive': {
      const ok =
        e.miniCorrect === undefined
          ? ''
          : e.miniCorrect
          ? ', mini right first'
          : ', mini wrong first';
      return `deep dive ${e.deepDiveId} ${e.outcome}${ok}`;
    }
    case 'component_event':
      return `variant ${String(e.payload.variantId)} ${String(
        e.payload.outcome,
      )}`;
    case 'request':
      return `button: ${e.kind}`;
    case 'clarify':
      return `unclear: ${e.choice}`;
    case 'self_report':
      return `self-report: ${e.value}`;
    default:
      return `${e.t} (${s.trigger})`;
  }
}

function stateSummary(s: Situation): string {
  const st = s.step;
  const skills = Object.entries(s.skills)
    .map(([id, v]) => `${id}:${v.status}`)
    .join(' ');
  const tried = s.representationsTried.length
    ? ` tried[${s.representationsTried.join(',')}]`
    : '';
  return `w${st.wrong} ns${st.notSure} h${st.hintsUsed} d${s.depth} streak${
    s.question.cleanStreak
  }${skills ? ` ${skills}` : ' skills:unknown'}${tried}`;
}

export function replayDecisions(
  events: readonly Event[],
  loaded: LoadedExercise,
  opts: { unknowns?: Unknowns; planner?: RulesPlanner } = {},
): DecisionRow[] {
  const catalog = catalogForLog(loaded, events);
  const planner = opts.planner ?? createRulesPlanner(buildMenu(loaded));
  const rows: DecisionRow[] = [];
  events.forEach((e, i) => {
    if (triggerOf(e) === null) {
      return;
    }
    const s = buildSituation(events, catalog, { at: i });
    if (!s) {
      return;
    }
    const d: Decision = planner.decideSync(s);
    const plan = events
      .slice(i + 1)
      .find(x => x.t === 'plan' || triggerOf(x) !== null);
    rows.push({
      point: rows.length + 1,
      eventIndex: i,
      step: eventStepKey(e),
      trigger: s.trigger,
      happened: happened(e, s),
      state: stateSummary(s),
      ruleId: d.ruleId,
      action:
        describeAction(d.next) +
        (d.followUp ? ` + ${describeAction(d.followUp)}` : ''),
      kind: d.next.kind,
      representation: d.representation ?? '-',
      ...(plan?.t === 'plan' && { logged: plan.decision.ruleId }),
      unknown: opts.unknowns?.events.find(x => x.index === i)?.unknown ?? [],
    });
  });
  return rows;
}

export function formatTable(rows: readonly DecisionRow[]): string {
  const head = [
    '#',
    'step',
    'what happened',
    'state',
    'rule',
    'action',
    'representation',
    'logged',
  ];
  const body = rows.map(r => [
    String(r.point),
    r.step,
    r.happened +
      (r.unknown.length ? ` [unknown: ${r.unknown.join(', ')}]` : ''),
    r.state,
    r.ruleId,
    r.action,
    r.representation,
    r.logged === undefined ? '-' : r.logged === r.ruleId ? 'same' : r.logged,
  ]);
  const esc = (c: string) => c.replace(/\|/g, '\\|');
  return [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...body.map(cells => `| ${cells.map(esc).join(' | ')} |`),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Labels and agreement.

export const LabelsSchema = z.strictObject({
  /** Who labeled. Transcriptions must say so; only a teacher's labels count as labels. */
  source: z.string().min(1),
  teacherReviewed: z.boolean(),
  log: z.string().min(1),
  /** Rows of the source table that are not decision points (kept for traceability). */
  excluded: z.array(z.string()).optional(),
  points: z.array(
    z.strictObject({
      row: z.number().int(),
      at: z.strictObject({
        step: z.string().min(1),
        trigger: z.string().min(1),
        /** The nth time this step + trigger appears in the log (1-based). */
        occurrence: z.number().int().min(1).default(1),
      }),
      preferred: z.strictObject({
        kinds: z.array(z.string().min(1)).min(1),
        /** If given, the representation must be one of these too. */
        representations: z.array(z.string().min(1)).optional(),
      }),
      note: z.string().optional(),
    }),
  ),
});
export type Labels = z.infer<typeof LabelsSchema>;

export type Verdict = 'agree' | 'partial' | 'disagree' | 'missing';

export interface AgreementRow {
  row: number;
  at: string;
  preferred: string;
  planner: string;
  ruleId: string;
  verdict: Verdict;
  note?: string;
}

export function agreement(
  rows: readonly DecisionRow[],
  labels: Labels,
): { rows: AgreementRow[]; counts: Record<Verdict, number> } {
  const counts: Record<Verdict, number> = {
    agree: 0,
    partial: 0,
    disagree: 0,
    missing: 0,
  };
  const out = labels.points.map(p => {
    const matches = rows.filter(
      r => r.step === p.at.step && r.trigger === p.at.trigger,
    );
    const r = matches[p.at.occurrence - 1];
    const preferred =
      p.preferred.kinds.join(' / ') +
      (p.preferred.representations
        ? ` [${p.preferred.representations.join(' / ')}]`
        : '');
    let verdict: Verdict;
    if (!r) {
      verdict = 'missing';
    } else if (!p.preferred.kinds.includes(r.kind)) {
      verdict = 'disagree';
    } else if (
      p.preferred.representations &&
      !p.preferred.representations.includes(r.representation)
    ) {
      verdict = 'partial';
    } else {
      verdict = 'agree';
    }
    counts[verdict] += 1;
    return {
      row: p.row,
      at: `${p.at.step} ${p.at.trigger} #${p.at.occurrence}`,
      preferred,
      planner: r ? `${r.action} [${r.representation}]` : '-',
      ruleId: r?.ruleId ?? '-',
      verdict,
      ...(p.note !== undefined && { note: p.note }),
    };
  });
  return { rows: out, counts };
}

export function formatAgreement(
  result: ReturnType<typeof agreement>,
  labels: Labels,
): string {
  const lines = [
    `Labels: ${labels.source}`,
    labels.teacherReviewed
      ? 'Teacher-reviewed labels.'
      : 'WARNING: these are NOT teacher labels (teacherReviewed: false). Agreement below is with a transcription, not with a teacher.',
    '',
    '| row | decision point | preferred | planner | rule | verdict |',
    '|---|---|---|---|---|---|',
    ...result.rows.map(
      r =>
        `| ${r.row} | ${r.at} | ${r.preferred} | ${r.planner} | ${r.ruleId} | ${r.verdict} |`,
    ),
  ];
  const n = result.rows.length;
  const { agree, partial, disagree, missing } = result.counts;
  lines.push(
    '',
    `agree ${agree}/${n}, partial ${partial}, disagree ${disagree}, missing ${missing}` +
      (n > 0
        ? ` (agreement ${Math.round(
            (100 * agree) / n,
          )}%, with partial ${Math.round((100 * (agree + partial)) / n)}%)`
        : ''),
  );
  return lines.join('\n');
}
