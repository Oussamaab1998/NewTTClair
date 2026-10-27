import { parseAnswer } from './strictSchema';
import { LIVE_TUTOR_OUTPUT } from './fixtures/liveOutputs';
import { cleanTutorAnswer, tutorFormat } from './tutorFormat';

describe('tutor answer: empty strings mean "absent" (live run, 2026-10-22)', () => {
  it('the exact live output parses: "" fr / math are dropped, the runs are kept', () => {
    const r = parseAnswer(tutorFormat(), LIVE_TUTOR_OUTPUT);
    expect(r.success).toBe(true);
    const blocks = r.success ? r.data.blocks : [];
    expect(blocks).toHaveLength(4);
    for (const b of blocks.slice(0, 3)) {
      expect(b.type).toBe('text');
      if (b.type === 'text') {
        expect(b.text).not.toHaveProperty('fr');
        expect(b.text).not.toHaveProperty('math');
        expect(b.text.ar?.length).toBeGreaterThan(0);
      }
    }
  });

  it('empty runs and an empty run list are dropped; a text with nothing left stays invalid', () => {
    expect(
      cleanTutorAnswer({
        blocks: [
          {
            type: 'text',
            text: { ar: [{ ar: 'شوف' }, { fr: '' }, { ar: '  ' }], fr: ' ' },
          },
          { type: 'text', text: { ar: [], fr: 'au moins un', math: '' } },
          { type: 'math', latex: '\\bar{B}', resultId: '' },
        ],
        needsTeacher: false,
      }),
    ).toEqual({
      blocks: [
        { type: 'text', text: { ar: [{ ar: 'شوف' }] } },
        { type: 'text', text: { fr: 'au moins un' } },
        { type: 'math', latex: '\\bar{B}' },
      ],
      needsTeacher: false,
    });
    const empty = parseAnswer(tutorFormat(), {
      blocks: [{ type: 'text', text: { ar: [], fr: '', math: '' } }],
      needsTeacher: false,
    });
    expect(empty.success).toBe(false);
  });

  it('the shape check no longer rejects a whole answer for Latin inside an Arabic run (verify.ts handles it per block)', () => {
    const r = parseAnswer(tutorFormat(), {
      blocks: [{ type: 'text', text: { ar: [{ ar: 'الحدث B' }] } }],
      needsTeacher: false,
    });
    expect(r.success).toBe(true);
  });
});
