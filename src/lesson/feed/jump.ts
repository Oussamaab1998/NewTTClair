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
