// Plain JS so app code does not get Node typings.
// Where a side carries meaning (feed, line editor, app screens), it is named:
// theme.reading (Arabic: starts at the right) or theme.mathSide (LTR math and
// exam lines), from src/theme/sides.ts. This test fails on a physical
// left/right style key, a bare 'row-reverse' or a side-meaning alignSelf in
// those folders. LTR math/data components (src/components) and dev demo
// screens keep physical sides (DESIGN.md §8).
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FOLDERS = ['src/lesson/feed', 'src/lesson/lines', 'src/app/screens'];
/** Dev demo screens (not shipped as UI; physical sides are fine there). */
const DEMO =
  /(BidiTestScreen|AnalysisDemoScreen|LessonUiDemoScreen|ProbabilityDemoScreen|linesDemo|feedDemo)\.tsx?$/;

// A physical side style key set to something other than a string (key labels
// such as `left: '←'` are text, not style).
const PHYSICAL =
  /\b(?:left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeft[A-Za-z]*|borderRight[A-Za-z]*)\s*:\s*(?!['"`])\S/;
const ROW_REVERSE = /['"`]row-reverse['"`]/;
const ALIGN_SELF = /\balignSelf\s*:\s*['"`]flex-(?:start|end)['"`]/;

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
        PHYSICAL.test(line) || ROW_REVERSE.test(line) || ALIGN_SELF.test(line),
    );
}

test('the guard patterns catch what they should', () => {
  const bad = [
    '    left: theme.layout.gutter,',
    '    right: 0,',
    '    marginLeft: theme.space.sm,',
    '    paddingRight: theme.space.sm,',
    '    borderLeftWidth: theme.border.line,',
    "    flexDirection: 'row-reverse',",
    "    alignSelf: 'flex-start',",
  ];
  const ok = [
    '    ...theme.reading.endEdge(theme.layout.gutter),',
    '    flexDirection: theme.reading.row,',
    '    alignSelf: theme.reading.endAlign,',
    "  left: '←',",
    '    borderTopLeftRadius: theme.radius.sheetTop,',
    "    alignItems: 'flex-end',",
  ];
  expect(bad.filter(l => scan(l).length === 0)).toEqual([]);
  expect(ok.filter(l => scan(l).length > 0)).toEqual([]);
});

test('no physical sides where a side carries meaning (use theme.reading / theme.mathSide)', () => {
  const files = FOLDERS.flatMap(d => sourceFiles(path.join(ROOT, d)))
    .map(f => path.relative(ROOT, f))
    .filter(f => !/\.test\.tsx?$/.test(f) && !DEMO.test(f));
  expect(files.length).toBeGreaterThan(0);
  const offenders = files.flatMap(f =>
    scan(fs.readFileSync(path.join(ROOT, f), 'utf8')).map(
      ({ line, n }) => `${f}:${n}: ${line.trim()}`,
    ),
  );
  expect(offenders).toEqual([]);
});
