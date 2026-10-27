# Design (Cahier direction)

Status: Proposed (2026-10-21). Text here wins over the images (docs/design/README.md rule 1).
Applies to: the app shell, a restyle of existing screens, the exercise picker and the «الورقة» sheet inside the lesson.
Not in scope: review screen, rules notebook, chapter list, series view, premium gating, tab bar
(images 05-08, 12, 13 are FUTURE). All sizes are in points (images are 2x: divide pixels by 2).

## 1. Principles
- Paper and ink: a pale paper background, white cards, thin blue-gray borders, navy ink.
- One primary action per card. Everything else is quiet or sits in a "⋯" menu.
- Pencils for meaning: green = correct, red pencil = error note, highlighter = selected / current,
  blue pen = what the student wrote. Each always has an icon and text as well, never colour alone.
- Math is always LTR, in its own run or block, never mirrored (images 01, 02 and 04 have
  mirrored math: do not copy it).
- No skeuomorphism: no textures, spirals, handwriting fonts, drop shadows or left-border cards.

## 2. Tokens (src/theme, semantic roles; components never hold literals)
Raw values go in `palette.ts`; `tokens.ts` names the roles below. Existing roles are re-pointed
(e.g. `color.textPrimary` -> ink) so components pick up the new look without new literals.

### Colour roles
| Role | Value | Use |
|---|---|---|
| `color.paper` | #F2F5FB | screen background |
| `color.gridLine` | #DDE5F3 | 22 pt grid on paper (see §6) |
| `color.card` | #FFFFFF | cards, chips, quiet buttons |
| `color.border` | #C5D2EA | card / chip / button borders |
| `color.ink` | #1B2A57 | text, primary button fill, icons |
| `color.inkMuted` | #55627F | secondary text, labels, subtitles |
| `color.pen` | #2F5BEA | active question border, tabs, student bubbles, links, cursor, send button |
| `color.highlighter` | #FFE680 | selected option / chip, current item |
| `color.highlighterSoft` | #FFF4BF | current row in the sheet, highlighted sentence |
| `color.correct.ink` / `.bg` / `.text` | #1E7A4C / #E6F4EC / #14532D | correct mark, block, text |
| `color.error.ink` | #B8243D | red-pencil mark (× icon, underline) |
| `color.error.noteBg` / `.noteBorder` / `.noteText` | #FFF1F3 / #E9A3AE / #7A1428 | error note |
| `color.draft.bg` / `.border` / `.text` | #FFF6CC / #E0B800 / #5A4500 | draft tag, unreadable-line warning, teacher-note card |
| `color.deepDive.bg` / `.edge` | #F4F8FF / #2F5BEA (dashed) | deep-dive sheet |
| `color.subject.analysis` / `.probability` | #2F5BEA / #1E7A7A | subject tag on picker cards |
| `color.scrim` | ink at 40 % | behind the sheet and menus |
| `color.borderControl` | #7486AD | edges that identify a control (buttons, chips, keys, fields, slider track) |
| `color.inkDisabled` | #6B7590 | the disabled primary fill; disabled labels on white |
Data series (charts, law colours) stay as they are (`dataSeries`). **They are for graphics and fills only, never for text** (values are always shown as ink text next to them). **`borderControl` is for controls only**; card edges, the notebook ruling and dividers keep the light `border` (decorative).

#### Contrast (WCAG 2.x; enforced by `__tests__/contrast.test.ts`)
Text needs 4.5:1, control edges and graphics 3:1.
| Pair | Ratio |
|---|---|
| ink on paper / card | 12.69 / 13.86 |
| inkMuted on paper / card | 5.59 / 6.11 |
| pen (links) on card; white on pen | 5.52 / 5.52 |
| white on ink (primary «نثبّت») | 13.86 |
| white on inkDisabled (disabled «نثبّت», disabled send) | 4.59 |
| inkDisabled labels on card (disabled keys, used-up hint, disabled chips) | 4.59 |
| correct.ink / correct.text on correct.bg | 4.70 / 8.03 |
| error.ink / error.noteText on noteBg | 5.70 / 9.77 |
| draft.text on draft.bg | 8.45 |
| ink on highlighter / highlighterSoft | 11.14 / 12.50 |
| white on subject tags (analysis / probability) | 5.52 / 5.10 |
| borderControl on card / paper | 3.65 / 3.34 |
| slider track (borderControl) / fill (pen) on card | 3.65 / 5.52 |
| plot curve / axis / marker on card | 5.52 / 6.11 / 13.86 |
| data series 1-6 on card | 6.09, 4.83, 5.13, 7.04, 5.62, 4.52 |
| *decorative:* border / gridLine on card | 1.52 / 1.26 |
Inactive (done / paused) question cards: opacity 0.75 (ink text 6.30:1; muted text inside them 3.50:1, below 4.5: secondary text only).

