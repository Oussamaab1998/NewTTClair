/**
 * Safe parser for student math input: whitelist tokenizer + recursive descent.
 * Never evaluates code (no eval / new Function). See README.md for the grammar and limits.
 */

export const FUNCTIONS = [
  'sqrt',
  'exp',
  'abs',
  'sin',
  'cos',
  'tan',
  'ln',
] as const;
export type FnName = (typeof FUNCTIONS)[number];

/** `i` is reserved for the complex module (not enabled yet). */
export const CONSTANTS = ['pi', 'e'] as const;
export type ConstName = (typeof CONSTANTS)[number];

export type BinaryOp = '+' | '-' | '*' | '/' | '^';

export type Node =
  | {
      type: 'num';
      value: number;
      /** Normalized decimal text, e.g. "0.7". */
      text: string;
    }
  | { type: 'const'; name: ConstName }
  | { type: 'var'; name: string }
  | { type: 'unary'; op: '-' | '+'; arg: Node }
  | { type: 'binary'; op: BinaryOp; left: Node; right: Node; implicit?: true }
  | { type: 'call'; fn: FnName; arg: Node };

export type ParseErrorCode =
  | 'empty'
  | 'too_long'
  | 'too_deep'
  | 'invalid_char'
  | 'unknown_identifier'
  | 'function_needs_parens'
  | 'missing_operand'
  | 'unbalanced_paren'
  | 'unexpected_token';

export interface ParseError {
  code: ParseErrorCode;
  /** Character index in the input. */
  index: number;
}

export type ParseResult =
  | { ok: true; ast: Node; variables: string[] }
  | { ok: false; error: ParseError };

export interface ParseOptions {
  /** Single-letter variable names allowed in this question. Default ['x']. */
  variables?: readonly string[];
  constants?: readonly ConstName[];
  maxLength?: number;
  maxDepth?: number;
}

type Token =
  | { kind: 'num'; text: string; index: number }
  | { kind: 'op'; op: BinaryOp; index: number }
  | { kind: 'lparen' | 'rparen'; index: number }
  | { kind: 'const'; name: ConstName; index: number }
  | { kind: 'var'; name: string; index: number }
  | { kind: 'fn'; fn: FnName; index: number };

class Fail extends Error {
  constructor(readonly error: ParseError) {
    super(error.code);
  }
}
const fail = (code: ParseErrorCode, index: number): never => {
  throw new Fail({ code, index });
};

// Typographic operators students may paste or type.
const OP_ALIASES: Record<string, BinaryOp> = {
  '+': '+',
  '-': '-',
  '−': '-', // minus sign
  '*': '*',
  '×': '*', // multiplication sign
  '·': '*', // middle dot
  '⋅': '*', // dot operator
  '/': '/',
  '÷': '/', // division sign
  '^': '^',
};
const PI_CHAR = 'π';
const WHITESPACE = /[ \t  ]/;
const DIGIT = /[0-9]/;
const LETTER = /[A-Za-z]/;

