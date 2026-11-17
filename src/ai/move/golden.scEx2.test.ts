/**
 * The urn exercise's AI bytes are pinned: the move prompt, the tool lists
 * and the four question packs of `bac2022c-sc-ex2`, and the old tutor's core
 * prompt. They are the cached prefix of every AI call (a changed byte is a
 * cold call) and the owner's reference lesson, so a second exercise (a
 * probability tree, another domain) must not change one of them. A change
 * made on purpose updates the hash here, in the same commit, with its reason.
 */
import { createHash } from 'crypto';

import { CATALOG } from '../../app/exercises';
import { questionCtx } from '../../hybrid/conductor/conductor';
import { buildCorePrompt } from '../prompt/core';
import { moveTools } from './mover';
import { movePack } from './pack';
import { movePrompt } from './prompt';

const sha = (s: string): string =>
  createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

const entry = CATALOG.find(e => e.id === 'bac2022c-sc-ex2')!;
const loaded = entry.result.ok ? entry.result.loaded : null;
const packText = (q: string): string =>
  movePack(questionCtx(loaded!, entry.raw as never, q)).text;

describe('bac2022c-sc-ex2: the AI bytes do not move', () => {
  it('the move prompt', () => {
    expect(sha(movePrompt())).toBe('8bf69967d97cf7d6');
  });

  it('the tool lists of both tiers', () => {
    expect(sha(JSON.stringify(moveTools(true)))).toBe('e859c1eaba7453b4');
    expect(sha(JSON.stringify(moveTools(false)))).toBe('440f45342b57f273');
  });

  it.each([
    ['1', '89c6e3b52546ec80'],
    ['2', '64488654bae1f721'],
    ['3a', '358d14a6e2107f04'],
    ['3b', '3b113525d1cf4cae'],
  ])('the pack of question %s', (q, hash) => {
    expect(sha(packText(q))).toBe(hash);
  });

  it("the old tutor's core prompt", () => {
    expect(sha(buildCorePrompt())).toBe('85d5c4ed03993513');
  });
});
