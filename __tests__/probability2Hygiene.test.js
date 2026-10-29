// Plain JS so app code does not get Node typings.
// docs/COMPONENTS_PROBABILITY_V2.md hard rules 5 and 7 for the NEW components
// (src/components/probability2), stricter than readingSides.test.js, which
// does not scan src/components: no physical left / right style keys, no bare
// 'row-reverse', no side-meaning alignSelf (use theme.reading and theme.mathSide),
// and no hyphen-minus written for a minus (U+2212 only) in a displayed string.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(__dirname, '..', 'src/components/probability2');

const PHYSICAL =
  /\b(?:left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeft[A-Za-z]*|borderRight[A-Za-z]*)\s*:\s*(?!['"`])\S/;
const ROW_REVERSE = /['"`]row-reverse['"`]/;
const ALIGN_SELF = /\balignSelf\s*:\s*['"`]flex-(?:start|end)['"`]/;
// A "-" glued to a digit or a letter-digit in a template or a string that is displayed: `-${n}`, '-1'.
const HYPHEN_MINUS = /[`'"]-\$\{|[`'"]-\d/;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? sourceFiles(full)
      : /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [full]
      : [];
  });
}

function scan(text, patterns) {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  return code
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => patterns.some(p => p.test(line)));
}

test('the patterns catch what they should', () => {
  const bad = [
    '    left: theme.space.sm,',
    "    flexDirection: 'row-reverse',",
    "    alignSelf: 'flex-end',",
    '    marginRight: theme.space.xs,',
  ];
  const ok = [
    '    flexDirection: theme.mathSide.row,',
    '    flexDirection: theme.reading.row,',
    "    alignSelf: 'center',",
    "    alignItems: 'flex-end',",
    '    borderTopLeftRadius: theme.radius.sheetTop,',
  ];
  const sides = [PHYSICAL, ROW_REVERSE, ALIGN_SELF];
  expect(bad.filter(l => scan(l, sides).length === 0)).toEqual([]);
  expect(ok.filter(l => scan(l, sides).length > 0)).toEqual([]);
  expect(scan("const s = `-${n}`;", [HYPHEN_MINUS])).toHaveLength(1);
  expect(scan("const id = `pick-${n}`;", [HYPHEN_MINUS])).toHaveLength(0);
});

test('the new components name their sides and never write a hyphen as a minus', () => {
  const files = sourceFiles(DIR);
  expect(files.length).toBeGreaterThan(5);
  const found = files.flatMap(f =>
    scan(fs.readFileSync(f, 'utf8'), [
      PHYSICAL,
      ROW_REVERSE,
      ALIGN_SELF,
      HYPHEN_MINUS,
    ]).map(({ n, line }) => `${path.relative(DIR, f)}:${n}: ${line.trim()}`),
  );
  expect(found).toEqual([]);
});
