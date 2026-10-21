#!/usr/bin/env node
/**
 * Release-key check (docs/DECISIONS.md D21): builds a default Release bundle
 * with a SENTINEL key in the generated key module and fails if the bundle
 * contains anything key-shaped. Restores the real generated module after.
 * Usage: npm run check:release-key
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const genPath = path.join(root, 'src', 'config', 'llmLocal.generated.ts');
const SENTINEL = 'sk-proj-RELEASECHECKSENTINEL0123456789abcdef';
const KEY_SHAPED = /sk-[A-Za-z0-9_-]{16,}/g;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-key-'));
const bundle = path.join(tmp, 'main.jsbundle');
let failed = false;
try {
  fs.writeFileSync(
    genPath,
    `export const LLM_LOCAL: { openaiApiKey: string; openaiBaseUrl: string } = {\n  openaiApiKey: '${SENTINEL}',\n  openaiBaseUrl: '',\n};\n`,
  );
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
      '--reset-cache',
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
  const hits = [...text.matchAll(KEY_SHAPED)].length;
  if (text.includes(SENTINEL) || hits > 0) {
    failed = true;
    process.stderr.write(
      `release-key-check: FAILED: the default Release bundle contains ${hits} key-shaped string(s)\n`,
    );
  } else {
    process.stdout.write(
      'release-key-check: ok (no key-shaped string in the default Release bundle)\n',
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  // Restore the real generated module (never printed).
  execFileSync('node', [path.join(root, 'tools', 'llm-config', 'gen.js')], {
    cwd: root,
    stdio: 'inherit',
  });
}
process.exit(failed ? 1 : 0);
