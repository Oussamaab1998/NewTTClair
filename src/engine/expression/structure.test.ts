import { parseLatexSubset } from '../../lesson/math/latexSubset';
import {
  locateDifference,
  missingParentheses,
  sameForm,
  parseExpression,
  splitFraction,
  toLatex,
  type Node,
} from './index';

function ast(input: string): Node {
  const r = parseExpression(input);
  if (!r.ok) {
    throw new Error(`parse failed for ${input}: ${r.error.code}`);
  }
  return r.ast;
}
const latex = (s: string) => toLatex(ast(s));

describe('toLatex', () => {
  it('writes fractions, powers and implicit products', () => {
    expect(latex('e^x/(1+e^(2x))')).toBe('\\frac{e^{x}}{1+e^{2x}}');
    expect(latex('(1-e^(2x))e^x/(1+e^(2x))^2')).toBe(
      '\\frac{\\left(1-e^{2x}\\right)e^{x}}{\\left(1+e^{2x}\\right)^{2}}',
    );
    expect(latex('e^-x')).toBe('e^{-x}');
    expect(latex('2*3')).toBe('2\\times 3');
  });
  it('keeps the parentheses that change the meaning', () => {
    expect(latex('x-(1+x)')).toBe('x-\\left(1+x\\right)');
    expect(latex('x+(-1)')).toBe('x+\\left(-1\\right)');
    expect(latex('-(x+1)')).toBe('-\\left(x+1\\right)');
    expect(latex('(x+1)^2')).toBe('\\left(x+1\\right)^{2}');
    expect(latex('x-(1-x)')).toBe('x-\\left(1-x\\right)');
  });
  it('writes the French decimal comma, functions and pi', () => {
    expect(latex('0,5x')).toBe('0{,}5x');
    expect(latex('ln(x)+exp(x)+sqrt(x)+abs(x)')).toBe(
      '\\ln\\left(x\\right)+\\exp\\left(x\\right)+\\sqrt{x}+\\left|x\\right|',
    );
    expect(latex('2pi')).toBe('2\\pi ');
  });
  it('output is accepted by the native math renderer', () => {
    for (const s of [
      'e^x/(1+e^(2x))',
      '(1-e^(2x))e^x/(1+e^(2x))^2',
      '1/(e^(-x)+e^x)',
      '0,5x-ln(x)+sqrt(2)+abs(x)+2pi',
    ]) {
      expect(() => parseLatexSubset(latex(s))).not.toThrow();
    }
  });
});

describe('splitFraction', () => {
  it('returns the top-level numerator and denominator', () => {
    const s = splitFraction(ast('e^x/(1+e^(2x))'));
    expect(s && toLatex(s.num)).toBe('e^{x}');
    expect(s && toLatex(s.den)).toBe('1+e^{2x}');
  });
  it('returns null when the top level is not a fraction', () => {
    expect(splitFraction(ast('e^x/2+1'))).toBeNull();
  });
});

describe('locateDifference', () => {
  const target = ast('e^x/(e^(2x)+1)');
  it('names the denominator when only the denominator is wrong', () => {
    const r = locateDifference(ast('e^x/(e^(2x)+2)'), target);
    expect(r.where).toBe('denominator');
    expect(r.at).toBeDefined();
    expect(r.at!.x).toBe(1);
  });
  it('names the numerator when only the numerator is wrong (cancel leaves 0)', () => {
    const r = locateDifference(ast('0/(e^(-x)+e^x)'), ast('1/(e^(-x)+e^x)'));
    expect(r.where).toBe('numerator');
    expect(r.at!.student).toBe(0);
  });
  it('says "whole" when the line is not a fraction', () => {
    expect(locateDifference(ast('e^x'), target).where).toBe('whole');
  });
  it('gives the values at the first disagreeing nice point', () => {
    const r = locateDifference(ast('e^x/(e^(2x)+2)'), target);
    expect(r.at!.student).toBeCloseTo(Math.E / (Math.E ** 2 + 2), 12);
    expect(r.at!.expected).toBeCloseTo(Math.E / (Math.E ** 2 + 1), 12);
  });
});

describe('missingParentheses', () => {
  it('detects a/b+c meant as a/(b+c)', () => {
    expect(
      missingParentheses(ast('e^(-x)/1+e^(-2x)'), ast('e^(-x)/(1+e^(-2x))')),
    ).toBe('denominator');
  });
  it('detects a+b/c meant as (a+b)/c', () => {
    expect(missingParentheses(ast('1+x/2'), ast('(1+x)/2'))).toBe('numerator');
  });
  it('returns null when regrouping does not give the target', () => {
    expect(missingParentheses(ast('1/x+2'), ast('3/(x+5)'))).toBeNull();
    expect(missingParentheses(ast('x+1'), ast('x+1'))).toBeNull();
  });
});

describe('sameForm', () => {
  it('ignores the order of terms and factors and extra parentheses', () => {
    expect(sameForm(ast('e^x/(e^(2x)+1)'), ast('e^x/(1+e^(2x))'))).toBe(true);
    expect(sameForm(ast('((e^(x))/(1+e^(2x)))'), ast('e^x/(1+e^(2x))'))).toBe(
      true,
    );
    expect(sameForm(ast('x*2'), ast('2x'))).toBe(true);
  });
  it('is not equivalence: a different written form is not the same form', () => {
    expect(sameForm(ast('1/(e^(-x)+e^x)'), ast('e^x/(1+e^(2x))'))).toBe(false);
    expect(sameForm(ast('e^(-x)/(1+e^(-2x))'), ast('e^x/(1+e^(2x))'))).toBe(
      false,
    );
  });
});
