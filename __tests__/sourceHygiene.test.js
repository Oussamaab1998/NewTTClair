// Plain JS so app code does not get Node typings.
const fs = require('node:fs');
const path = require('node:path');

// Invisible bidi controls and special spaces must be written as \u escapes in
// source, never as literal characters (unreadable in review, "Trojan Source").
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u2009\u2003\uFEFF]/;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.(ts|tsx|js|json)$/.test(entry.name) ? [full] : [];
  });
}

test('source files contain no literal invisible characters', () => {
  const root = path.resolve(__dirname, '..');
  const files = [
    ...sourceFiles(path.join(root, 'src')),
    path.join(root, 'App.tsx'),
  ];
  const offenders = files.filter(f =>
    INVISIBLE.test(fs.readFileSync(f, 'utf8')),
  );
  expect(offenders).toEqual([]);
});
