import { footerScrollY } from './jump';

/** Approximate feed viewport heights (pt) at 360 and 390 pt width (the function is width-free; the screenshots check the real screen). */
const VIEWS = { 360: 560, 390: 600 } as const;

describe('help chips appear: scroll so the card footer is visible (2026-10-22)', () => {
  for (const [width, height] of Object.entries(VIEWS)) {
    describe(`${width} pt`, () => {
      const card = { y: 300, height: height - 100 }; // bottom 100 pt below the view
      const view = { offset: 0, height };

      it('scrolls just enough to show the card bottom (with the margin)', () => {
        expect(footerScrollY(card, view, false, 16)).toBe(
          card.y + card.height + 16 - height,
        );
      });

      it('no scroll when the student scrolled since the last feed item', () => {
        expect(footerScrollY(card, view, true, 16)).toBeNull();
      });

      it('no scroll when the footer is already in view', () => {
        expect(
          footerScrollY({ y: 100, height: 200 }, view, false, 16),
        ).toBeNull();
      });

      it('a card taller than the view: the question wins (the scroll stops at the card top)', () => {
        const tall = { y: 300, height: height * 2 };
        expect(footerScrollY(tall, view, false, 16)).toBe(tall.y);
        // Already at the card top: nothing moves (the chips stay in "⋯" too).
        expect(
          footerScrollY(tall, { offset: 300, height }, false, 16),
        ).toBeNull();
      });

      it('a card that fits: the footer comes in and the card top stays in view', () => {
        const fits = { y: 300, height: height - 40 };
        const y = footerScrollY(fits, view, false, 16)!;
        expect(y).toBeLessThanOrEqual(fits.y);
        expect(fits.y + fits.height + 16).toBeLessThanOrEqual(y + height);
      });
    });
  }

  it('a footer above the view (scrolled past by the program): back up to it', () => {
    expect(
      footerScrollY(
        { y: 0, height: 400 },
        { offset: 1000, height: 600 },
        false,
        16,
      ),
    ).toBe(0);
  });

  it('unknown layout or view: no scroll', () => {
    expect(
      footerScrollY(undefined, { offset: 0, height: 600 }, false, 16),
    ).toBeNull();
    expect(
      footerScrollY({ y: 0, height: 900 }, { offset: 0, height: 0 }, false, 16),
    ).toBeNull();
  });
});
