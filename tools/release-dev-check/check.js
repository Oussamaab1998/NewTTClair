#!/usr/bin/env node
/**
 * Release dev-options check: builds a default Release bundle and fails if it
 * contains the code that reads debug launch arguments (src/app/dev/launch.ts).
 * Every argument name read there (`arg('x')` / `stringArg('x')`) must not
 * appear as a string literal, and `Settings.get` must not appear at all. In
 * Release `__DEV__` is false: screens hold `devOnly = null`, so the
 * `require('../dev')` and the whole dev module are dropped; property names
 * like `devOnly?.devLlmAtLaunch()` may remain but never run.
 * Usage: npm run check:release-dev
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const launch = fs.readFileSync(
  path.join(root, 'src', 'app', 'dev', 'launch.ts'),
  'utf8',
);
const names = [
  ...new Set(
    [...launch.matchAll(/\b(?:arg|stringArg)\('([A-Za-z0-9_]+)'\)/g)].map(
      m => m[1],
    ),
  ),
];
if (names.length < 10) {
  process.stderr.write(
    `release-dev-check: found only ${names.length} argument names in launch.ts; the pattern needs updating\n`,
  );
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-dev-'));
const bundle = path.join(tmp, 'main.jsbundle');
let failed = false;
try {
  const env = { ...process.env };
  delete env.INCLUDE_KEY_IN_RELEASE;
  execFileSync(
    'npx',
    [
      'react-native',
      'bundle',
      '--platform',
      'ios',
      '--dev',
      'false',
      '--minify',
      'true',
      '--entry-file',
      'index.js',
      '--bundle-output',
      bundle,
      '--assets-dest',
      tmp,
    ],
    { cwd: root, env, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const text = fs.readFileSync(bundle, 'utf8');
  const hits = names.filter(
    n => text.includes(`"${n}"`) || text.includes(`'${n}'`),
  );
  if (text.includes('Settings.get')) {
    hits.push('Settings.get');
  }
  if (hits.length > 0) {
    failed = true;
    process.stderr.write(
      `release-dev-check: FAILED: the Release bundle reads debug options: ${hits.join(', ')}\n`,
    );
  } else {
    process.stdout.write(
      `release-dev-check: ok (${names.length} debug launch options, none readable in the Release bundle)\n`,
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
