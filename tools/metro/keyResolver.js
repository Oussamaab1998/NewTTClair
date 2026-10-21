const path = require('node:path');

const KEY_MODULE = /(^|\/)llmLocal\.generated(\.ts)?$/;
const BLANK_KEY_MODULE = path.join(
  __dirname,
  '..',
  '..',
  'src/config/llmLocal.stub.ts',
);
let warned = false;

/**
 * Release (non-dev) bundles never contain the LLM key (docs/DECISIONS.md D21):
 * the generated key module resolves to the blank stub. INCLUDE_KEY_IN_RELEASE=1
 * opts an internal test build in, with a loud warning; rotate the key after
 * distributing such a build.
 */
function resolveKeyModule(context, moduleName, platform) {
  if (!context.dev && KEY_MODULE.test(moduleName)) {
    if (process.env.INCLUDE_KEY_IN_RELEASE === '1') {
      if (!warned) {
        warned = true;
        process.stderr.write(
          [
            '',
            '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            '!! INCLUDE_KEY_IN_RELEASE=1: this RELEASE bundle CONTAINS THE LLM KEY.',
            '!! Anyone with the app binary can extract it. Internal test builds',
            '!! only; ROTATE THE KEY after distributing this build (DECISIONS D21).',
            '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
            '',
          ].join('\n'),
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    }
    return { type: 'sourceFile', filePath: BLANK_KEY_MODULE };
  }
  return context.resolveRequest(context, moduleName, platform);
}

module.exports = { resolveKeyModule, KEY_MODULE, BLANK_KEY_MODULE };
