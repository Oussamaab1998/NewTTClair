// Plain JS so app code does not get Node typings.
const fs = require('node:fs');
const path = require('node:path');

// Metro resolves an extensionless import by trying .json before .ts, Jest the
// other way round. Two files with the same base name (skills.ts + skills.json)
// then load different modules in the app and in tests: forbid it.
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? files(full)
      : /\.(ts|tsx|js|jsx|json)$/.test(entry.name)
      ? [full]
      : [];
  });
}

test('no two modules share a base name in one folder (Metro vs Jest resolution)', () => {
  const root = path.resolve(__dirname, '..');
  const seen = new Map();
  const clashes = [];
  for (const dir of ['src', 'tools']) {
    for (const f of files(path.join(root, dir))) {
      const base = f.replace(/\.(ios|android)?\.?(ts|tsx|js|jsx|json)$/, '');
      if (seen.has(base)) {
        clashes.push(`${path.relative(root, seen.get(base))} / ${path.relative(root, f)}`);
      } else {
        seen.set(base, f);
      }
    }
  }
  expect(clashes).toEqual([]);
});
