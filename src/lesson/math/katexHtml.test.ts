import { MATH_SAMPLES } from '../../app/screens/bidiTestFixtures';
import { renderKatexDocument } from './katexHtml';

describe('renderKatexDocument', () => {
  it('renders every sample in strict mode', () => {
    for (const latex of MATH_SAMPLES) {
      const html = renderKatexDocument(latex, { fontSize: 20, color: '#000' });
      expect(html).toContain('class="katex-display"');
    }
  });

  it('throws on invalid LaTeX so the caller can fall back', () => {
    expect(() =>
      renderKatexDocument('\\frac{1}', { fontSize: 20, color: '#000' }),
    ).toThrow();
  });

  it('never emits links for \\href (trust: false)', () => {
    const html = renderKatexDocument('\\href{https://example.com}{x}', {
      fontSize: 20,
      color: '#000',
    });
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
  });
});
