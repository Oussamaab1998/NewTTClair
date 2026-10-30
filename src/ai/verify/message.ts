/**
 * Every ask_student call is checked here before the student sees anything.
 * A rejection goes back to the model as an is_error result with the reasons,
 * and it writes the message again. Checks, in order:
 * 1. Shape and right-to-left: Arabic text is split into isolated runs
 *    (isolateLlmRuns); LaTeX, a bidi control or a long formula inside Arabic
 *    text is refused; a run of one repeated character is refused.
 * 2. Math blocks parse with the app's renderer; no Arabic inside.
 * 3. Provenance: every number above 10 comes from the statement, his lines,
 *    or an engine result this session. A false "=" in a math block is refused.
 * 4. Leak: a value of the question's graph he has not earned yet is refused,
 *    unless he already tried that node 3 times.
 * 5. Notation: C(n,k) only after he computed the gating node himself.
 * 6. One question per message.
 * 7. Inputs: a component resolves in the registry and reveals no unearned
 *    value; a list case exists and is small; choice options pass 3 and 4.
 */
import type { Experiment } from '../../engine/calls';
import { REGISTRY, resolveSpec } from '../../components/registry';
import { revealedByRules } from '../../components/reveals';
import type { ComponentName } from '../../components/contract';
import { frac, type Fraction } from '../../engine/rational';
import { sameRat } from '../../engine/rationalFormat';
import { parseLatexSubset } from '../../lesson/math/latexSubset';
import { leaves } from '../../method/factorForm';
import { lineLatex } from '../../method/lineChain';
import { isolateLlmRuns, type ArRuns } from '../../lesson/rich/runs';
import { numbersIn } from '../../planner/llm/numbers';
import { latexToPlain } from '../../tutor/verify';
import { plain, readLine } from '../checks/lines';
import type { QuestionPack } from '../packs/build';
import type { SessionRuntime } from '../session/state';
import { boxValues, caseExperiment } from '../session/state';
import type { AskStudent } from '../tools/schemas';

/** What the screen renders: blocks with their text made safe. */
export type RenderBlock =
  | { type: 'ar'; runs: ArRuns }
  | { type: 'fr'; text: string }
  | { type: 'math'; latex: string }
  | { type: 'student_line'; lineId: string; raw: string }
  | {
      type: 'compare';
      lines: [{ id: string; raw: string }, { id: string; raw: string }];
    };

/** A component the screen draws inside the tutor's message (props already validated). */
export interface ShownComponent {
  name: ComponentName;
  props: Record<string, unknown>;
  /** The urn it draws: a small case's, or the exercise's. */
  experiment: Experiment | null;
  caseId: string | null;
}

export type VerifyResult =
  | { ok: true; blocks: RenderBlock[]; component: ShownComponent | null }
  | { ok: false; reasons: string[] };

