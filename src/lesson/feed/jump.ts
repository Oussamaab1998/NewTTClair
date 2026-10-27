/** The current card is out of view (above or below): show "back to the question". */
export function isAway(
  card: { y: number; height: number } | undefined,
  view: { offset: number; height: number },
): boolean {
  return (
    card !== undefined &&
    view.height > 0 &&
    (card.y > view.offset + view.height || card.y + card.height < view.offset)
  );
}

/**
 * The help chips just appeared under the current card (2026-10-22): the
 * scroll offset that brings the card's bottom (its footer with the chips)
 * into view, plus `margin`, but never past the card's top (the question
 * stays in view on a tall card). null when nothing should move: the student
 * scrolled by hand since the last feed item (their reading place wins), the
 * footer is already visible, or the layout is not known yet.
 */
export function footerScrollY(
  card: { y: number; height: number } | undefined,
  view: { offset: number; height: number },
  userScrolled: boolean,
  margin: number,
): number | null {
  if (userScrolled || card === undefined || view.height <= 0) {
    return null;
  }
  const bottom = card.y + card.height + margin;
  const visible =
    bottom <= view.offset + view.height && bottom - 2 * margin >= view.offset;
  if (visible) {
    return null;
  }
  // Never past the card top: on a tall card the question stays readable and
  // the chips may stay below the fold (product owner, 2026-10-22).
  const y = Math.max(0, Math.min(bottom - view.height, card.y));
  return y === view.offset ? null : y;
}
