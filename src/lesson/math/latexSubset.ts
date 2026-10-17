/**
 * Parser for the small LaTeX subset used in bac Maths content, for the native
 * (no WebView) math renderer. Unsupported input throws LatexSubsetError and the
 * caller falls back (never crash the feed). No eval, no dynamic code.
 */

export type MathNode =
  | { t: 'text'; v: string; italic: boolean }
  | { t: 'row'; children: MathNode[] }
  | { t: 'frac'; num: MathNode; den: MathNode }
  | { t: 'binom'; n: MathNode; k: MathNode }
  | { t: 'sqrt'; body: MathNode }
  | { t: 'overline'; body: MathNode }
  | { t: 'fenced'; open: string; close: string; body: MathNode }
  | { t: 'scripts'; base: MathNode; sup?: MathNode; sub?: MathNode }
  | { t: 'limits'; base: MathNode; over?: MathNode; under?: MathNode };

export class LatexSubsetError extends Error {
  override name = 'LatexSubsetError';
}

type Token =
  | { k: 'cmd'; v: string }
  | { k: 'char'; v: string }
  | { k: 'space' }
  | { k: '{' | '}' | '^' | '_' };

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (c === '\\') {
      const rest = src.slice(i + 1);
      const word = /^[A-Za-z]+/.exec(rest);
      if (word) {
        tokens.push({ k: 'cmd', v: word[0] });
        i += 1 + word[0].length;
      } else if (rest.length > 0) {
        tokens.push({ k: 'cmd', v: rest[0] as string });
        i += 2;
      } else {
        throw new LatexSubsetError('Trailing backslash');
      }
    } else if (c === '{' || c === '}' || c === '^' || c === '_') {
      tokens.push({ k: c });
      i += 1;
    } else if (/\s/.test(c)) {
      tokens.push({ k: 'space' });
      i += 1;
    } else {
      tokens.push({ k: 'char', v: c });
      i += 1;
    }
  }
  return tokens;
}

const SYMBOLS: Record<string, string> = {
  infty: '∞',
  to: '→',
  rightarrow: '→',
  Rightarrow: '⇒',
  Leftrightarrow: '⟺',
  iff: '⟺',
  pi: 'π',
  alpha: 'α',
  beta: 'β',
  lambda: 'λ',
  theta: 'θ',
  zeta: 'ζ',
  cdot: '·',
  times: '×',
  div: '÷',
  pm: '±',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  in: '∈',
  notin: '∉',
  cup: '∪',
  cap: '∩',
  emptyset: '∅',
  ldots: '…',
  dots: '…',
  prime: '′',
  lbrace: '{',
  rbrace: '}',
  '{': '{',
  '}': '}',
  ',': '\u2009',
  ';': ' ',
  ':': ' ',
  '!': '',
  ' ': ' ',
  quad: '\u2003',
  qquad: '\u2003\u2003',
};

const FUNCTIONS = new Set(['ln', 'log', 'exp', 'sin', 'cos', 'tan', 'arctan']);
const LIMIT_OPERATORS: Record<string, string> = {
  lim: 'lim',
  max: 'max',
  min: 'min',
  sum: '∑',
};
const BLACKBOARD: Record<string, string> = {
  R: 'ℝ',
  N: 'ℕ',
  Z: 'ℤ',
  Q: 'ℚ',
  C: 'ℂ',
};
const DELIMITERS: Record<string, string> = {
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '|': '|',
  '.': '',
  '\\{': '{',
  '\\}': '}',
  '\\lbrace': '{',
  '\\rbrace': '}',
};

