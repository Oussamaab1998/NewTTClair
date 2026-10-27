import {
  DARIJA_LEXICON,
  PROMPT_VERSION,
  TUTOR_INSTRUCTIONS,
  planInstructions,
} from './prompts';

describe('static prompt: Darija word list (2026-10-22)', () => {
  it('is in both the planner and the tutor prompt, with preferred and avoided forms', () => {
    for (const prompt of [planInstructions(), TUTOR_INSTRUCTIONS]) {
      expect(prompt).toContain(DARIJA_LEXICON.text);
    }
    expect(DARIJA_LEXICON.text).toContain('قدّاش');
    expect(DARIJA_LEXICON.text).toContain('كورة');
    expect(DARIJA_LEXICON.text).toContain('تنسحب');
  });

  it('is marked as needing a teacher review, and the prompt version moved on', () => {
    expect(DARIJA_LEXICON.reviewed).toBe(false);
    expect(PROMPT_VERSION).toBe('p6');
  });
});