### Type
| Role | Family | Size / line height | Weight |
|---|---|---|---|
| `font.screenTitle` | Tajawal | 26 / 34 | 800 |
| `font.header` | Tajawal | 21 / 30 | 700 |
| `font.body` | Tajawal | 16.5 / 30 (≈1.8) | 400 (500 for buttons, 700 for question prompts) |
| `font.small` | Tajawal | 13.5 / 22 | 400 / 500 |
| `font.math` | STIX Two Text | body × existing `mathRunDelta` | 400, italic for letters |
| `font.paper` | STIX Two Text | 16.5 / 28 | 400 (exam wording in the sheet and the statement card) |
Families are tokens (`font.family.ui.{regular,medium,bold,extraBold}`, `font.family.math.{regular,italic,bold}`).
Fallback: if a face fails to load, iOS uses the system font. A test checks that every family token
matches a file listed in Info.plist. RN has no CSS-style font stack, so the fallback is per platform.
Fonts are bundled in `assets/fonts/` (Tajawal 400/500/700/800, STIX Two Text Regular/Italic/Bold).
Both are SIL OFL 1.1; the licence files ship next to them. I add them to the Xcode resources and
`UIAppFonts` by hand, with no new npm package. Loading cost is measured in D0 (cold start with and
without, and the bundle size added).

### Shape and size
radius: card 14, button 12, chip 10, tag 8 (sheet top 20). Border width 1.5 (active question 2).
Touch targets ≥ 44 (hitSlop where the glyph is smaller). Spacing keeps the existing `space` scale; the screen gutter is 16.

## 3. Patterns
- **Header (lesson):** RTL order from the right: back button (44 × 44, «→», card + border,
  a11y «رجوع للتمارين»), then the title block (Arabic exercise title in `header`, under it the
  French subtitle «Exercice 4 · A1» in `small`/inkMuted, in an LTR run, and a «مسودّة» draft tag
  when `reviewed: false`), then at the far left the «الورقة» button (quiet, icon + text).
  Under the header is a 6 pt progress bar (track `border`, fill `pen`; main-path steps passed /
  total, detours not counted). No step-count pill.