const RELATIONS = new Set([
  '=',
  '<',
  '>',
  '≤',
  '≥',
  '≠',
  '≈',
  '→',
  '⇒',
  '⟺',
  '∈',
  '∉',
]);
const BINARY = new Set(['+', '−', '×', '·', '±', '÷']);

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parseAll(): MathNode {
    const row = this.parseRow(false);
    if (this.pos < this.tokens.length) {
      throw new LatexSubsetError('Unexpected "}"');
    }
    return row;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private skipSpaces() {
    while (this.peek()?.k === 'space') {
      this.pos += 1;
    }
  }

  private parseRow(inGroup: boolean): MathNode {
    const children: MathNode[] = [];
    for (;;) {
      this.skipSpaces();
      const tok = this.peek();
      if (!tok) {
        if (inGroup) {
          throw new LatexSubsetError('Missing "}"');
        }
        break;
      }
      if (tok.k === '}') {
        if (!inGroup) {
          break;
        }
        this.pos += 1;
        break;
      }
      if (tok.k === 'cmd' && tok.v === 'right') {
        break;
      }
      const atom = this.parseAtom();
      if (atom) {
        children.push(this.parseScripts(atom));
      }
    }
    return { t: 'row', children };
  }

  /** One argument: a braced group or a single atom. */
  private parseArg(): MathNode {
    this.skipSpaces();
    const tok = this.peek();
    if (!tok) {
      throw new LatexSubsetError('Missing argument');
    }
    if (tok.k === '{') {
      this.pos += 1;
      return this.parseRow(true);
    }
    const atom = this.parseAtom();
    if (!atom) {
      throw new LatexSubsetError('Empty argument');
    }
    return atom;
  }

  /** Raw text of a braced group, spaces preserved (for \text{...}). */
  private parseRawText(): string {
    this.skipSpaces();
    if (this.peek()?.k !== '{') {
      throw new LatexSubsetError('Expected "{" after \\text');
    }
    this.pos += 1;
    let out = '';
    for (;;) {
      const tok = this.tokens[this.pos++];
      if (!tok) {
        throw new LatexSubsetError('Missing "}"');
      }
      if (tok.k === '}') {
        return out;
      }
      if (tok.k === 'space') {
        out += ' ';
      } else if (tok.k === 'char') {
        out += tok.v;
      } else {
        throw new LatexSubsetError('Unsupported token in \\text');
      }
    }
  }

  private parseDelimiter(): string {
    const tok = this.tokens[this.pos++];
    const key =
      tok?.k === 'char' ? tok.v : tok?.k === 'cmd' ? `\\${tok.v}` : '';
    const delim = DELIMITERS[key];
    if (delim === undefined) {
      throw new LatexSubsetError(`Unsupported delimiter "${key}"`);
    }
    return delim;
  }

  private parseAtom(): MathNode | null {
    const tok = this.tokens[this.pos++];
    if (!tok) {
      throw new LatexSubsetError('Unexpected end');
    }
    switch (tok.k) {
      case '{':
        return this.parseRow(true);
      case '^':
      case '_':
        throw new LatexSubsetError(`Script "${tok.k}" without base`);
      case '}':
        throw new LatexSubsetError('Unexpected "}"');
      case 'space':
        return null;
      case 'char':
        return charNode(tok.v);
      case 'cmd':
        return this.parseCommand(tok.v);
    }
  }

  private parseCommand(name: string): MathNode {
    switch (name) {
      case 'frac':
      case 'dfrac':
      case 'tfrac':
        return { t: 'frac', num: this.parseArg(), den: this.parseArg() };
      case 'binom':
        return { t: 'binom', n: this.parseArg(), k: this.parseArg() };
      case 'sqrt':
        return { t: 'sqrt', body: this.parseArg() };
      case 'bar':
      case 'overline':
        return { t: 'overline', body: this.parseArg() };
      case 'text':
      case 'textrm':
      case 'mathrm':
      case 'operatorname':
        return { t: 'text', v: this.parseRawText(), italic: false };
      case 'mathbb': {
        const letter = this.parseRawText().trim();
        const symbol = BLACKBOARD[letter];
        if (!symbol) {
          throw new LatexSubsetError(`Unsupported \\mathbb{${letter}}`);
        }
        return { t: 'text', v: symbol, italic: false };
      }
      case 'left': {
        const open = this.parseDelimiter();
        const body = this.parseRow(false);
        const right = this.tokens[this.pos++];
        if (!(right?.k === 'cmd' && right.v === 'right')) {
          throw new LatexSubsetError('\\left without \\right');
        }
        return { t: 'fenced', open, close: this.parseDelimiter(), body };
      }
      case 'int':
        return { t: 'text', v: '∫', italic: false };
    }
    const limitOp = LIMIT_OPERATORS[name];
    if (limitOp) {
      return { t: 'limits', base: { t: 'text', v: limitOp, italic: false } };
    }
    if (FUNCTIONS.has(name)) {
      return { t: 'text', v: name, italic: false };
    }
    const symbol = SYMBOLS[name];
    if (symbol !== undefined) {
      return { t: 'text', v: symbol, italic: false };
    }
    throw new LatexSubsetError(`Unsupported command \\${name}`);
  }

  private parseScripts(base: MathNode): MathNode {
    let sup: MathNode | undefined;
    let sub: MathNode | undefined;
    for (;;) {
      this.skipSpaces();
      const tok = this.peek();
      if (tok?.k === '^' && !sup) {
        this.pos += 1;
        sup = this.parseArg();
      } else if (tok?.k === '_' && !sub) {
        this.pos += 1;
        sub = this.parseArg();
      } else if (tok?.k === '^' || tok?.k === '_') {
        throw new LatexSubsetError('Double script');
      } else {
        break;
      }
    }
    if (!sup && !sub) {
      return base;
    }
    if (base.t === 'limits') {
      return {
        t: 'limits',
        base: base.base,
        ...(sup && { over: sup }),
        ...(sub && { under: sub }),
      };
    }
    return { t: 'scripts', base, ...(sup && { sup }), ...(sub && { sub }) };
  }
}

