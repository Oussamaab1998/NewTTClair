import {
  completeLatex,
  exampleLatex,
  lawLatex,
  ruleLatex,
  trapLatex,
} from './display';
import { ruleById } from './themes';

const quotient = ruleById('deriv.quotient')!;

describe('the LaTeX is drawn from the checked expressions', () => {
  it('draws U as u′ and V as v′', () => {
    expect(lawLatex('Uv-uV')).toBe("u'v-uv'");
  });

  it('the quotient rule', () => {
    expect(ruleLatex(quotient)).toBe(
      "\\left(\\frac{u}{v}\\right)'=\\frac{u'v-uv'}{v^{2}}",
    );
  });

  it('«Complète» shows a ? at the hole', () => {
    expect(completeLatex(quotient)).toBe(
      "\\left(\\frac{u}{v}\\right)'=\\frac{u'v-?}{v^{2}}",
    );
  });

  it('a trap is the same left side with the wrong right side', () => {
    expect(trapLatex(quotient, 'quotient_of_derivatives')).toBe(
      "\\left(\\frac{u}{v}\\right)'=\\frac{u'}{v'}",
    );
    expect(() => trapLatex(quotient, 'nope')).toThrow('no trap nope');
  });

  it('the example', () => {
    expect(exampleLatex(quotient.example)).toEqual({
      f: 'f(x)=\\frac{2x+1}{x-3}',
      d: "f'(x)=\\frac{-7}{\\left(x-3\\right)^{2}}",
    });
  });
});
