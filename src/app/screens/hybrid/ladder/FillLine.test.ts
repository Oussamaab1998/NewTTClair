import { filledLine, fillPieces, pieceLatex } from './FillLine';

describe('the line to fill', () => {
  it('cuts the template at its slots and puts the values back in order', () => {
    expect(fillPieces('{}*{}={}')).toEqual(['', '*', '=', '']);
    expect(filledLine('{}*{}={}', ['2/3', '1/4', '1/6'])).toBe('2/3*1/4=1/6');
    expect(filledLine('({})/({})={}', ['1/4', '1/3'])).toBe('(1/4)/(1/3)=');
  });

  it('draws the fixed pieces as maths: × ÷, exponents raised whole', () => {
    expect(pieceLatex('*')).toBe('\\times');
    expect(pieceLatex(')/((1+e^(2x))/')).toBe(') \\div ((1+e^{2x}) \\div');
    expect(pieceLatex('e^(-x)*')).toBe('e^{-x} \\times');
  });
});
