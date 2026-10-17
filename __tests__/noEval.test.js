// CLAUDE.md hard rule 2: no eval / new Function anywhere in app code.
const fs = require('node:fs');
const path = require('node:path');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.(ts|tsx|js)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [full]
      : [];
  });
}

test('src contains no eval or Function constructor', () => {
  const root = path.resolve(__dirname, '..', 'src');
  const forbidden = /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/;
  // Comments may name the rule; code may not use it.
  const code = f =>
    fs
      .readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const offenders = sourceFiles(root).filter(f => forbidden.test(code(f)));
  expect(offenders).toEqual([]);
});
