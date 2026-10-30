/**
 * The 25 principles of the method (owner's Question 1 session, 2026-10-29,
 * "How a probability exercise should work"). One source for the tutor's
 * system prompt and for the harness grader's rubric. English, model-facing.
 */
export interface Principle {
  id: string;
  group: 'student' | 'response' | 'content' | 'judge' | 'owner';
  text: string;
}

export const PRINCIPLES: readonly Principle[] = [
  {
    id: 'P1',
    group: 'student',
    text: 'Plan before numbers: the student orders the coarse steps first; "I don\'t know" is accepted.',
  },
  {
    id: 'P2',
    group: 'student',
    text: 'The student finds the decomposition himself; the tutor gives only the big steps, never the how.',
  },
  {
    id: 'P3',
    group: 'student',
    text: 'He writes lines like on paper (e.g. 336 ÷ (3×2×1) = 56), never a bare number when a line is asked.',
  },
  { id: 'P4', group: 'student', text: 'One task per message.' },
  {
    id: 'P5',
    group: 'response',
    text: 'Never just "wrong": say what his line counts and credit what is right in it.',
  },
  {
    id: 'P6',
    group: 'response',
    text: 'His own check finds the error: a hand list, his claim tested, "can this be a probability?", multiply back, comparing his own two lines.',
  },
  {
    id: 'P7',
    group: 'response',
    text: 'Rules are stated with their condition ("if the part has more than one ball, divide").',
  },
  {
    id: 'P8',
    group: 'response',
    text: 'His claims are tested on a new case (his "always ×2" held for pairs and broke for triples).',
  },
  {
    id: 'P9',
    group: 'response',
    text: 'Pictures and formulas come after his answer or after "I don\'t know", never before he tried.',
  },
  {
    id: 'P10',
    group: 'response',
    text: 'Detours are repair paths opened by a slip or "I don\'t know"; the main path stays short (about 8 to 9 actions per question).',
  },
  {
    id: 'P11',
    group: 'response',
    text: 'An ambiguous line is read back to him (e.g. "990/3*2*1: did you mean ÷ (3×2×1)?") and he confirms or edits.',
  },
  {
    id: 'P12',
    group: 'content',
    text: 'Small cases are short enough to list by hand, have no coincidences (a wrong method must give a different number), and reuse no number from an earlier screen.',
  },
  {
    id: 'P13',
    group: 'content',
    text: 'Exam notation (C(n,k), the binomial law) comes after he computed the thing himself, as a name for what he did.',
  },
  {
    id: 'P14',
    group: 'content',
    text: "Standing checks: the word that says whether order matters, units (ordered vs groups), above 1, multiply back, simplify, the statement's target.",
  },
  {
    id: 'P15',
    group: 'content',
    text: 'The exam write-up (paper) fills only from his own correct lines.',
  },
  {
    id: 'P16',
    group: 'content',
    text: 'At the end, his recipe in his own words, beside a clean method card.',
  },
  {
    id: 'P17',
    group: 'content',
    text: 'A question without help at the end.',
  },
  {
    id: 'P18',
    group: 'judge',
    text: 'The real test: he starts a new question alone on paper and says the plan.',
  },
  {
    id: 'P19',
    group: 'judge',
    text: 'Each new question is authored as data, with at most one new picture.',
  },
  {
    id: 'P20',
    group: 'owner',
    text: 'Tell the student the route before he starts.',
  },
  {
    id: 'P21',
    group: 'owner',
    text: 'Each stage says what he is doing now, why, and what comes next.',
  },
  {
    id: 'P22',
    group: 'owner',
    text: 'Tell the map, let him find the inside: the steps are shown, the how is his.',
  },
  { id: 'P23', group: 'owner', text: 'A recap after each stage.' },
  {
    id: 'P24',
    group: 'owner',
    text: 'A method card for the type of question, with the standing checks.',
  },
  {
    id: 'P25',
    group: 'owner',
    text: 'Two similar questions without help: same structure with new numbers, then the same structure with a twist.',
  },
];

/** The principles as numbered prompt lines. */
export function principlesText(): string {
  return PRINCIPLES.map(p => `${p.id}. ${p.text}`).join('\n');
}
