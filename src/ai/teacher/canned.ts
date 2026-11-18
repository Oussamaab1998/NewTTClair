/**
 * The free stand-in of the teacher (debug builds, `-devTeacher canned`):
 * waits a moment, then answers every question with the same example of the
 * approved mockup (p(A ∩ F), p(F/A) and p(A/F) side by side, with numbers of
 * its own), checked like a model's answer. No call, nothing spent.
 */
import type { TeacherBlockIn } from './tool';
import type { TeacherAi } from './types';
import { verifyTeacher } from './verify';

/** How long the stand-in "writes" (the typing bubble shows meanwhile). */
export const CANNED_MS = 1_200;

export const CANNED_ANSWER: readonly TeacherBlockIn[] = [
  {
    type: 'ar',
    text: 'الكتيبات يشبهو لبعضهم، أما المعنى موش كيف كيف.',
  },
  { type: 'math', latex: 'p(A \\cap F)' },
  { type: 'fr', text: '« p de A inter F »' },
  {
    type: 'ar',
    text: 'الزوز مع بعض: التلميذ في الحدث الأوّل وفي الحدث الثاني، والحساب على الناس الكل. في الشجرة هو طريق كامل.',
  },
  { type: 'math', latex: 'p(F/A)' },
  { type: 'fr', text: '« p de F sachant A »' },
  {
    type: 'ar',
    text: 'الثاني، كي نعرفو اللي الأوّل صار: نحسبو في وسط اللي في الحدث الأوّل برك. في الشجرة هو فرع واحد بعد العقدة.',
  },
  { type: 'math', latex: 'p(A/F)' },
  { type: 'fr', text: '« p de A sachant F »' },
  {
    type: 'ar',
    text: 'بالعكس: الأوّل، كي نعرفو اللي الثاني صار. نحسبو في وسط اللي في الحدث الثاني برك.',
  },
  {
    type: 'ar',
    text: 'مثال بالعباد: قسم فيه خمسة وعشرين تلميذ، ستاشر منهم في النادي، سبعة يلبسو مرايات، وثلاثة في النادي ويلبسو مرايات.',
  },
  { type: 'math', latex: 'p(A \\cap F) = \\frac{3}{25}' },
  { type: 'math', latex: 'p(F/A) = \\frac{3}{16}' },
  { type: 'math', latex: 'p(A/F) = \\frac{3}{7}' },
  {
    type: 'ar',
    text: 'نفس التلامذة الثلاثة، أما كل مرّة نقسمو على مجموعة أخرى: القسم الكل، اللي في النادي، ولا اللي يلبسو مرايات.',
  },
];

export function cannedTeacher(ms = CANNED_MS): TeacherAi {
  return (req, signal) =>
    new Promise(resolve => {
      const answer = () => {
        const v = verifyTeacher(CANNED_ANSWER, req.context?.verify ?? null);
        resolve(
          v.ok
            ? {
                ok: true,
                answer: { blocks: v.blocks, source: 'canned', costUsd: 0 },
              }
            : { ok: false, reason: 'failed' },
        );
      };
      if (signal?.aborted) {
        resolve({ ok: false, reason: 'failed' });
        return;
      }
      const done = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', stop);
        answer();
      };
      const stop = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', stop);
        resolve({ ok: false, reason: 'failed' });
      };
      const timer = setTimeout(done, ms);
      signal?.addEventListener('abort', stop);
    });
}
