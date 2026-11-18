/**
 * Prepared answers from the exercise's glossary (src/content/help): a long
 * press on a symbol or on the paper's French words that a glossary entry
 * covers is answered at once, free, with no call:
 *   «شنوّة معناها؟»         -> its meaning, then how it is read in French;
 *   «كيفاش نقراها بالفرنسي؟» -> its French reading, then what it means;
 *   «علاش نستعملوها هنا؟»    -> why it is used in this exercise (authored);
 * anything the entry does not hold (no reading, no use, several entries and
 * none picked, his own question) goes to the AI teacher.
 */
import type { GlossaryEntry } from '../../content/help/schema';
import type { Rich } from '../../content/schema';
import type { TeacherBlock } from './types';

/** The long-press menu's four options. */
export type AskKind = 'meaning' | 'reading' | 'use' | 'own';

/** A Rich as the teacher's blocks: its Arabic, its French line, its formula. */
export function richBlocks(r: Rich): TeacherBlock[] {
  const out: TeacherBlock[] = [];
  if (r.ar) {
    out.push({ type: 'ar', runs: r.ar });
  }
  if (r.fr !== undefined) {
    out.push({ type: 'fr', text: r.fr });
  }
  if (r.math !== undefined) {
    out.push({ type: 'math', latex: r.math });
  }
  return out;
}

const readingBlock = (reading: string): TeacherBlock => ({
  type: 'fr',
  text: /^«/.test(reading.trim()) ? reading.trim() : `« ${reading.trim()} »`,
});

/** The entry a request is about: the one he picked, or the only one that matched. */
export function pickEntry(
  entries: readonly GlossaryEntry[],
  entryId: string | null,
): GlossaryEntry | null {
  if (entryId !== null) {
    return entries.find(e => e.id === entryId) ?? null;
  }
  return entries.length === 1 ? entries[0]! : null;
}

/** The prepared answer of an entry for a menu option; null: the AI answers. */
export function glossaryAnswer(
  entry: GlossaryEntry,
  kind: AskKind,
): TeacherBlock[] | null {
  switch (kind) {
    case 'meaning':
      return [
        ...entry.meaning.flatMap(richBlocks),
        ...(entry.reading !== undefined ? [readingBlock(entry.reading)] : []),
      ];
    case 'reading':
      return entry.reading === undefined
        ? null
        : [
            readingBlock(entry.reading),
            ...(entry.meaning[0] ? richBlocks(entry.meaning[0]) : []),
          ];
    case 'use':
      return entry.use ? entry.use.flatMap(richBlocks) : null;
    case 'own':
      return null;
  }
}

/**
 * Is this pressed text (or glossary match) French words rather than a
 * formula? «Montrer que», «Recopier et compléter» are words; «p(A \cap F)»,
 * «A», «x²» are formulas.
 */
export function isFrenchWords(s: string): boolean {
  const t = s.trim();
  return /^[A-Za-zÀ-ÿ'\u2019 ,.;:-]+$/.test(t) && /[A-Za-zÀ-ÿ]{3,}/.test(t);
}
