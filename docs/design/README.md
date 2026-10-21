# Design references (Cahier direction)

Visual targets for the design pass (phases D0 to D5 in the task brief). Read this file before opening any image.

## Ground rules
1. **Text wins.** If an image conflicts with docs/DESIGN.md, docs/EDITOR.md, the current features, or the rules below, follow the text.
2. **Scale.** Images are exported at 2x (780 px wide = 390 pt). Divide pixel sizes by 2 to get points. Spacing and sizes in DESIGN.md are in points.
3. **Static states.** Every image is one frozen state of a mockup. Numbers, times, difficulty dots, counts and the Arabic wording are SAMPLE content, not data and not final text. Arabic strings in the app stay reviewed:false.
4. **Math direction.** Math, numbers and number sequences are always left to right, in their own isolated LTR run, even inside Arabic sentences. Do not mirror them.
5. **Real behaviour comes from the code and docs, not from the pictures.**

## Files

| File | What it shows | Status |
|---|---|---|
| 01-proba-2a-question.png | Probability question (pairs with X = 0): header, statement card, urn, chip grid, count, primary button, quiet secondary buttons, ask bar | IN SCOPE (look) |
| 02-analyse-a1-predict.png | Analysis question with the mirror graph, readouts, prediction options | IN SCOPE (look) |
| 03-lines-editor.png | Line-by-line editor on a ruled notebook page: goal card, accepted line with green check, current line with red mark, red-pencil error note, keyboard | IN SCOPE (look only) |
| 04-feed-longpress.png | Lesson feed with a long-press popup (اشرحلي / علاش؟ / مثال), highlighted sentence, graph card, active question card with "السؤال" tab | IN SCOPE |
| 05-paper-free-1.png, 06-paper-free-2.png | Full exercise as on the exam paper (free-user view with locked button) | FUTURE, do not build |
| 07-paper-premium.png | Same paper with progress marks (premium) | FUTURE, do not build |
| 08-review-FUTURE.png | Review screen ("corrected copy") | FUTURE, do not build |
| 09-picker.png | Exercise picker: one card per exercise, part chips, resume button | IN SCOPE (D4) |
| 10-sheet-over-lesson.png | The "الورقة" sheet over the dimmed lesson: statement, question list, proven results | IN SCOPE (D4); the dimmed lesson behind it is a placeholder |
| 11-feed-deepdive.png | Deep-dive sheet inside the feed, "نرجعو شوية" tab, "نرجعو للسؤال" divider, return to the question card | IN SCOPE |
| 12-chapter-list-FUTURE.png | Chapter screen with exercise cards | FUTURE (reference for picker cards only) |
| 13-series-FUTURE.png | Whole exam paper with its four exercises | FUTURE, do not build |
| current-*.png | Screenshots of the CURRENT app (before the redesign) | Reference for behaviour that must not break |

IN SCOPE NOW: 01, 02, 03, 04, 09, 10, 11.
FUTURE, do not build: 05, 06, 07, 08, 12, 13.

## What to take from the images
- Paper background with a faint grid, white cards, thin blue-gray borders, ink-navy text.
- ONE primary button per card ("نثبّت", filled ink); quiet secondary buttons next to it ("ما نعرفش" dashed, hint count). Extra actions (change method, something easier, report) live behind a "..." button.
- Highlighter yellow = selected/current. Green pencil = correct. Red pencil = error note. Always icon + text, never color alone.
- Active question card: 2 pt blue border with a small "السؤال" tab.
- Deep dive: inset sheet with dashed blue edge and a small tab; the "نرجعو للسؤال" divider afterwards.
- Student answers: blue-pen bubbles.
- Notebook page for the editor: ruled lines, margin line, status mark per line.
- Step divider: dashed rule + small label.

## What NOT to copy
- Reversed math order. In 01 the urn and the pair grid read right to left (2, 1, 0', 0, -1; mirrored grid). The app keeps them left to right.
- The "x-" label on the graph in 02 and 04. It must read "-x" (math run, left to right).
- The keyboard in 03. It is out of date: it shows only < > and backspace. Follow docs/EDITOR.md for keys, arrows, undo/redo, widen, copy-previous-line and folding. Take only the notebook-page look and the stacked fraction icon from 03.
- The overlapping page number at the bottom of 06, and the gray gradient on the slider track in 02, 03 and 04 (export artifacts; use a normal slider).
- Placeholder data: difficulty dots, "~75 min", points per exercise, "A2 current" in 09, "ظهرت 3 مرات" in 08. Show only what the content really has (parts that exist, with the rest marked "قريبا"; the draft badge comes from the content's reviewed flag).
- The bottom tab bar (3 tabs) appearing in 08, 09, 12 and 13. Review and rules notebook do not exist yet. Do not show tabs for features that are not built; the picker screen has no tab bar for now.
- Skeuomorphic decoration: no paper textures, spirals, handwriting fonts, drop shadows, or left-border callout cards.

## Fonts and tokens
Arabic and UI: Tajawal. Math and exam paper text: STIX Two Text. Exact colors, sizes and radii are in docs/DESIGN.md. Check font licenses and loading time before bundling.

## Behaviour that the design must keep
- Prediction cards hold the lesson until one tap and do not show their verdict before it.
- Help buttons appear only when authored content exists for that step.
- Typed lines keep working as today; restyle only.
- The floating "back to the question" button appears only after the card has been off screen for a couple of seconds.

## current-*.png: screenshots of the app BEFORE the redesign
Use them to see which behavior must keep working. They are not a visual target and they contain known bugs:
- current-help-buttons-crowded: four secondary buttons under the question card (target: one primary + quiet buttons + "..." menu). The teacher-note card shown after "something easier" is a fixed bug.
- current-feedback-selfreport: feedback block + self-report card. Keep the behavior (blocking card with one tap), restyle only.
- current-predict-verdict-leak: the verdict ("same height" and the insight sentence) must NOT be visible before the tap (fixed in Group 2).
- current-proba-feed-start, current-proba-keypad, current-proba-law-table: probability components and their keypads. Math stays left to right. The sum formula in current-proba-law-table overflows the card (bug to fix in the redesign).
- current-lines-editor: the editor with the v2 keyboard (arrows, undo/redo, widen, copy previous line). Keep all keys and behavior (docs/EDITOR.md).
Known bugs visible in these images, do NOT reproduce: "x-" order in Arabic sentences, the floating "back to the question" button covering content, the old header with the 1.b / 2.a / A.1 switch, the old dark "اسأل" button.
The ask-chips row above the ask bar is an existing feature that the mockups do not show: ask before removing or moving it.