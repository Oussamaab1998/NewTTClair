/**
 * What the tutor needs per question beyond the exercise JSON: a short route
 * outline (English, model-facing), when exam notation may appear, the skills
 * and their older prerequisites, and the components that fit. Authored by the
 * dev team from the owner's method session; reviewed: false.
 */
export interface QuestionNotes {
  route: string[];
  /** Exam notation (C(n,k), the binomial law) only after this node is credited on any graph. */
  notationAfter: string | null;
  skills: string[];
  prerequisites: string[];
  /** The app's interactive components that fit, and the moment each one helps. */
  components: { name: string; when: string }[];
}

/** Questions the AI tutor leads (a pack with notes); the others keep the scripted lesson for now. */
export function hasTutorNotes(exerciseId: string, questionId: string): boolean {
  return TUTOR_NOTES[exerciseId]?.[questionId] !== undefined;
}

export const TUTOR_NOTES: Readonly<
  Record<string, Readonly<Record<string, QuestionNotes>>>
> = {
  'bac2022c-sc-ex2': {
    '1': {
      route: [
        'Opening: tell the route (plan, count, check, write on paper, then a similar question alone) and that «ما نعرفش» is a good answer. No maths yet.',
        'Plan: he orders the three plan cards (shown shuffled, input "order"). After a right order, one line on why: dividing comes last because it needs both numbers.',
        'Read: he taps the word of the statement that says whether order matters (simultanément: drawn together, order does not matter).',
        'Total: he writes the count of all draws as a line. Typical first idea: a falling product (10*9*8 = 720 counts ORDERED draws) or a wrong start (10+3). Repair: a small box he lists by hand, his rule predicted then checked, "with order vs together" on pairs (12 vs 6), the link between the two numbers, his rule tested on triples (24 vs 4, each group written 6 ways), then the real total 720 / (3*2*1) = 120 with the reason in his words. Only then name it C(10,3).',
        'Favourable: a draw with exactly one red is one red + two blacks. He counts each part, then combines. If he does not know: a small urn (2 reds, 4 blacks) where he lists one red with every black pair. Slips: one-ball choice treated with the order rule (writes 1 for the red part), black pair without its division (6*5 = 30), adding the parts instead of multiplying.',
        'Ratio: favourable / total; "can this be a probability?" catches 120/60; simplify; compare with the target 1/2 the exam gives.',
        'Paper: the write-up fills from his own credited lines (write_paper).',
        'Recipe: he picks his recipe sentences (input "order" with the recipe cards, distractors included), then the clean method card.',
        'Similar questions without help: same structure (5 red, 9 black) then the twist (no red, 7 red 5 black).',
      ],
      notationAfter: 'total',
      skills: [
        'simultaneous-draw',
        'ordering-vs-choosing',
        'combinations-count',
        'multiplication-principle',
        'probability-by-counting',
      ],
      prerequisites: [
        'order-of-operations',
        'brackets-division',
        'listing-systematically',
        'fractions-simplify',
      ],
      components: [
        {
          name: 'GroupBoxes',
          when: 'after he divides the ordered count by the wrong number (720/3) or cannot say why divide by 3*2*1: a SMALL twin (4 to 6 balls, k = 3) where he opens boxes and counts the orderings of one group himself. Never the exercise urn.',
        },
        {
          name: 'Urn',
          when: 'when he is unsure what one draw is or that the balls come out together: he taps balls to make one draw. On a small case (case_id) when he asks to see a box.',
        },
        {
          name: 'ChoiceProduct',
          when: 'after he adds the parts (4 + 15) or cannot say why the red part and the black pair multiply: two stages on a small twin (2 reds, 4 blacks), he picks one in each and sees the cell they make.',
        },
        {
          name: 'PartWholeBar',
          when: 'after a probability above 1 (120/60 = 2, 56/30): feedback mode with his own part and whole, he sees his value past the whole.',
        },
      ],
    },
    '2': {
      route: [
        'Opening: same urn and same draw as Question 1; only the event changes (B: no red ball). Tell the route (plan, count, check, paper, two similar questions alone) and that «ما نعرفش» is a good answer.',
        'Plan: the SAME three plan cards as Question 1 (input "order", shuffled): he sees the plan transfers. One line after: dividing comes last because it needs both numbers.',
        'Read: he taps the word of the statement that says what the event is («aucune»: no red ball at all).',
        'Total: he may reuse his Question 1 total (a bare 120 is accepted, or his line). Ask him in one question why it did not change: the total depends only on the urn and the draw, not on the event.',
        'Favourable: «aucune» means all three balls are black, so he counts groups of 3 among the 6 blacks: 6*5*4/(3*2*1) = 20. Typical slips: colour_swapped (counts groups of reds, 4*3*2/(3*2*1) = 4), drop_division (6*5*4 = 120, the same number as the total: ask "do both numbers count the same kind of draws?", P would be 1), a_count_for_b (copies 60, the count of A). If he does not know: a small urn where he lists the draws with no red himself (make_case urn, then input "list").',
        'Ratio: 20/120 = 1/6; simplify; "can this be a probability?" catches 120/20 = 6. No target is given by the statement.',
        'The exam\'s trap: 1 - P(A) = 1/2 is right only by coincidence (P(A) = 1/2), while P(B) = 1/6: B is only the 20-draw slice of "not A" (20 + 36 + 4 = 60 draws). If he writes 1 - P(A) or a bare 1/2: never "wrong"; test his claim "B is the opposite of A" on a NEW small case (make_case urn reds 3, blacks 4, k 3: no-red draws = 4, "not A" = 17) where he lists the no-red draws himself and compares with what his claim predicts; then back to his line.',
        'After his result (main path, one act): "someone wrote B is the opposite of A: what do you think?" (input "choice"), then the slices of the real urn (EventAreaModel) once his own 20 is credited.',
        'Paper: Tirage simultané de 3 boules parmi 10 : C(10,3) = 120 tirages. B : les 3 boules sont noires, C(6,3) = 20 tirages favorables. p(B) = 20/120 = 1/6 (each line from his credited lines).',
        'Recipe (cards with distractors, e.g. "always subtract P(A) from 1"), then the method card: read the event word; reuse what depends only on the urn and the draw; count the favourable draws for THAT event; divide; check 0..1; the opposite of an event is every case without it.',
        'Similar questions without help: same structure (6 red, 7 black, no red: 286, 35, 35/286), then the twist "au moins une boule rouge" on the same urn (5/6: here 1 - P(B) IS legitimate, because "at least one" is the exact opposite of "none"; (120 - 20)/120 is also right).',
      ],
      // C(n,k) was computed and named in Question 1: no gate here.
      notationAfter: null,
      skills: [
        'event-as-set',
        'complement-event',
        'au-moins-un',
        'combinations-count',
        'probability-by-counting',
      ],
      prerequisites: [
        'listing-systematically',
        'counting-principle',
        'fractions-simplify',
      ],
      components: [
        {
          name: 'EventAreaModel',
          when: 'after his own favourable count 20 is credited (it shows every slice count from the start): source urn reds 4, blacks 6, k 3; events A (exactly one red) and B (no red); overlay "complement" to see that "not A" is 20 + 36 + 4 and B only its 20 slice. Also after the claim test when he wrote 1 - P(A).',
        },
        {
          name: 'Urn',
          when: 'when "aucune" is unclear (what a no-red draw looks like): on a small case (case_id from make_case, e.g. 2 reds 3 blacks, k 3) he taps three balls that make a no-red draw.',
        },
        {
          name: 'GroupBoxes',
          when: 'after drop_division at the favourable count (6*5*4 = 120 for groups): a SMALL twin of 4 or 5 balls with k = 3 (never the exercise urn, never k = 2) where he opens boxes and counts the orderings of one group.',
        },
        {
          name: 'PartWholeBar',
          when: 'after a probability above 1 (120/20 = 6): feedback mode with his own part and whole.',
        },
        {
          name: 'ComplementView',
          when: 'after the twist question is reviewed, if he asks why 1 - P(B) is allowed for "au moins une" but 1 - P(A) was not for B: the event "no red" and its complement as one split bar on the exercise urn.',
        },
      ],
    },
    '3a': {
      route: [
        'Opening: tell the route (recognise the type, the probability of one sequence, count the sequences, build the law; then two similar questions alone) and that «ما نعرفش» is a good answer.',
        'Plan: four cards (input "order"): c_type first; c_seq and c_count both need c_type; c_law needs c_seq and c_count. One line after: the law needs the two numbers.',
        'Read: he taps the word that says each trial starts again from the same urn («remettant»: independent trials, the same p each time).',
        'Type: what is a success in one trial? (input "choice": exactly one red = A / at least one red / no red). Success = A, p = P(A) = 1/2, his own result of Question 1 (carried).',
        'One concrete case FIRST, with lines on the pad (n = 7, k = 2), before any formula: one sequence of 2 successes and 5 failures has probability (1/2)^7 = 1/128 (seven factors 1/2, independence: multiply); the number of such sequences is the number of ways to choose the 2 places of the successes among 7, his own rule from Question 1: 7*6/(2*1) = 21; the law term 21*1/128 = 21/128.',
        'Slips with their message: p_single_trial (1/2 used for a whole sequence), forgets_failures ((1/2)^2 = 1/4), adds_instead_of_multiplies (7*1/2 = 7/2, above one), drop_division at the count (42), reads_choose_as_fraction (7/2), n_times_k (14), one_sequence_as_P_X_k (1/128 given as P(X = 2): "this number is ONE sequence; the question is about all sequences with the same number of successes"), count_given_as_probability (21).',
        'Then the general law: input kind "formula" with expect {expr: "C(n,k)*(1/2)^n", vars: ["n","k"]}; the engine compares his formula exactly and returns a counterexample at a point; put that point next to his own concrete line (his formula at n = 7, k = 2 against his own 21/128). C(n,k)*(1/2)^k*(1/2)^(n-k) and C(n,k)/2^n are both right.',
        "Name the law only after he wrote it: X suit la loi binomiale B(n ; 1/2). The exam's p = 1/2 hides p^k q^(n-k) behind (1/2)^n: that is why the first similar question uses a die.",
        'Paper: Les n épreuves sont indépendantes (tirages avec remise) ; succès A, p = 1/2 ; X suit B(n ; 1/2) ; p(X = k) = C(n,k) (1/2)^k (1/2)^(n-k) = C(n,k)/2^n (from his credited formula).',
        'Recipe and method card (independent repeated trials, success and p, one sequence, the number of sequences, the law), then the similar questions without help: (a) a fair die thrown 3 times, X = number of 6, p(X = 1) = 3*(1/6)*(5/6)^2 = 25/72 (not a make_case case: check his lines with evaluate); (b) the twist: the same urn drawn WITHOUT replacement, p(Y = 1) = 60/120 = 1/2 with the Question 1 method (the binomial law does not apply: binomial_for_dependent gives 54/125).',
      ],
      notationAfter: 'count',
      skills: [
        'random-variable-values',
        'random-variable-law',
        'multiplication-principle',
        'combinations-count',
        'law-sum-one',
      ],
      prerequisites: [
        'powers-rules',
        'fractions-operations',
        'counting-principle',
      ],
      components: [
        {
          name: 'VariableTable',
          when: 'after «ما نعرفش» at the plan or at the law: the n = 2 case by hand, outcomes {kind: "trials", n: 2}, checks ["all_used", "sum", "symmetry"]: he builds the law 1/4, 1/2, 1/4 himself (SS SF FS FF).',
        },
        {
          name: 'SlotsPattern',
          when: 'after drop_division, reads_choose_as_fraction or n_times_k at the count: where do the successes go? n = 5, k = 3 (never n = 7 with k = 2, the step answer; k = 2 is refused); mode "bridge" when he must see that choosing the places of the successes is choosing balls (his Question 1 rule).',
        },
        {
          name: 'RepeatedRuns',
          when: 'after adds_instead_of_multiplies or p_single_trial (independence not seen): mode "two_stage", N = 16, stages p "1/2" then "1/2": 16, 8, 4 runs, a product of independent events.',
        },
        {
          name: 'BinomialExplorer',
          when: 'only after his law is credited (a tapped bar shows its term): n {min 2, max 10, init 7}, p fixed "1/2", toggles off; he taps two bars and compares with his own formula.',
        },
      ],
    },
    '3b': {
      route: [
        'Opening: the same repeated trials as 3a; now the mean and the spread of X in terms of n. Route and «ما نعرفش».',
        'Plan: four cards (input "order"): c_mean1, c_meann (needs c_mean1), c_var1, c_varn (needs c_var1).',
        'Read: «remettant» again (second use of the same word): independent trials, so the means add up and the spreads add up.',
        'One concrete case first (n = 7, p = 1/2 from his earlier results), lines on the pad: one trial mean 0*(1/2)+1*(1/2) = 1/2; n trials 7*(1/2) = 7/2; one trial spread (0-1/2)*(0-1/2)*(1/2)+(1-1/2)*(1-1/2)*(1/2) = 1/4 (the pad has no ^ key: squares as products); n trials 7*(1/4) = 7/4.',
        'Then the formulas in n, one per message, input kind "formula": E(X) with expect {expr: "n/2", vars: ["n"]}, then V(X) with expect {expr: "n/4", vars: ["n"]}. Put a counterexample next to his own concrete line.',
        'Slips: mean_of_one_trial_for_n (1/2, forgets n), n_instead_of_np (7), variance_as_mean (7/2, forgets q), variance_forgets_n (1/4), variance_p_squared: n*p^2 equals n*p*(1-p) ONLY because p = 1/2: the engine cannot tell n*(1/2)^2 from n*(1/2)*(1/2) here; ask which one he means in words (p times q, or p times p) and settle it on the die in the similar question.',
        'Name the formulas after his lines: E(X) = n p and V(X) = n p (1 - p). Paper: X suit la loi binomiale B(n ; 1/2) donc E(X) = n p = n/2 et V(X) = n p (1 - p) = n/4 (from his credited formulas).',
        'Recipe and method card, then the similar questions without help: (a) a fair coin tossed 5 times: E(X) = 5/2, V(X) = 5/4; (b) a fair die thrown 3 times, X = number of 6: E(X) = 1/2, V(X) = 3*(1/6)*(5/6) = 5/12, where n p^2 = 1/12 finally differs (check his lines with evaluate; these are not make_case cases).',
      ],
      // The C(n,k) gate is not used here: no node computes a count of groups.
      notationAfter: null,
      skills: ['random-variable-law', 'random-variable-values', 'law-sum-one'],
      prerequisites: ['fractions-operations', 'powers-rules', 'distributivity'],
      components: [
        {
          name: 'SpreadSlider',
          when: 'after variance_as_mean or «ما نعرفش» at the one-trial spread: family bernoulli, p from "0" to "1", step "1/10", init "3/10" (not the step\'s 1/2); totalLockedUntil positions 3; checkpoint "larger_spread": he finds that the spread is largest at p = 1/2 and is p(1 - p).',
        },
        {
          name: 'RepeatedRuns',
          when: 'when "mean" is not understood as an average per trial: mode "tally", N = 16, a twin law (values [0, 1], probabilities ["3/4", "1/4"], not the step\'s 1/2): runs x value, the total S, S / N.',
        },
        {
          name: 'BinomialExplorer',
          when: 'only after both of his formulas are credited: n {min 2, max 12, init 7}, p fixed "1/2", toggles mean and variance on; he checks n p and n p q at several n against his formulas.',
        },
      ],
    },
  },
};