- **Step divider:** a dashed rule in `border` with a small label in `small`/inkMuted (the group name).
- **Tutor text:** plain on paper, with no card. Math is in its own block. A highlighted sentence (long-press) uses `highlighterSoft`.
- **Statement / goal card:** white card with the French exam wording in `font.paper`, math in
  STIX. No left border (this replaces today's 3 pt left rail).
- **Question card (active):** white, 2 pt `pen` border, radius 14, a small «السؤال» tab
  (pen fill, white `small` bold text) sitting on the top border at the start (right) edge.
  Inactive / done cards: 1.5 border, ink at the existing inactive opacity, no tab.
  Prediction cards show their options as chips; tapping one resolves the card, as today; no «نثبّت» button is added.
- **Actions in a question card:**
  - One primary button «نثبّت» (filled ink, white text, radius 12, full width or the wide
    half), only where the step has a check action (keypad, lines, task components, multi-select).
    Option questions answer on tap, as today, so there is no «نثبّت» there.
  - Quiet secondary buttons: «ما نعرفش» (dashed border, card fill), hint «تلميح n/3» (shown only when
    the step has hints; at the end of the ladder it becomes «ورّيني الحل», same place).
  - A "⋯" button (44 × 44, quiet) opens a menu with: «غيّر الطريقة» and «حاجة أسهل» (each
    only when authored help exists, as today), «⚑ بلّغ على غلطة», the trust label, and
    «نرجعو للسؤال» when that applies. The "⋯" button is shown only when the menu has at least one item besides
    report (report alone stays reachable through the block icon, see below).
  - Skip (optional steps) stays as a quiet button.
- **Reporting without a per-block icon (product owner, 2026-10-21):** content uses the full width, with
  one even screen margin (`layout.gutter`, 16 pt) on both sides; no block has a "⋯" icon or side room.
  Each block reaches its trust label and Report this way (`reportPath`, src/lesson/feed/reportTarget.ts):
  | Block | Path |
  |---|---|
  | tutor text (long-pressable) | its long-press menu: explain / why / example, then, set apart, the trust label and «بلّغ على غلطة» (last) |
  | statement / goal, math, feedback, hint, revealed answer, ask answer, write-up, fallback | long-press on the block (450 ms, cancelled by an 8 pt move, i.e. a scroll) → menu with the trust label and Report |
  | self-report / clarify / teacher-note card | long-press on its title only (its buttons stay plain taps) |
  | question card (and its task component: pickers, tables, lines editor, keypad) | the card's single "⋯" |
  | interactive visual (urn, outcome space, complement view, law chart, prediction, slider plots) | no long-press (it would clash with its taps, slider drags and scroll): a row «بلّغ على هذا الجزء» in the "⋯" of the next card after it (or, at the end of a part, the last card before it), with the visual's own snapshot |
  | AI block | its visible «⚑ بلّغ على غلطة» button and trust line (unchanged) |
  | student bubble, dividers, done line | none |
  Screen readers: each long-press block is one element labelled with its words (formulas read as
  words, never raw LaTeX) and has a custom action "report"; tutor text has "report" next to its
  ask action; cards and visuals go through the card's "⋯".
  **Proposed, not built:** a one-time hint under the first tutor block, «اضغط مطوّل على أي فقرة باش
  تسأل ولا تبلّغ» with a ×, shown once per install (stored flag), logged shown / dismissed, reviewed: false.
- **Options / chips:** card fill, 1.5 border, radius 10. Selected = highlighter fill + ink border
  (+ a ✓ or the chosen state in a11y). Correct = correct.bg + ✓ icon. Wrong = error note style + × icon.
- **Feedback blocks:** correct = correct.bg block, green ✓ icon + text. Error = red-pencil note
  (noteBg, noteBorder, noteText, × icon + text). Hint = highlighterSoft block with
  a text label «تلميح n» with an icon from our glyph set (no emoji). Warning (unreadable line, draft) uses `draft` colours.
- **Student answers:** blue-pen bubbles: pen text on #FFFFFF with a 1.5 pen border, radius 14,
  aligned to the end (left) as today. The «ما نعرفش» bubble looks the same.
- **Deep dive:** a sheet (full width, no extra inset; inner padding only) on `deepDive.bg` with a 1.5 dashed `pen`
  edge, radius 14, a small «نرجعو شوية» tab on its top edge. Its blocks render inside it, with no depth
  rail. It closes with a divider «نرجعو للسؤال ↓» (dashed rule + label) before the re-asked card.
  Variants (detours) use the same sheet with their own tab label (existing header text).
- **Self-report / clarify / teacher-note cards:** a white card with a dashed `border` edge and
  quiet choice buttons. They still block where they block today (one tap).
- **Ask bar:** a white rounded field (radius 22, border) with a round pen send button (44, arrow
  icon) at its end. The ask-chips row stays above it: radius-10 chips on one line (text with "…"),
  except chips with a formula, which have two lines (the text, then the formula on its own LTR line,
  never in the Arabic run). The open row has a fixed height (40 pt, or 64 pt when a chip has a
  formula), so it never jumps. It starts collapsed while a question card is on screen (only the quiet
  «اسأل» chip, in the input line) and opens on tap for that card; the next card collapses it again.
- **"Back to the question":** a small pen pill «نرجعو للسؤال ↓», bottom-start above the ask bar,
  shown only after the card has been off screen for 2 s (`feed.jumpDelayMs`), as today. It must not cover the ask bar.
- **Line editor (restyle only, docs/EDITOR.md unchanged):** a notebook page: white card, ruled
  lines in `gridLine`, a thin margin line in error.noteBorder at the end (left) column holding each line's
  status mark (✓ green circle, × red circle). The current line has a 2 pt pen border. Error notes use the red-pencil
  note style. Keys: card fill, radius 12, border; the active structure key (fraction / power) has a pen border;
  «نثبّت» is the ink primary. Fraction key icon: stacked box / bar / box (from 03). All keys, rows,
  undo / redo, widen, copy-line, fold and the undo chip stay exactly as in EDITOR.md (image 03's keyboard is out of date).
- **Numeric keypad:** same key style as the editor; «نثبّت» primary; ▾ fold kept.

## 4. Screens
### 4.1 Exercise picker (09, without its tab bar or placeholder data)
- Title «اختار تمرين» (screenTitle), and under it the session line from the content (French, small,
  inkMuted, e.g. «Bac Mathématiques · Session de contrôle 2022» only if the content has it; otherwise none).
- One card per exercise: a subject tag (analysis blue / probability teal, radius 8) at the start;
  «Exercice n» at the end (no points unless the content has them); the statement's key line
  (Ex 4: the f(x) formula; Ex 2: the first two French sentences); a one-line Arabic summary
  (the content's Arabic title); part chips; one primary button «كمّل من X».
- Part chips (LTR labels): done = correct.bg + ✓, current (the first not done) = highlighter,
  available = card, not authored = dashed and disabled «قريبا» (from `paper`). Tapping a chip opens that part.
- «كمّل من X» opens the first part not done (or the first part if none or all are done; in that case the label is «نبداو»).
- After the cards: a dashed «تمارين أخرى قريبا» box. No tab bar.
- Error card (failed load) kept, restyled as an error note.

### 4.2 Lesson (01, 02, 03, 04, 11)
Header (§3), feed on paper, the active question card, the ask bar. The order of the existing feed items
does not change. In normal mode there are no dev tabs, no status strip and no counters.

### 4.3 «الورقة» sheet (10)
- Opened by the header button and shown as a bottom sheet over the dimmed lesson (RN `Modal`, slide, scrim).
  Grab handle, × close (44), title «الورقة», subtitle «Exercice 4 · Partie A».
- A statement card (exam wording from the JSON, `font.paper`, math in STIX, LTR).
- The question list from `paper` (or the authored parts when `paper` is absent): number circle, French
  exam wording, state: done (✓ tag, correct colours), current (highlighterSoft row, 2 pt ink border,
  «انت هنا» tag), available, not authored (dashed, «قريبا»). Rows cannot be tapped in D4 (no navigation from the sheet).
- «النتائج المثبتة»: one ✓ tag per `exercise.results[]` entry whose proving part is done
  (`part.expected`), with its French text (e.g. «f paire»).
- Primary «نرجعو للسؤال» closes the sheet. Opening and closing are logged (`component_event Paper open/close`).
- Not built: the «نسلّم بيه» admit-a-result row in image 10 (no such feature).

### 4.4 Exam paper screen (05, 06; 07's marks without any gating)
From the picker card's quiet «شوف الورقة», before starting: the whole exercise as printed.
- Header in reading order: back (→) at the right, «Exercice n», the «p نقاط» tag (only when `paper.points`
  is set) and «مسودّة». No difficulty, duration or page count (no such data; the sheet scrolls).
- One white sheet on the Cahier grid, French LTR in STIX: the source line (small spaced capitals, from
  `paper.source`, never an emblem), «Exercice n (p points)» underlined, the statement, each part's underlined
  heading and intro, numbered questions «1)» with hanging «a) b) c)». Formulas are their own LTR lines.
