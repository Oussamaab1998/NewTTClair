/**
 * Safe math expressions for student input (CLAUDE.md hard rule 2: no eval).
 * Grammar, guarantees and limits: ./README.md
 */
export { parseExpression, toString, FUNCTIONS, CONSTANTS } from './parse';
export type {
  Node,
  ParseError,
  ParseErrorCode,
  ParseOptions,
  ParseResult,
  FnName,
  ConstName,
} from './parse';
export {
  evaluateReal,
  evaluateExact,
  evaluateWith,
  realSystem,
} from './evaluate';
export type { NumberSystem } from './evaluate';
export { checkEquivalence } from './equivalence';
export type { EquivalenceOptions, EquivalenceResult } from './equivalence';
export {
  toLatex,
  splitFraction,
  locateDifference,
  missingParentheses,
  valueAt,
  canonical,
  sameForm,
  precedence,
} from './structure';
export type { Difference } from './structure';
