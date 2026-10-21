# Line editor: keys and 2D rules

The structured editor (`src/lesson/lines/editor.ts`, no React) is a tree: symbols, fractions (numerator / denominator slots), powers (an exponent slot attached to the node before it) and parenthesis groups (a body slot; always a pair). Students only press keys; nothing they write is evaluated. A line is serialized for the safe parser, and the engine compares it with the previous line.

## Layout (Editor v2, Phase 1)
```
[ ← ] [ ↑ ] [ ↓ ] [ → ] [ ⌫ ]      arrows
[ ↶ تراجع ] [ ↷ ] [ وسّع ] [ ▾ ]    tools (undo is named; ▾ folds the symbol rows)
[          ✓ نثبّت          ]
[ x ] [ e ] [▭⁄▭] [□ⁿ] [( )] [ ) ]  symbols: as many 44 pt keys per row as the card holds
[ + ] [ − ] [ × ] [ 1 ] [ 2 ]       (2 pt gaps: 6 per row at 280 pt, 7 at 323 pt)
```
The variable `x` (and `e`) is the italic math-font letter on keys and in the line; multiplication is `×` with space around it (as + and −).

## Typing
- **Exponents** never swallow the rest of a line: `+`, `×` and the fraction key leave the exponent first; `−` stays inside only at the start of the exponent (e^{−x}), elsewhere it leaves too; digits, letters, power and `( )` stay inside; `→` always leaves it.
- **Fraction key in a denominator** (kept, product owner, 2026-10-21): it wraps the term on its left like anywhere else, so nested fractions such as (1/u)/(1+1/u²) stay typable; the undo chip («تزاد كسر · تراجع») is shown, and ⌫ in the new empty denominator dissolves it.
- **Fraction key**, no selection: wraps the term left of the cursor (back to the last `+` or `−` of the slot) as the numerator, cursor in the denominator; with nothing there, an empty fraction. (A fraction inside an exponent cannot be typed.)
- **`)`** leaves the nearest parenthesis group (shown with the `( )` key).

## Deleting (⌫)
- **Before the cursor there is something:** ⌫ deletes one piece: a symbol, or a whole power, group or fraction (one piece each).
- **At the start of a slot that has content** (numerator, denominator, exponent, parentheses): ⌫ deletes nothing; the cursor steps out to the left of the structure.
- **In an empty slot:** ⌫ dissolves the structure and keeps what is left: an empty denominator gives the numerator back inline (cursor at its end); an empty numerator gives the denominator back (cursor before it); empty parentheses go away; an empty exponent removes the power and keeps its base.
- So a slot is emptied one piece at a time, then the next ⌫ dissolves its structure.

## Moving
- `←` / `→`: one place; at a structure, they step into it (← enters at its end, → at its start); at a slot edge they leave it (→ from a numerator goes to its denominator). In an exponent, `→` always leaves.
- `↓`: innermost structure first, from the cursor outwards: in an exponent, back to its base (cursor right after the base); in a numerator, to the end of its denominator; otherwise nothing.
- `↑`: if a power is just after or just before the cursor, into its exponent (at its end); else, from a denominator to the end of its numerator (innermost first); otherwise nothing.
- **Tap**: on a symbol, the cursor goes right after it; on a slot (an empty box, or around its content), to the end of that slot. Touch area of a symbol: the glyph plus 3 pt left/right and 8 pt above/below (`editor.tapSlop`).

## Selecting and wrapping (Phase 1: widen only; the "تحديد" mode is not built)
- **Atoms**: a number (a run of digits), a letter, a sign, a group or a fraction, each with the powers that follow it (e^{2x} is one atom).
- **وسّع (widen)**: no selection: the atom left of the cursor (a sign alone is skipped: after "1+x+" it takes x; at the start of a slot, the atom right of it; in an empty slot, the structure around it). Each press widens: the term (back and forward to the nearest `+` / `−`), then the whole slot, then the structure around the slot as an atom of the outer slot (an exponent's power with its base). It works inside out, so from inside an exponent it first selects there.
- **Signs stay outside a wrap** (product owner, 2026-10-21): a trailing sign, and a leading + or ×, is left outside the new fraction or parentheses ("1+x+" -> (1+x)/□ +); a leading − stays inside (−x is one thing). Widen's term and whole-slot steps stop before a trailing sign. Only signs selected: as if nothing was. The fraction key right after a sign ("2×") inserts an empty fraction after it.
- With a selection: the fraction key makes it the numerator (cursor in the empty denominator); `( )` puts it in parentheses (cursor after them); `⌫` deletes it; `←` / `→` collapse it to its start / end; any other key ends it and acts right after it (nothing is replaced).
- The wrapped part is outlined for 0.8 s (`editor.flashMs`); with reduce motion on, the outline does not blink: it stays until the next key.

## Undo / redo
Every key that changes the line (not cursor moves) saves the previous state; `↶ تراجع` / `↷` walk the history (50 states). Undo restores the exact state before the change: the line, the cursor and the selection (e.g. the widened part before a wrap). A new edit clears redo; an accepted line clears the history. The history is not part of the card's snapshot (reports, restore after a detour).

After a structural change (a fraction, power or parentheses added, a wrap, or a structure removed by ⌫), a chip above the end of the field names it with `تراجع` ("تزاد كسر · تراجع") for 4 s (`editor.undoChipMs`); a tap is the same as the undo key. It goes with the next key. It sits above the field, so nothing moves under the student's finger and the cursor stays visible.

## Copying the previous line
While the field is empty, «⧉ نسخ السطر السابق» sits inside it: it copies the last accepted line, or the start expression when there is none (the expression only, without its "f(−x) =" label), as editable math with the cursor at the end. It is undoable and logged as `line_copied { from: last_line | start }` (an input, not an answer). A line checked with exactly the same writing as the previous one (term order included; only redundant parentheses ignored) is not a new line: «هذا نفس السطر، بدّل حاجة.», logged `unchanged_line`, neither right nor wrong, not a hint; the note goes with the next key. Presses (tests): line 1 from a copy of the start 16 (24 typed); line 2 from a copy of line 1 19 (10 typed: retyping is shorter there).

## Checking
`✓` checks the line. Unreadable lines are named and the spot is marked (empty slot, two signs in a row, a sign at the start (− allowed) or end, a power on nothing), logged as `invalid_input { reason }`, never graded; the warning goes away with the next key. Every key press is in the logged `input_trace`.

## Backlog for the redesign (not now)
Fraction key icon (stacked box, bar, box); undo / redo glyphs; key widths in the last symbol row; the dev status line mixes Arabic labels and Latin values.

