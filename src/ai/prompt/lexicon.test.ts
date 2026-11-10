import fs from 'node:fs';
import path from 'node:path';

import { BANNED_DARIJA, bannedIn, bannedSentence } from './lexicon';

const SRC = path.join(__dirname, '..', '..');

/** Every file whose darija a student reads (old fixtures excluded). */
function darijaFiles(): string[] {
  const exercises = path.join(SRC, 'content', 'exercises');
  return [
    path.join(SRC, 'i18n', 'ar-TN.json'),
    ...fs.readdirSync(exercises).map(f => path.join(exercises, f)),
    ...fs
      .readdirSync(path.join(SRC, 'content'))
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SRC, 'content', f)),
    path.join(SRC, 'ai', 'packs', 'notes.ts'),
    path.join(SRC, 'ai', 'prompt', 'workedExample.ts'),
  ];
}

describe('non-Tunisian words', () => {
  it('finds a banned phrase and keeps «ماشي» alone', () => {
    expect(bannedIn('ماشي مشكل').map(b => b.use)).toEqual(['موش مشكل']);
    expect(bannedIn('ماشي مليح')).toEqual([]);
  });

  it('matches a whole-word entry with a prefix, never inside a longer word', () => {
    expect(bannedIn('واش لقيت؟').map(b => b.phrase)).toEqual(['واش']);
    expect(bannedIn('الكور السود').map(b => b.phrase)).toEqual(['سود']);
    expect(bannedIn('كورة سودة').map(b => b.phrase)).toEqual(['سودة']);
    expect(bannedIn('مسودّة ومسودة')).toEqual([]);
    expect(bannedIn('ما يتساوواش')).toEqual([]);
  });

  it('bans «زوج» as the number two, not as a pair', () => {
    expect(bannedIn('ونجبدو زوج كور مع بعض').map(b => b.use)).toEqual(['زوز']);
    expect(bannedIn('الكورة الحمراء مع كل زوج كحل')).toEqual([]);
    expect(bannedIn('كل زوج مرّة وحدة')).toEqual([]);
    expect(bannedIn('خمستاش زوج')).toEqual([]);
  });

  it('puts the whole list in the prompt', () => {
    const sentence = bannedSentence();
    for (const b of BANNED_DARIJA) {
      expect(sentence).toContain(`«${b.phrase}» (say «${b.use}»)`);
    }
  });

  it('appears in no text a student reads', () => {
    const found = darijaFiles().flatMap(file =>
      bannedIn(fs.readFileSync(file, 'utf8')).map(
        b => `${path.relative(SRC, file)}: «${b.phrase}»`,
      ),
    );
    expect(found).toEqual([]);
  });
});