const ARABIC = /[؀-ۿ]/;
const REPEAT = /(.)\1{19,}/u;
const QUESTION = /[?؟]/g;
const NOTATION_LATEX =
  /\\binom|C_\s*\{|C_\s*\d|C\^|\\mathrm\{C\}|\bC\s*\(|A_\s*\{/;
const NOTATION_TEXT = /\bC\s*\(\s*\d/;
/** A calculation (number, operator, number) written inside Arabic text. */
/** A calculation (numbers joined by operators or "=") inside a sentence. */
const CALC_SPAN = /\(?\d[\d.,]*\)?(?:\s*[=×÷+*/−-]\s*\(?\s*\d[\d.,]*\s*\)?)+/g;

type TextPart =
  | { kind: 'text'; text: string }
  | { kind: 'math'; plain: string; latex: string };

/** Arabic text with its calculations cut out as math (empty text parts dropped). */
export function splitCalculations(text: string): TextPart[] {
  const out: TextPart[] = [];
  let at = 0;
  for (const m of text.matchAll(CALC_SPAN)) {
    const span = m[0].trim();
    const before = text.slice(at, m.index);
    if (before.trim() !== '') {
      out.push({ kind: 'text', text: before.trim() });
    }
    const calc = span.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    out.push({
      kind: 'math',
      plain: calc,
      latex: lineLatex(calc.replace(/,/g, '.')),
    });
    at = m.index + m[0].length;
  }
  const rest = text.slice(at);
  if (rest.trim() !== '' && /[^\s.،,:؟?!]/.test(rest)) {
    out.push({ kind: 'text', text: rest.trim() });
  } else if (rest.trim() !== '' && out.length > 0) {
    // Trailing punctuation joins the text before it.
    const last = out[out.length - 1]!;
    if (last.kind === 'text') {
      last.text += rest.trim();
    }
  }
  return out.length > 0 ? out : [{ kind: 'text', text }];
}
/** Reveal is allowed after this many engine-checked attempts on a node. */
export const REVEAL_AFTER = 3;

const isSmall = (v: Fraction): boolean => v[1] === 1 && Math.abs(v[0]) <= 10;

/** Numbers of a math block (plain reading when possible, else the raw text). */
function mathNumbers(latex: string): Fraction[] {
  const p = latexToPlain(latex.replace(/\\neq|\\ne\b/g, '#'));
  return numbersIn(p ?? latex);
}

/** A math block "a = b" whose sides the engine can evaluate and that disagree. */
function falseEquality(latex: string): string | null {
  if (/\\neq|\\ne\b|≠|\\approx|≈/.test(latex)) {
    return null;
  }
  const p = latexToPlain(latex);
  if (p === null || !p.includes('=')) {
    return null;
  }
  const r = readLine(p);
  return r.chain.kind === 'chain' && !r.chain.equal ? latex : null;
}

interface Context {
  rt: SessionRuntime;
  pack: QuestionPack;
  experiment: Experiment | null;
}

/** Values of the question's own graph he has not earned (and may not see yet). */
function forbiddenValues(c: Context): { node: string; value: Fraction }[] {
  const main = c.rt.graphs.get('main');
  if (!main) {
    return [];
  }
  const s = c.rt.state;
  const earned = new Set<string>();
  const written: Fraction[] = [];
  for (const l of s.lines) {
    if (l.graph === 'main' && l.match && 'node' in l.match) {
      if (l.match.verdict === 'credit' || l.match.verdict === 'support') {
        earned.add(l.match.node);
      }
    }
    // His own numbers: every number he wrote in the line and each side's value.
    const chain = readLine(l.raw).chain;
    if (chain.kind !== 'unreadable') {
      for (const side of chain.kind === 'chain' ? chain.sides : [chain.side]) {
        written.push(side.value);
        for (const n of leaves(side.ast)) {
          if (Number.isInteger(Number(n))) {
            written.push(frac(Number(n)));
          }
        }
      }
    }
  }
  for (const n of s.credited.main ?? []) {
    earned.add(n);
  }
  const attempts = (node: string) =>
    s.lines.filter(
      l =>
        l.graph === 'main' &&
        (l.expected === node ||
          (l.match !== null && 'node' in l.match && l.match.node === node)),
    ).length;
  const given = new Set(c.pack.given);
  return main.graph.nodes
    .filter(n => !earned.has(n.id))
    .filter(n => !isSmall(n.value))
    .filter(n => !given.has(plain(n.value)))
    .filter(n => !written.some(w => sameRat(w, n.value)))
    .filter(n => attempts(n.id) < REVEAL_AFTER)
    .map(n => ({ node: n.id, value: n.value }));
}

function notationOpen(c: Context): boolean {
  const gate = c.pack.notes?.notationAfter;
  if (!gate) {
    return true;
  }
  return Object.values(c.rt.state.credited).some(nodes => nodes.includes(gate));
}

function checkNumbers(
  where: string,
  values: Fraction[],
  allowed: (v: Fraction) => boolean,
  forbidden: { node: string; value: Fraction }[],
  reasons: string[],
): void {
  for (const v of values) {
    const leak = forbidden.find(f => sameRat(f.value, v));
    if (leak) {
      reasons.push(
        `${where}: ${plain(v)} is the value of "${
          leak.node
        }", which he has not found yet. Let him find it.`,
      );
    } else if (!isSmall(v) && !allowed(v)) {
      reasons.push(
        `${where}: ${plain(
          v,
        )} is not from the statement, his lines or an engine result. Compute it with a tool first, or leave it out.`,
      );
    }
  }
}

export function verifyAsk(ask: AskStudent, c: Context): VerifyResult {
  const reasons: string[] = [];
  const s = c.rt.state;
  const known = new Set([...s.known, ...c.pack.given]);
  const allowed = (v: Fraction) => known.has(plain(v));
  const forbidden = forbiddenValues(c);
  const notation = notationOpen(c);
  const blocks: RenderBlock[] = [];
  let questions = 0;
  let arChars = 0;

  ask.message.forEach((b, i) => {
    const where = `block ${i + 1}`;
    switch (b.type) {
      case 'ar': {
        arChars += b.text.length;
        if (REPEAT.test(b.text)) {
          reasons.push(`${where}: a character repeated many times`);
          break;
        }
        if (!notation && NOTATION_TEXT.test(b.text)) {
          reasons.push(
            `${where}: the C(n,k) notation comes only after he computed the count himself`,
          );
        }
        questions += (b.text.match(QUESTION) ?? []).length;
        checkNumbers(where, numbersIn(b.text), allowed, forbidden, reasons);
        // A calculation written inside the sentence ("20+36+4 = 60") becomes
        // its own left-to-right math block; the Arabic around it stays.
        for (const part of splitCalculations(b.text)) {
          if (part.kind === 'math') {
            const wrong = falseEquality(part.plain);
            if (wrong) {
              reasons.push(
                `${where}: "${part.plain}" is false. Check it with evaluate.`,
              );
            }
            blocks.push({ type: 'math', latex: part.latex });
            continue;
          }
          const runs = isolateLlmRuns([{ ar: part.text }]);
          if (!runs) {
            reasons.push(
              `${where}: LaTeX, a bidi control or a long formula inside Arabic text. Put the formula in its own math block.`,
            );
            break;
          }
          blocks.push({ type: 'ar', runs });
        }
        break;
      }
      case 'fr': {
        questions += (b.text.match(QUESTION) ?? []).length;
        checkNumbers(where, numbersIn(b.text), allowed, forbidden, reasons);
        blocks.push({ type: 'fr', text: b.text });
        break;
      }
      case 'math': {
        if (ARABIC.test(b.latex)) {
          reasons.push(`${where}: Arabic text inside a math block`);
          break;
        }
        try {
          parseLatexSubset(b.latex);
        } catch {
          reasons.push(
            `${where}: the formula does not parse; use plain LaTeX (\\frac, \\times, ^, _, \\binom)`,
          );
          break;
        }
        if (!notation && NOTATION_LATEX.test(b.latex)) {
          reasons.push(
            `${where}: the C(n,k) notation comes only after he computed the count himself`,
          );
        }
        const wrong = falseEquality(b.latex);
        if (wrong) {
          reasons.push(
            `${where}: "${wrong}" is false. Check it with evaluate, or show his own line with a student_line block.`,
          );
        }
        checkNumbers(where, mathNumbers(b.latex), allowed, forbidden, reasons);
        blocks.push({ type: 'math', latex: b.latex });
        break;
      }
      case 'student_line': {
        const l = s.lines.find(x => x.id === b.line_id);
        if (!l) {
          reasons.push(`${where}: no line ${b.line_id}`);
          break;
        }
        blocks.push({ type: 'student_line', lineId: l.id, raw: l.raw });
        break;
      }
      case 'compare': {
        const [a, d] = b.line_ids.map(id => s.lines.find(x => x.id === id));
        if (!a || !d) {
          reasons.push(`${where}: unknown line id`);
          break;
        }
        blocks.push({
          type: 'compare',
          lines: [
            { id: a.id, raw: a.raw },
            { id: d.id, raw: d.raw },
          ],
        });
        break;
      }
    }
  });

  if (questions > 1) {
    reasons.push(
      `${questions} questions in one message: ask one thing; the next comes after his answer`,
    );
  }
  if (arChars > 700) {
    reasons.push('the message is too long for a phone: keep it short');
  }

  const input = ask.input;
  if (input.kind === 'choice') {
    input.options.forEach((o, i) =>
      checkNumbers(
        `option ${i + 1}`,
        numbersIn(o.text),
        allowed,
        forbidden,
        reasons,
      ),
    );
  }
  if (input.kind === 'line' && input.expect?.kind === 'node') {
    const g = input.expect.graph;
    if (!c.rt.graphs.has(g) && s.cases[g] === undefined) {
      reasons.push(`expect: unknown graph ${g}`);
    }
  }
  if (input.kind === 'list') {
    const spec = s.cases[input.case_id];
    const groups =
      spec?.kind === 'box'
        ? boxValues(spec.n, input.size).groups
        : spec?.kind === 'urn'
        ? boxValues(spec.reds + spec.blacks, input.size).groups
        : undefined;
    if (!groups) {
      reasons.push(`list: unknown case ${input.case_id} (make_case first)`);
    } else if (groups[0] > 30) {
      reasons.push(
        `list: ${plain(
          groups,
        )} groups is too many to list by hand; use a smaller case`,
      );
    }
  }
  let component: ShownComponent | null = null;
  if (input.kind === 'component') {
    let props: unknown;
    try {
      props = JSON.parse(input.props_json);
    } catch {
      reasons.push('component: props_json is not JSON');
    }
    const spec = input.case_id === null ? null : s.cases[input.case_id];
    if (input.case_id !== null && !spec) {
      reasons.push(
        `component: unknown case ${input.case_id} (make_case first)`,
      );
    }
    const experiment = spec ? caseExperiment(spec) : c.experiment;
    if (props !== undefined && (input.case_id === null || spec)) {
      const r = resolveSpec(
        { component: input.name as ComponentName, props: props as never },
        experiment ?? undefined,
      );
      if (!r.ok) {
        reasons.push(
          `component: ${r.reason} (${r.detail.slice(
            0,
            300,
          )}). Check the props against the catalogue.`,
        );
      } else {
        // Values of a small case are his to find there, but the question's
        // own unearned values must not appear in the picture.
        const rule = revealedByRules(
          REGISTRY[r.name]?.reveals,
          r.props as Record<string, unknown>,
          experiment ?? undefined,
          v => forbidden.some(f => sameRat(f.value, v)),
        );
        if (rule) {
          reasons.push(
            `component: ${r.name} with these props would show a value of this question he has not found yet; use a small case (make_case + case_id) or other props`,
          );
        } else {
          component = {
            name: r.name,
            props: r.props as Record<string, unknown>,
            experiment,
            caseId: input.case_id,
          };
        }
      }
    }
  }

  return reasons.length > 0
    ? { ok: false, reasons }
    : { ok: true, blocks, component };
}
