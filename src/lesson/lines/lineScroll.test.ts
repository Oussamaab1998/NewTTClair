import { scrollForCursor } from './lineScroll';

describe('a long typed line keeps the cursor in view', () => {
  const view = 300;
  const margin = 16;
  it('cursor in view: no scroll', () => {
    expect(scrollForCursor(150, 0, view, margin)).toBeNull();
  });
  it('typing past the right edge scrolls just enough, with the margin', () => {
    expect(scrollForCursor(500, 0, view, margin)).toBe(216);
  });
  it('the cursor back at the start brings the start of the line in view', () => {
    expect(scrollForCursor(0, 216, view, margin)).toBe(0);
    expect(scrollForCursor(100, 216, view, margin)).toBe(84);
  });
  it('before the first layout (no width): nothing', () => {
    expect(scrollForCursor(500, 0, 0, margin)).toBeNull();
  });
});