- Marks: ✓ (green circle) on done questions, the current one highlighted with a dot; a question without
  transcribed wording shows only its label and «قريبا». Built-later questions with wording carry no mark.
- Bottom: the picker card's own primary button («كمّل من X» / «نبداو»). No lock, Premium or free-question
  link (not in scope). Content: `paper.parts[].questions[].subs[]` (schema.ts); the picker chips and the
  «الورقة» sheet show only the parts the app teaches (`appPaperParts`, src/content/paper.ts).

### 4.5 «ابدا من جديد» (start the exercise from scratch)
A quiet link under the primary button of a picker card and of the paper screen, only when the exercise has a
done part; never inside lessons. It opens a small dialog: «تحب تبدا التمرين هذا من جديد؟ العلامات متاع التقدّم
باش تتمسح.», «لا» (filled ink, the screen-reader focus, first in reading order) and «ابدا من جديد» (outlined, red
text: said in words, not by colour alone). Tapping outside or the back gesture cancels. Confirming refreshes the
screen at once (D25: progress reset, history kept).

## 5. Behaviour the design must keep
- PredictReveal holds the lesson until one tap and hides its verdict before it. It stays one tap
  (image 04 shows «نثبّت» under a prediction: not copied).
- Help buttons appear only when authored content exists (planner `helpTargets`).
- The line editor and its keys work exactly as in docs/EDITOR.md.
- «نرجعو للسؤال» floating button appears only after 2 s off screen.
- Math is LTR, isolated, in its own run or block. Digits and formulas never share a line with Arabic words.
- Every interaction still emits its event. testIDs and a11y labels used by tests stay.