function charNode(c: string): MathNode {
  if (/[A-Za-z]/.test(c)) {
    return { t: 'text', v: c, italic: true };
  }
  if (c === '-') {
    return { t: 'text', v: '−', italic: false };
  }
  if (c === "'") {
    return { t: 'text', v: '′', italic: false };
  }
  return { t: 'text', v: c, italic: false };
}

/** Adds spacing around relations and binary operators, and merges text runs. */
function normalize(node: MathNode): MathNode {
  switch (node.t) {
    case 'text':
      return node;
    case 'row': {
      const out: MathNode[] = [];
      node.children.map(normalize).forEach((child, i, all) => {
        let next = child;
        if (child.t === 'text') {
          const prev = all[i - 1];
          const unary =
            !prev ||
            (prev.t === 'text' &&
              (RELATIONS.has(prev.v.trim()) || /[([,]$/.test(prev.v)));
          if (RELATIONS.has(child.v)) {
            next = { ...child, v: ` ${child.v} ` };
          } else if (BINARY.has(child.v) && !unary) {
            next = { ...child, v: ` ${child.v} ` };
          }
        }
        const last = out[out.length - 1];
        if (
          next.t === 'text' &&
          last?.t === 'text' &&
          last.italic === next.italic
        ) {
          out[out.length - 1] = { ...last, v: last.v + next.v };
        } else {
          out.push(next);
        }
      });
      return out.length === 1 && out[0] ? out[0] : { t: 'row', children: out };
    }
    case 'frac':
      return { t: 'frac', num: normalize(node.num), den: normalize(node.den) };
    case 'binom':
      return { t: 'binom', n: normalize(node.n), k: normalize(node.k) };
    case 'sqrt':
      return { t: 'sqrt', body: normalize(node.body) };
    case 'overline':
      return { t: 'overline', body: normalize(node.body) };
    case 'fenced':
      return { ...node, body: normalize(node.body) };
    case 'scripts':
      return {
        t: 'scripts',
        base: normalize(node.base),
        ...(node.sup && { sup: normalize(node.sup) }),
        ...(node.sub && { sub: normalize(node.sub) }),
      };
    case 'limits':
      return {
        t: 'limits',
        base: node.base,
        ...(node.over && { over: normalize(node.over) }),
        ...(node.under && { under: normalize(node.under) }),
      };
  }
}

export function parseLatexSubset(src: string): MathNode {
  return normalize(new Parser(tokenize(src)).parseAll());
}
