/**
 * Bookkeeping tools: the roadmap strip, the exam write-up, observations for
 * the student's profile, and requests for components that do not exist yet.
 * They change the session state only; their result is a short acknowledgement.
 */
import type { z } from 'zod';

import type { SessionState } from '../session/state';
import type { ToolContext, ToolOutcome } from './compute';
import type {
  RecordObservationSchema,
  RequestComponentSchema,
  SetRoadmapSchema,
  WritePaperSchema,
} from './schemas';

const fail = (error: string): ToolOutcome => ({ ok: false, error });
const DIGIT = /[0-9٠-٩]/;

function setRoadmap(
  ctx: ToolContext,
  input: z.infer<typeof SetRoadmapSchema>,
): ToolOutcome {
  const ids = new Set(input.stages.map(st => st.id));
  if (!ids.has(input.current)) {
    return fail(`current ${input.current} is not one of the stages`);
  }
  const texts = [
    ...input.stages.map(st => st.title),
    input.now,
    input.why,
    input.next,
  ];
  if (texts.some(t => DIGIT.test(t))) {
    return fail(
      'the roadmap names the steps without numbers (the how stays his to find)',
    );
  }
  ctx.rt.state.roadmap = {
    stages: input.stages,
    current: input.current,
    done: input.done.filter(d => ids.has(d)),
    now: input.now,
    why: input.why,
    next: input.next,
  };
  return { ok: true, result: { shown: true } };
}

const credited = (s: SessionState, lineId: string): boolean => {
  const l = s.lines.find(x => x.id === lineId);
  return (
    l !== undefined &&
    (l.match?.verdict === 'credit' || l.match?.verdict === 'support')
  );
};

/** Numbers as written: integers, decimals, fractions ("120", "0,5", "1/2"). */
const NUMBER = /\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/g;
const numbers = (text: string): string[] =>
  (text.match(NUMBER) ?? []).map(n => n.replace(/\s+/g, ''));

/** Numbers in a paper line come from his own credited line or the exercise's data. */
function digitsCovered(
  fr: string,
  line: string,
  given: readonly string[],
): boolean {
  const own = new Set([
    ...numbers(line),
    ...(line.match(/\d+/g) ?? []),
    ...given,
  ]);
  return numbers(fr).every(d => own.has(d));
}

function writePaper(
  ctx: ToolContext,
  input: z.infer<typeof WritePaperSchema>,
): ToolOutcome {
  const s = ctx.rt.state;
  for (const l of input.lines) {
    if (l.from_line === null) {
      if (!digitsCovered(l.fr, '', s.given)) {
        return fail(
          "a paper line with a result must cite the student's credited line (from_line)",
        );
      }
      continue;
    }
    if (!credited(s, l.from_line)) {
      return fail(
        `${l.from_line} is not an engine-credited line of the student: the paper fills only from his own correct lines`,
      );
    }
    // His numbers: the cited line and every other line the engine credited.
    const raw = s.lines
      .filter(x => x.id === l.from_line || credited(s, x.id))
      .map(x => x.raw)
      .join(' ');
    // Notation names (C(10,3)) may be added around his numbers: only bare
    // results are compared, the arguments of C(..) are exempt.
    const withoutNotation = l.fr.replace(/C\s*\(\s*\d+\s*[,;]\s*\d+\s*\)/g, '');
    if (!digitsCovered(withoutNotation, raw, s.given)) {
      return fail(
        `the paper line has numbers that are not in ${l.from_line} ("${raw}")`,
      );
    }
  }
  for (const l of input.lines) {
    s.paper.push({ fr: l.fr, fromLine: l.from_line });
  }
  return { ok: true, result: { paper_lines: s.paper.length } };
}

function recordObservation(
  ctx: ToolContext,
  input: z.infer<typeof RecordObservationSchema>,
): ToolOutcome {
  const s = ctx.rt.state;
  const unknown = input.evidence.filter(id => !s.lines.some(l => l.id === id));
  if (unknown.length > 0) {
    return fail(`unknown line ids: ${unknown.join(', ')}`);
  }
  s.observations.push({
    id: `O${s.observations.length + 1}`,
    turn: s.turn,
    kind: input.kind,
    skill: input.skill,
    slip: input.slip,
    note: input.note,
    evidence: input.evidence,
    confidence: input.confidence,
  });
  return { ok: true, result: { recorded: true } };
}

function requestComponent(
  ctx: ToolContext,
  input: z.infer<typeof RequestComponentSchema>,
): ToolOutcome {
  ctx.rt.state.componentRequests.push({
    turn: ctx.rt.state.turn,
    name: input.name,
    studentDoes: input.student_does,
    why: input.why,
    closest: input.closest,
  });
  return { ok: true, result: { noted: true } };
}

type Runner = (ctx: ToolContext, input: never) => ToolOutcome;

export const BOOKKEEPING: Readonly<Record<string, Runner>> = {
  set_roadmap: setRoadmap as Runner,
  write_paper: writePaper as Runner,
  record_observation: recordObservation as Runner,
  request_component: requestComponent as Runner,
};