## 6. Paper grid
The Cahier squared paper of the mockups (01, 02, 04, 09) is the default (product owner, 2026-10-21; D24):
22 pt squares, 1 pt lines in `gridLine` #DDE5F3 on `paper` #F2F5FB (1.16:1, decorative, as measured in
the mockups: 2 px lines every 44 px at 2×). Drawn once (`PaperBackground`, react-native-svg) as a fixed,
non-scrolling background behind the lesson feed, the picker and the «الورقة» sheet; never re-rendered by
feed updates (tested). White cards stay solid. Not behind the keypad or the line editor's own ruled page.
`theme.layout.paperStyle` falls back to `'flat'` if a measurement shows a real problem (cheap Android
not measured yet). `-devPaper flat|grid|ruled` compares in debug builds.

## 7. Dev mode and test mode
Dev mode is off on every launch. It is turned on only by the launch argument `-devMode on` or by a 2 s
long-press on the screen title, for that session only (in memory). It is debug builds only, as today. It shows the 5 dev
tabs, the LLM status line, the stored-events line and the event counters / export buttons.
`-devPart X` opens part X directly in normal mode (no dev chrome). The screenshot arguments
`-devTab` and `-devComponent` open a dev tab and so turn dev mode on. `-devTools 1` is replaced by `-devMode on`.

## 8. RTL notes
The app layout stays LTR (no forced RTL, D3). In that layout `start/end` equals `left/right`, so
D5 changes only places where the side is part of the meaning (rails, tabs, gutters, the jump button,
the bubble alignment, the margin line). It makes the reading side explicit with
named theme roles (e.g. `layout.readingStart = 'right'`) instead of scattering `left`/`right` strings.

Built in D5 (`src/theme/sides.ts`, guarded by `__tests__/readingSides.test.js`):
- `theme.reading`: `row` (children listed in reading order, first = rightmost), `startAlign` /
  `endAlign`, `startEdge(v)` / `endEdge(v)` (right / left).
- `theme.mathSide`: math and exam-paper lines, always LTR (`row`, `startEdge` = left, `endEdge` = right):
  the notebook margin line, the undo chip above the line's end, the «الورقة» question rows and proven results.
- The feed, the line editor and the app screens use no physical `left` / `right` / `marginLeft`… keys and
  no bare `'row-reverse'` (the test fails). LTR math / data components (tables, charts, slider), decorative
  corners (chip and urn badges, sheet radii) and dev demo screens keep physical sides.
- Option ✓ / ✗ marks sit at the reading end (left), after the label.
- A formula wider than its card scrolls sideways in its own LTR line (`ScrollingMath`, the line-editor
  pattern), centred when it fits; scrolling is on only when it is wider, so a short formula never takes the
  feed's vertical swipe. Off inside ask chips and option buttons.
