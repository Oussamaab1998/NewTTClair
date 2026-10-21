# Manual tests (product owner)

A short pass by hand on the iOS simulator or an iPhone, debug build. Each line: **do** → **expect**.
Tick it, or note what you saw. Automated tests cover the logic; this list covers what only a person can judge:
- feel;
- gestures;
- reading;
- VoiceOver;
- daylight.

Start: `npm start`, then `npm run ios` (or `npx react-native run-ios --simulator "iPhone 17 Pro"`).
Launch shortcuts: README "Test mode" and `src/app/dev/launch.ts`.

## 1. Shell
- [ ] Launch normally → the picker, no dev tabs, no LLM status line.
- [ ] Launch with `-devMode on` → the 5 dev tabs. Relaunch without it → dev mode off again.
- [ ] Hold the picker title 2 s → dev mode toggles. Hold again → off.
- [ ] In a lesson, tap the header back button (right, «→») → back to the picker.

## 2. Picker
- [ ] Each card shows, from the right: the subject tag and «مسودّة», then «Exercice n» on the left; the key line; the Arabic title; the part chips; the main button.
- [ ] Tap an available chip → that part opens.
- [ ] Tap a «قريبا» chip (dashed) → nothing happens: no press state, no navigation.
- [ ] Finish a part (or `-devPart A1 -devActions answerAll`), go back → ✓A.1 chip, and the button says «كمّل من» the next part.

## 3. «الورقة» sheet
- [ ] Header button «الورقة» (left) → the sheet opens over the dimmed lesson, scrolled to the current question («انت هنا»).
- [ ] The four ways to close it all work: ×, tap the dimmed area, swipe down / back gesture, «نرجعو للسؤال». After each one you are back on the lesson where you were.
- [ ] Not-built questions are dashed with «قريبا» and do nothing when tapped.
- [ ] After a done part, «النتائج المثبتة» lists its result (e.g. ✓ f est paire).

## 4. Lesson feed
- [ ] Every screen asks for an action (a choice, typing, a drag). No screen is only text.
- [ ] Long-press a tutor sentence → a menu with the quoted text; the trust label and «بلّغ على غلطة» are last, separated.
- [ ] Long-press a formula or a visual → the same menu (no per-block button).
- [ ] Question card «⋯» → its actions (change method, simpler, back when offered), then the report row.
- [ ] «ما نعرفش» → a deep-dive sheet opens under the card («نفهمو بالشوية» tab). Finish it → back to the question.
- [ ] Scroll the active question off screen → after about 2 s, the «ارجع للسؤال ↓» button (bottom left) appears. Tap it → the question is back at the top.
- [ ] Ask bar: the chips are folded while a card is active; «اسأل» opens them. Formula chips show the formula on its own line, and the row height doesn't jump.
- [ ] Hints: at most 3 levels; the full answer only after the last one.
- [ ] **2.a sum card** (`-devPart 2a -devActions answerAll -devUntil sum`): the formula stays inside the card. Swipe it sideways → «= ?» comes into view.
- [ ] **Gestures on that card:**
  - a vertical swipe on the formula scrolls the feed;
  - a diagonal swipe never gets stuck (one of the two scrolls moves);
  - on a short formula (A1's «x ∈ ℝ ⇒ −x ∈ ℝ»), a sideways swipe does nothing and a vertical swipe scrolls the feed.

## 5. Line editor (A1)
- [ ] Keys (EDITOR.md): fraction, power, brackets, ← →, delete. The cursor follows, and a long line scrolls with the cursor.
- [ ] «⧉ نسخ السطر السابق» chip in an empty line → copies the line above.
- [ ] Undo chip appears above the line's end after a change, without moving the line.
- [ ] A wrong line → a red-pencil note, an ✗ in the left margin, and words saying what to change (not colour only).

## 6. Keypad
- [ ] The ▾ key folds the keypad and unfolds it again.
- [ ] «نثبّت» looks disabled (still readable) while the field is empty; tap it → nothing is sent.
- [ ] A wrong typed answer → a red-pencil note; a right one → «صحيح».

## 7. Components
- [ ] Urn: draw, the ✓ badge on picked balls.
- [ ] Outcome / event pickers: pick and unpick, submit; colour is never the only sign.
- [ ] Slider and plot (analysis tab): smooth while dragging, no stutter.
- [ ] Law table: «p(X = −2) = ?» in the same math font as the table; fill it; the sum check.
- [ ] Prediction gate: you must predict before you see the result.

## 8. Reporting (one per path)
- [ ] Tutor sentence: long-press → «بلّغ على غلطة» → reason → thanks.
- [ ] Formula or visual: long-press → «بلّغ على غلطة».
- [ ] Choice card: long-press its title → «بلّغ على غلطة».
- [ ] Question card: «⋯» → report.
- [ ] A visual inside a card: from the next card's «⋯» → «بلّغ على هذا الجزء».
- [ ] AI block (live LLM only): its visible report link under the block.

## 9. VoiceOver (iPhone, or Simulator → Accessibility Inspector)
- [ ] Formulas are read as French words (e.g. «p de B égale 1 moins p de B barre»). Known gap: the law table's active line «p(X = −2) = ?» is plain text and is read symbol by symbol, never LaTeX or symbol names.
- [ ] Display blocks (tutor text, formulas, visuals) offer the custom action "report" (swipe up / down on the actions rotor).
- [ ] Header order: back, title, «الورقة». The ask bar: toggle, field, send. Write down the order you actually hear; it isn't checked yet.
- [ ] Disabled controls («قريبا» chips, «نثبّت» when empty) are announced as dimmed.

## 10. Reading in daylight
- [ ] On an iPhone at full brightness, outdoors or by a window: body text, muted labels («Exercice 2 · 2.a», hint counters), the «قريبا» chips, done cards and red-pencil notes are all readable without tilting the phone.
- [ ] Right / wrong states are still clear with the phone in a grey-scale filter (Settings → Accessibility → Display → Colour Filters).

## 11. Needs a real device / Android (not covered by the simulator pass)
- [ ] 360 pt wide phone: the A1 first card, the ask bar with chips open, the 2.a sum card, the law table.
- [ ] Android (deferred): fonts registered (Tajawal, STIX), border widths, layout, bidi isolation in mixed lines.
- [ ] A low-end Android: slider drag and feed scroll stay smooth.
