/**
 * Evaluation over a pluggable number system, so the same AST can later be
 * evaluated over complex numbers (constant `i`) without changing the parser.
 */
import * as Q from '../rational';
import type { BinaryOp, ConstName, FnName, Node } from './parse';

export interface NumberSystem<T> {
  num(node: Extract<Node, { type: 'num' }>): T;
  constant(name: ConstName): T;
  unary(op: '-' | '+', a: T): T;
  binary(op: BinaryOp, a: T, b: T): T;
  call(fn: FnName, a: T): T;
}

export class MissingVariableError extends Error {
  override name = 'MissingVariableError';
}

export function evaluateWith<T>(
  node: Node,
  sys: NumberSystem<T>,
  scope: Readonly<Record<string, T>>,
): T {
  switch (node.type) {
    case 'num':
      return sys.num(node);
    case 'const':
      return sys.constant(node.name);
    case 'var': {
      if (!Object.hasOwn(scope, node.name)) {
        throw new MissingVariableError(`no value for variable ${node.name}`);
      }
      return scope[node.name]!;
    }
    case 'unary':
      return sys.unary(node.op, evaluateWith(node.arg, sys, scope));
    case 'binary':
      return sys.binary(
        node.op,
        evaluateWith(node.left, sys, scope),
        evaluateWith(node.right, sys, scope),
      );
    case 'call':
      return sys.call(node.fn, evaluateWith(node.arg, sys, scope));
  }
}

/** Real numbers. Outside the domain the result is NaN or ±Infinity, never an exception. */
export const realSystem: NumberSystem<number> = {
  num: n => n.value,
  constant: name => (name === 'pi' ? Math.PI : Math.E),
  unary: (op, a) => (op === '-' ? -a : a),
  binary: (op, a, b) => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      case '^':
        return Math.pow(a, b);
    }
  },
  call: (fn, a) => {
    switch (fn) {
      case 'sqrt':
        return Math.sqrt(a);
      case 'exp':
        return Math.exp(a);
      case 'abs':
        return Math.abs(a);
      case 'sin':
        return Math.sin(a);
      case 'cos':
        return Math.cos(a);
      case 'tan':
        return Math.tan(a);
      case 'ln':
        return a > 0 ? Math.log(a) : NaN;
    }
  },
};

export function evaluateReal(
  node: Node,
  scope: Readonly<Record<string, number>> = {},
): number {
  return evaluateWith(node, realSystem, scope);
}

/** Exact rationals; `null` when the value is not a known rational (sqrt, e, 1/0, ...). */
const rationalSystem: NumberSystem<Q.Fraction | null> = {
  num: n => {
    const [int, dec = ''] = n.text.split('.');
    return Q.frac(Number(int + dec), 10 ** dec.length);
  },
  constant: () => null,
  unary: (op, a) => (a && op === '-' ? Q.neg(a) : a),
  binary: (op, a, b) => {
    if (!a || !b) {
      return null;
    }
    switch (op) {
      case '+':
        return Q.add(a, b);
      case '-':
        return Q.sub(a, b);
      case '*':
        return Q.mul(a, b);
      case '/':
        return b[0] === 0 ? null : Q.div(a, b);
      case '^':
        return b[1] === 1 && !(a[0] === 0 && b[0] <= 0) && Math.abs(b[0]) <= 64
          ? Q.pow(a, b[0])
          : null;
    }
  },
  call: () => null,
};

/** Exact value of a constant expression ("1 - 3/10" -> [7, 10]); null if not rational or too large. */
export function evaluateExact(node: Node): Q.Fraction | null {
  try {
    return evaluateWith(node, rationalSystem, {});
  } catch (e) {
    if (e instanceof Q.EngineError || e instanceof MissingVariableError) {
      return null;
    }
    throw e;
  }
}
