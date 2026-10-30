/**
 * What the student did, judged by the engine before the tutor sees it. The
 * result has two parts, sent in ONE user message: the tool_result of
 * ask_student (the engine's verdict, JSON) and a text block with his own
 * words. His words never go inside the tool_result (Sonnet 5.5 may read text
 * inside a tool result as an injection attempt).
 * Lines get ids L1, L2...; a credited line credits its node.
 */
import { listBoxes } from '../../engine/grouping';
import { checkPlan, checkRead } from '../../method/frame';
import { ballsOf } from '../../method/repair';
import type { QuestionPack } from '../packs/build';
import {
  credit,
  type SessionRuntime,
  type StudentLine,
} from '../session/state';
import { judgeLine } from '../tools/compute';
import type { AskInput, Expect } from '../tools/schemas';
import { checkFormula } from './formula';
import { mathSegments } from './freeText';

export type StudentAct =
  | { kind: 'free'; text: string }
  | { kind: 'dont_know' }
  | { kind: 'continue' }
  | { kind: 'line'; raw: string; readback?: 'grouped' | 'literal' }
  /** A formula typed as text (letters n, k): checked by src/ai/checks/formula.ts. */
  | { kind: 'formula'; raw: string }
  | { kind: 'choice'; optionId: string }
  | { kind: 'order'; ids: string[] }
  | { kind: 'tap_word'; token: string }
  | { kind: 'list'; groups: string[][] }
  | {
      kind: 'component';
      events: { name: string; payload: unknown }[];
      result: { correct: boolean | null; details: unknown } | null;
    };

export interface Checked {
  /** JSON for the ask_student tool_result. */
  result: Record<string, unknown>;
  /** The student's act in words (the text block after the results). */
  text: string;
}

function recordLine(
  rt: SessionRuntime,
  raw: string,
  expect: Expect | null,
): { line: StudentLine; engine: Record<string, unknown> } {
  const s = rt.state;
  const j = judgeLine(rt, raw, expect);
  const line: StudentLine = {
    id: `L${s.lines.length + 1}`,
    raw,
    turn: s.turn,
    graph: j.graph,
    expected: expect?.kind === 'node' ? expect.node : null,
    verdict: j.verdict,
    match: j.match,
  };
  s.lines.push(line);
  if (j.graph && j.match?.verdict === 'credit') {
    credit(s, j.graph, j.match.node);
  }
  return {
    line,
    engine: { ...j.verdict, match: j.match },
  };
}

const MAX_TEXT = 1200;
/** "I don't know" in darija, Arabizi or French. */
const DONT_KNOW = /ما\s*نعرفش|ma\s*na3r(a)?fch|je ne sais pas|aucune id[ée]e/i;
const quote = (t: string) => `«${t.slice(0, MAX_TEXT)}»`;

/** All groups of a case, as sorted id keys, and its labels. */
function caseGroups(
  rt: SessionRuntime,
  caseId: string,
  size: number,
): { keys: Set<string>; label: (id: string) => string } | null {
  const spec = rt.state.cases[caseId];
  if (!spec) {
    return null;
  }
  const labelled =
    spec.kind === 'box'
      ? 'abcdefgh'
          .slice(0, spec.n)
          .split('')
          .map(id => ({ id, label: id }))
      : ballsOf(spec.reds, spec.blacks);
  const balls = labelled.map(b => ({ id: b.id, value: 0 }));
  const keys = new Set(
    listBoxes(balls, size).map(b => [...b.ballIds].sort().join('-')),
  );
  const labels = new Map(labelled.map(b => [b.id, b.label]));
  return { keys, label: id => labels.get(id) ?? id };
}

