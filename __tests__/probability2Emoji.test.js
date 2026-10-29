// Plain JS so app code does not get Node typings.
// iOS draws some symbols as colour emoji (a blue "play button" for U+25B6)
// unless they are followed by U+FE0E. Such a symbol looks tappable and ignores
// the theme (stop 2 screenshot review, 2026-10-27). The new components use
// plain arrows, ticks and chevrons; this keeps an emoji-by-default symbol out
// of src/components/probability2 unless it asks for the text form.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(__dirname, '..', 'src/components/probability2');
// default-emoji-presentation symbols that are easy to type by accident (a literal or a \u escape)
const EMOJI = [
  '25b6', '25c0', '23e9', '23ea', '23eb', '23ec', '23f0', '23f3', '2614', '2615',
  '267f', '2693', '26a1', '26aa', '26ab', '26bd', '26be', '2705', '270a', '270b',
  '2728', '274c', '274e', '2753', '2754', '2755', '2757', '2795', '2796', '2797',
  '27b0', '27bf', '2b1b', '2b1c', '2b50', '2b55',
];
const asEscape = hex => new RegExp(`\\\\u${hex}(?!\\\\ufe0e)`, 'i');
const asLiteral = hex =>
  new RegExp(`${String.fromCodePoint(parseInt(hex, 16))}(?!\\ufe0e)`);

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

test('the patterns catch what they should', () => {
  expect(asEscape('25b6').test("const A = '\\u25b6';")).toBe(true);
  expect(asEscape('25b6').test("const A = '\\u25b6\\ufe0e';")).toBe(false);
  expect(asLiteral('25b6').test('go ▶ now')).toBe(true);
  expect(asEscape('25b6').test("const A = '\\u2192';")).toBe(false);
});

test('no component of probability2 uses a symbol that iOS draws as an emoji', () => {
  const found = sourceFiles(DIR).flatMap(file => {
    const text = fs.readFileSync(file, 'utf8');
    return EMOJI.filter(h => asEscape(h).test(text) || asLiteral(h).test(text)).map(
      h => `${path.relative(DIR, file)}: U+${h.toUpperCase()}`,
    );
  });
  expect(found).toEqual([]);
});
