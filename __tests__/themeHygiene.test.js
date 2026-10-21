// Plain JS so app code does not get Node typings.
// Style values live in src/theme only (semantic tokens), so a visual redesign
// is a theme change. This test fails on hard-coded colors and numeric style
// values anywhere else in app code.
// Limit: a number hidden in a named constant (const W = 30) is not detected;
// keep such values in theme.size / theme.chart.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** Typesetting rules of the native math renderer (ratios, glyph spacing), not theme values. */
const ALLOWED_FILES = ['src/lesson/math/NativeMath.tsx'];

const COLOR = /['"`]#[0-9a-fA-F]{3,8}\b|\brgba?\(/;
// A style property set to a number literal other than 0 (quoted numbers too, e.g. fontWeight '600').
const STYLE_NUMBER =
  /\b(?:[a-zA-Z]*Radius|[a-zA-Z]*Width|[a-zA-Z]*Height|width|height|padding[A-Za-z]*|margin[A-Za-z]*|gap|rowGap|columnGap|fontSize|lineHeight|fontWeight|letterSpacing|top|left|right|bottom|opacity|elevation|shadow[A-Za-z]*|translate[XY])\s*:\s*['"]?-?(?!0(?![.\d]))\d(?![\d.]*%)/;
// Numeric size props in JSX, e.g. fontSize={16}.
const JSX_NUMBER = /\b(?:fontSize|width|height|strokeWidth)=\{-?\d/;
// Font faces come from theme.font.family (bundled files, checked by fonts.test.ts);
// styles and named weights from theme.font too. Type annotations stay allowed.
const FONT =
  /\bfontFamily\s*:\s*(?!theme\.|string\b|undefined\b)\S|\bfontStyle\s*:\s*['"`]|\bfontWeight\s*:\s*['"`](?:bold|normal)\b/;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function scan(text) {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  return code
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(
      ({ line }) =>
        COLOR.test(line) ||
        STYLE_NUMBER.test(line) ||
        JSX_NUMBER.test(line) ||
        FONT.test(line),
    );
}

test('the guard patterns catch what they should (and not zero values)', () => {
  const bad = [
    "  color: '#1d1d1f',",
    '  backgroundColor: "rgba(0,0,0,0.3)",',
    '  fontSize: 16,',
    "  fontWeight: '600',",
    '  borderTopLeftRadius: 4,',
    '  paddingHorizontal: 12,',
    '  minHeight: 44,',
    '  top: -2,',
    '  opacity: 0.4,',
    '  transform: [{ translateY: -6 }],',
    '<MathBlock latex="x" fontSize={16} />',
    "  fontFamily: 'Tajawal-Regular',",
    "  fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),",
    '  fontFamily: MATH_FONT,',
    "  fontStyle: 'italic',",
    "  fontWeight: 'bold',",
  ];
  const ok = [
    '  top: 0,',
    '  marginBottom: node.sub ? 0 : size,',
    '  fontSize: theme.font.size.body,',
    "  width: '100%',",
    '  const MAX_LENGTH = 20;',
    '  opts: { fontSize: number; color: string },',
    '  fontFamily: theme.font.family.mono,',
    '  fontStyle: theme.font.style.italic,',
    '  opts: { fontFamily: string },',
  ];
  expect(bad.filter(l => scan(l).length === 0)).toEqual([]);
  expect(ok.filter(l => scan(l).length > 0)).toEqual([]);
});

test('no hard-coded colors, fonts or numeric style values outside src/theme', () => {
  const files = [
    ...sourceFiles(path.join(ROOT, 'src')),
    path.join(ROOT, 'App.tsx'),
  ]
    .map(f => path.relative(ROOT, f))
    .filter(
      f =>
        !f.startsWith(`src${path.sep}theme${path.sep}`) &&
        !/\.test\.tsx?$/.test(f) &&
        !/\.generated\.ts$/.test(f) &&
        !ALLOWED_FILES.includes(f.split(path.sep).join('/')),
    );
  const offenders = files.flatMap(f =>
    scan(fs.readFileSync(path.join(ROOT, f), 'utf8')).map(
      ({ line, n }) => `${f}:${n}: ${line.trim()}`,
    ),
  );
  expect(offenders).toEqual([]);
});
