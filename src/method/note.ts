/**
 * The generated lines of a method lesson, as DATA. The reducer is pure and
 * hardcodes no Arabic: it puts a `MethodNote` on a feedback item and the
 * view composes the sentence with i18n and the cards' own `short` runs
 * (addendum E, 22 and 23). A note holds no number except the student's own
 * credited line, as he typed it.
 */
import type { Rich } from '../content/schema';

export type NeutralCode =
  | 'unfinished'
  | 'mismatch'
  | 'repeat'
  | 'other_step'
  | 'generic'
  | 'ambiguous'
  | 'not_order_word';

export type MethodNote =
  /** After the plan is ordered: "‹card› comes after ‹cards›, because it uses their results". */
  | { kind: 'reason_order'; clauses: { card: Rich; needs: Rich[] }[] }
  /** After a credited plan card: what he found and what is next. */
  | { kind: 'recap'; found: Rich; next: Rich | null; line?: string }
  /** A right line, credited by name (a supporting step is named, not credited as the answer). */
  | {
      kind: 'credit';
      nodeId: string;
      support: boolean;
      derivation: 'exact' | 'other' | 'absent';
      unsimplified: boolean;
    }
  /** A card placed before what it uses: the card and what it still needs. */
  | { kind: 'plan_violation'; card: Rich; needs: Rich[] }
  /** One neutral sentence; `line` is the student's own line when it is shown; `check` is the product to compute (multiply back). */
  | { kind: 'neutral'; code: NeutralCode; line?: string; check?: string }
  /** What a claim predicts on the real numbers, against what the engine counts. */
  | {
      kind: 'claim_result';
      rows: {
        label?: string;
        predicted: string;
        actual: string;
        holds: boolean;
      }[];
    }
  /** The help of a list he is building: it never says how many are missing. */
  | { kind: 'list_help'; level: 1 | 2 | 3; ball?: string; group?: string[] }
  /** His recipe beside the clean one (and the method card of the type). */
  | {
      kind: 'recipe';
      mine: Rich[];
      clean: Rich[];
      card?: { type: Rich; steps: Rich[]; checks: Rich[] };
    }
  /** One line of a similar question, after he is done: credited, a slip (by id) or other. */
  | {
      kind: 'review';
      raw: string;
      outcome: 'credit' | 'slip' | 'other';
      nodeId?: string;
      id?: string;
    }
  /** The result differs from what the statement gives: his line and the target, side by side. */
  | { kind: 'target'; line: string; target: Rich };