export function autoCheck(
  act: StudentAct,
  input: AskInput | null,
  rt: SessionRuntime,
  pack: QuestionPack,
): Checked {
  switch (act.kind) {
    case 'dont_know':
      rt.state.dontKnows += 1;
      return {
        result: { reply: 'dont_know' },
        text: "Student tapped «ما نعرفش» (I don't know).",
      };
    case 'continue':
      return {
        result: { reply: 'continue' },
        text: 'Student tapped continue.',
      };
    case 'line': {
      const expect = input?.kind === 'line' ? input.expect : null;
      const raw =
        act.readback === 'grouped' ? groupedOf(act.raw) ?? act.raw : act.raw;
      const { line, engine } = recordLine(rt, raw, expect);
      return {
        result: {
          reply: 'line',
          line_id: line.id,
          ...(act.readback && { readback_confirmed: act.readback }),
          engine,
        },
        text: `Student (line ${line.id}): ${raw}`,
      };
    }
    case 'formula': {
      const expect = input?.kind === 'formula' ? input.expect : null;
      // With a reference the engine compares his formula on many values;
      // without one it still says whether it reads and which letters it uses.
      const verdict = checkFormula(
        act.raw,
        expect?.expr ?? act.raw,
        expect?.vars ?? ['n', 'k'],
      );
      return {
        result: {
          reply: 'formula',
          raw: act.raw,
          engine: expect
            ? verdict
            : {
                readable: verdict.readable,
                ...(verdict.reason !== undefined && { reason: verdict.reason }),
                usedLetters: verdict.usedLetters,
              },
        },
        text: `Student (formula): ${act.raw}`,
      };
    }
    case 'free': {
      if (DONT_KNOW.test(act.text)) {
        rt.state.dontKnows += 1;
      }
      const segments = mathSegments(act.text).map(seg => {
        const { line, engine } = recordLine(rt, seg, null);
        // A bare number in a sentence ("10 boules") is not a calculation:
        // matched by value alone it would be labelled as a random slip.
        if (
          line.verdict.sides.length === 1 &&
          /^\(?[\d.,/\s]+\)?$/.test(seg) &&
          line.match?.verdict !== 'credit'
        ) {
          line.match = null;
          return {
            line_id: line.id,
            text: seg,
            engine: { value: line.verdict.value },
          };
        }
        return { line_id: line.id, text: seg, engine };
      });
      return {
        result: { reply: 'free', math_segments: segments },
        text: `Student wrote: ${quote(act.text)}`,
      };
    }
    case 'choice': {
      const options = input?.kind === 'choice' ? input.options : [];
      const o = options.find(x => x.id === act.optionId);
      return {
        result: { reply: 'choice', option_id: act.optionId },
        text: `Student chose: ${o ? quote(o.text) : act.optionId}`,
      };
    }
    case 'order': {
      const cards = input?.kind === 'order' ? input.cards : [];
      const textOf = (id: string) => cards.find(c => c.id === id)?.text ?? id;
      const planIds = pack.plan.map(c => c.id);
      const isPlan =
        act.ids.length === planIds.length &&
        act.ids.every(id => planIds.includes(id));
      let engine: Record<string, unknown> = {};
      if (isPlan) {
        engine = { plan: checkPlan(pack.plan, act.ids) };
      } else if (pack.recipe) {
        const r = pack.recipe;
        engine = {
          recipe: {
            chosen: act.ids.map(id => ({ id, kind: r.kinds[id] ?? 'unknown' })),
            distractors: act.ids.filter(id => r.kinds[id] === 'distractor'),
            missing_from_clean: r.clean.filter(id => !act.ids.includes(id)),
          },
        };
      }
      return {
        result: { reply: 'order', ids: act.ids, engine },
        text: `Student ordered: ${act.ids
          .map(id => quote(textOf(id)))
          .join(' > ')}`,
      };
    }
    case 'tap_word': {
      const r = checkRead(pack.read, act.token);
      return {
        result: {
          reply: 'tap_word',
          token: act.token,
          engine: r.ok ? { right: true, effect: r.effect } : { right: false },
        },
        text: `Student tapped the word ${quote(act.token)}.`,
      };
    }
    case 'list': {
      const caseId = input?.kind === 'list' ? input.case_id : '';
      const size = input?.kind === 'list' ? input.size : 0;
      const g = caseGroups(rt, caseId, size);
      if (!g) {
        return {
          result: { reply: 'list', engine: { error: 'unknown case' } },
          text: `Student listed: ${act.groups.map(x => x.join('')).join(', ')}`,
        };
      }
      const seen = new Set<string>();
      let repeated = 0;
      let invalid = 0;
      for (const group of act.groups) {
        const key = group
          .map(x => x.trim().toLowerCase())
          .sort()
          .join('-');
        if (!g.keys.has(key)) {
          invalid++;
        } else if (seen.has(key)) {
          repeated++;
        } else {
          seen.add(key);
        }
      }
      return {
        result: {
          reply: 'list',
          case_id: caseId,
          engine: {
            distinct_right: seen.size,
            total: g.keys.size,
            missing: g.keys.size - seen.size,
            repeated,
            invalid,
            complete: seen.size === g.keys.size,
          },
        },
        text: `Student listed (${caseId}): ${act.groups
          .map(x => x.map(g.label).join(''))
          .join(', ')}`,
      };
    }
    case 'component': {
      const name = input?.kind === 'component' ? input.name : 'component';
      const s = summariseEvents(act.events);
      return {
        result: {
          reply: 'component',
          component: name,
          actions: s.counts,
          findings: s.findings,
          last: s.last,
          result: act.result,
        },
        text: `Student used ${name} and pressed done${
          s.notes.length > 0 ? `: ${quote(s.notes.join(' / '))}` : '.'
        }`,
      };
    }
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * What he did with a component, in a few fields the tutor can read: how many
 * times each action happened, the findings the component confirmed
 * (probability2 'finding' events: what he counted and whether it was right),
 * the last few actions, and any note he typed.
 */
export function summariseEvents(
  events: readonly { name: string; payload: unknown }[],
): {
  counts: Record<string, number>;
  findings: unknown[];
  last: { name: string; payload: unknown }[];
  notes: string[];
} {
  const counts: Record<string, number> = {};
  const findings: unknown[] = [];
  const notes: string[] = [];
  for (const e of events) {
    counts[e.name] = (counts[e.name] ?? 0) + 1;
    if (e.name === 'finding' && isRecord(e.payload)) {
      const { findingId, numbers, correct, route } = e.payload;
      findings.push({ findingId, numbers, correct, route });
    }
    if (isRecord(e.payload) && typeof e.payload.note === 'string') {
      notes.push(e.payload.note.slice(0, 300));
    }
  }
  const compact = (p: unknown): unknown => {
    const j = JSON.stringify(p) ?? '';
    return j.length > 200 ? `${j.slice(0, 200)}…` : p;
  };
  return {
    counts,
    findings: findings.slice(-6),
    last: events
      .slice(-5)
      .map(e => ({ name: e.name, payload: compact(e.payload) })),
    notes,
  };
}

/** His line with the brackets of the readback ("990/(3*2*1)=..."). */
function groupedOf(raw: string): string | null {
  const m = /^(.*?[/÷]\s*)(\d+(?:\s*[*×]\s*\d+)+)(.*)$/.exec(raw);
  return m ? `${m[1]}(${m[2]})${m[3]}` : null;
}
