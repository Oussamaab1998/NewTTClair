/**
 * Horizontal scroll of a typed line wider than its field: keep the cursor in
 * view with a margin on the side it moves to (typing at the end, ← back to the
 * start). Null: the cursor is already in view, no scroll.
 */
export function scrollForCursor(
  cursorX: number,
  scrollX: number,
  viewWidth: number,
  margin: number,
): number | null {
  if (viewWidth <= 0) {
    return null;
  }
  if (cursorX - margin < scrollX) {
    return Math.max(0, cursorX - margin);
  }
  if (cursorX + margin > scrollX + viewWidth) {
    return cursorX + margin - viewWidth;
  }
  return null;
}
