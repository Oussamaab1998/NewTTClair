/**
 * The options he gets on what he selected, and the prepared answers from
 * the exercise's glossary (src/content/help). Each kind of text has its own
 * options (owner, 2026-11-18: "those options are not always valid"):
 *   a formula or a symbol: «شنوّة معناها؟» «كيفاش نقراها بالفرنسي؟»
 *     «علاش نستعملوها هنا؟» «نكتب سؤالي وحدي»;
 *   the paper's French words: «شنوّة معناها بالدارجة؟» «شنوّة يطلبو منّي
 *     نعمل؟» «نكتب سؤالي وحدي»;
 *   Arabic text (our help, the step, the teacher's answer): «ما فهمتش،
 *     فسّرهالي بطريقة أخرى» «عطيني مثال» «نكتب سؤالي وحدي».
 * A glossary entry answers at once, free: its meaning (with its French
 * reading for a symbol), its reading, why it is used here; anything the
 * entry does not hold goes to the AI teacher.
 */
import type { GlossaryEntry } from '../../content/help/schema';
import type { Rich } from '../../content/schema';
import type { TeacherBlock } from './types';

/** The options of the menu after a selection. */
export type AskKind =
  | 'meaning'
  | 'reading'
  | 'use'
  | 'darija'
  | 'task'
  | 'rephrase'
  | 'example'
  | 'own';

/** What he selected: a formula, the paper's French, or Arabic text. */
export type AskSubject = 'math' | 'fr' | 'ar';

/** The options each kind of text gets, in order (his own question last). */
export const ASK_OPTIONS: Readonly<Record<AskSubject, readonly AskKind[]>> = {
  math: ['meaning', 'reading', 'use', 'own'],
  fr: ['darija', 'task', 'own'],
  ar: ['rephrase', 'example', 'own'],
};

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
    // The paper's words in darija: what the entry says they mean.
    case 'darija':
      return entry.meaning.flatMap(richBlocks);
    // What the paper asks him to do: the entry's use here, else the AI.
    case 'task':
      return entry.use ? entry.use.flatMap(richBlocks) : null;
    // Our own text said again, or an example: always the AI.
    case 'rephrase':
    case 'example':
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