function tokenize(input: string, opts: Required<ParseOptions>): Token[] {
  const tokens: Token[] = [];
  // Longest names first so "exp" wins over "e" + "x" + "p".
  const words: { word: string; make: (index: number) => Token }[] = [
    ...FUNCTIONS.map(fn => ({
      word: fn,
      make: (index: number): Token => ({ kind: 'fn', fn, index }),
    })),
    ...opts.constants.map(name => ({
      word: name,
      make: (index: number): Token => ({ kind: 'const', name, index }),
    })),
    ...opts.variables.map(name => ({
      word: name,
      make: (index: number): Token => ({ kind: 'var', name, index }),
    })),
  ].sort((a, b) => b.word.length - a.word.length);

  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (WHITESPACE.test(ch)) {
      i++;
    } else if (DIGIT.test(ch)) {
      const m = /^[0-9]+(?:[.,][0-9]+)?/.exec(input.slice(i))!;
      if (/^[.,]/.test(input.slice(i + m[0].length))) {
        fail('invalid_char', i + m[0].length);
      }
      tokens.push({ kind: 'num', text: m[0].replace(',', '.'), index: i });
      i += m[0].length;
    } else if (Object.hasOwn(OP_ALIASES, ch)) {
      tokens.push({ kind: 'op', op: OP_ALIASES[ch]!, index: i });
      i++;
    } else if (ch === '(' || ch === ')') {
      tokens.push({ kind: ch === '(' ? 'lparen' : 'rparen', index: i });
      i++;
    } else if (ch === PI_CHAR && opts.constants.includes('pi')) {
      tokens.push({ kind: 'const', name: 'pi', index: i });
      i++;
    } else if (LETTER.test(ch)) {
      // Split a run of letters into known names ("2ex" -> e, x); anything else is rejected.
      const start = i;
      const run = /^[A-Za-z]+/.exec(input.slice(i))![0];
      let j = 0;
      while (j < run.length) {
        const hit = words.find(w => run.startsWith(w.word, j));
        if (!hit) {
          fail('unknown_identifier', start);
        }
        tokens.push(hit!.make(start + j));
        j += hit!.word.length;
      }
      i += run.length;
    } else {
      fail('invalid_char', i);
    }
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private depth = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly inputLength: number,
    private readonly maxDepth: number,
  ) {}

  parse(): Node {
    const node = this.expr();
    const extra = this.peek();
    if (extra) {
      fail(
        extra.kind === 'rparen' ? 'unbalanced_paren' : 'unexpected_token',
        extra.index,
      );
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private here(): number {
    return this.peek()?.index ?? this.inputLength;
  }
  private enter(): void {
    if (++this.depth > this.maxDepth) {
      fail('too_deep', this.here());
    }
  }
  private isOp(op: BinaryOp | BinaryOp[]): boolean {
    const t = this.peek();
    return (
      t?.kind === 'op' && (Array.isArray(op) ? op.includes(t.op) : t.op === op)
    );
  }

  private expr(): Node {
    this.enter();
    let left = this.term();
    while (this.isOp(['+', '-'])) {
      const op = (this.tokens[this.pos++] as { op: BinaryOp }).op;
      left = { type: 'binary', op, left, right: this.term() };
    }
    this.depth--;
    return left;
  }

  private term(): Node {
    let left = this.unary();
    for (;;) {
      if (this.isOp(['*', '/'])) {
        const op = (this.tokens[this.pos++] as { op: BinaryOp }).op;
        left = { type: 'binary', op, left, right: this.unary() };
        continue;
      }
      const next = this.peek();
      if (
        next &&
        (next.kind === 'lparen' ||
          next.kind === 'const' ||
          next.kind === 'var' ||
          next.kind === 'fn')
      ) {
        left = {
          type: 'binary',
          op: '*',
          left,
          right: this.power(),
          implicit: true,
        };
        continue;
      }
      if (next?.kind === 'num') {
        // "2 3" or "x2": almost always a typo, never guess.
        fail('unexpected_token', next.index);
      }
      return left;
    }
  }

  private unary(): Node {
    if (this.isOp(['-', '+'])) {
      this.enter();
      const op = (this.tokens[this.pos++] as { op: '-' | '+' }).op;
      const node: Node = { type: 'unary', op, arg: this.unary() };
      this.depth--;
      return node;
    }
    return this.power();
  }

  private power(): Node {
    const base = this.primary();
    if (!this.isOp('^')) {
      return base;
    }
    this.pos++;
    return { type: 'binary', op: '^', left: base, right: this.exponent() };
  }

  /** Exponent: optional signs, then a right-associative power ("e^-x", "2^3^2"). */
  private exponent(): Node {
    if (this.isOp(['-', '+'])) {
      this.enter();
      const op = (this.tokens[this.pos++] as { op: '-' | '+' }).op;
      const node: Node = { type: 'unary', op, arg: this.exponent() };
      this.depth--;
      return node;
    }
    return this.power();
  }

  private primary(): Node {
    const t = this.peek();
    if (!t || t.kind === 'op' || t.kind === 'rparen') {
      return fail('missing_operand', this.here());
    }
    this.pos++;
    switch (t.kind) {
      case 'num':
        return { type: 'num', value: Number(t.text), text: t.text };
      case 'const':
        return { type: 'const', name: t.name };
      case 'var':
        return { type: 'var', name: t.name };
      case 'fn': {
        if (this.peek()?.kind !== 'lparen') {
          fail('function_needs_parens', t.index);
        }
        this.pos++;
        return { type: 'call', fn: t.fn, arg: this.group(t.index) };
      }
      case 'lparen':
        return this.group(t.index);
    }
  }

  /** Inside "( ... )", after the opening paren. */
  private group(openIndex: number): Node {
    const inner = this.expr();
    if (this.peek()?.kind !== 'rparen') {
      fail('unbalanced_paren', openIndex);
    }
    this.pos++;
    return inner;
  }
}

function collectVariables(node: Node, out: Set<string>): Set<string> {
  switch (node.type) {
    case 'var':
      out.add(node.name);
      break;
    case 'unary':
    case 'call':
      collectVariables(node.arg, out);
      break;
    case 'binary':
      collectVariables(node.left, out);
      collectVariables(node.right, out);
      break;
  }
  return out;
}

export function parseExpression(
  input: string,
  options: ParseOptions = {},
): ParseResult {
  const opts: Required<ParseOptions> = {
    variables: options.variables ?? ['x'],
    constants: options.constants ?? CONSTANTS,
    maxLength: options.maxLength ?? 200,
    maxDepth: options.maxDepth ?? 50,
  };
  for (const v of opts.variables) {
    if (
      !/^[A-Za-z]$/.test(v) ||
      (CONSTANTS as readonly string[]).includes(v) ||
      v === 'i'
    ) {
      throw new Error(`invalid variable name: ${v}`);
    }
  }
  try {
    if (input.length > opts.maxLength) {
      fail('too_long', opts.maxLength);
    }
    const tokens = tokenize(input, opts);
    if (tokens.length === 0) {
      fail('empty', 0);
    }
    const ast = new Parser(tokens, input.length, opts.maxDepth).parse();
    return {
      ok: true,
      ast,
      variables: [...collectVariables(ast, new Set())].sort(),
    };
  } catch (e) {
    if (e instanceof Fail) {
      return { ok: false, error: e.error };
    }
    throw e;
  }
}

/** Fully parenthesized form, for tests and debugging. */
export function toString(node: Node): string {
  switch (node.type) {
    case 'num':
      return node.text;
    case 'const':
    case 'var':
      return node.name;
    case 'unary':
      return `(${node.op}${toString(node.arg)})`;
    case 'binary':
      return `(${toString(node.left)} ${node.op} ${toString(node.right)})`;
    case 'call':
      return `${node.fn}(${toString(node.arg)})`;
  }
}
