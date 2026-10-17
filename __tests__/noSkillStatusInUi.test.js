// Plain JS so app code does not get Node typings.
const fs = require('node:fs');
const path = require('node:path');

// Skill statuses ("gap", "closed", ...) are planner hypotheses: never shown to
// or claimed for the student (DECISIONS.md D8). UI files must not read them.
function tsxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? tsxFiles(full)
      : /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)
      ? [full]
      : [];
  });
}

test('no UI component reads derived skill status', () => {
  const root = path.resolve(__dirname, '..');
  const offenders = tsxFiles(path.join(root, 'src')).filter(f =>
    /state\/derive|SkillStatus|deriveState/.test(fs.readFileSync(f, 'utf8')),
  );
  expect(offenders.map(f => path.relative(root, f))).toEqual([]);
});
