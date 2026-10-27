/**
 * The app theme: the only place with style values (enforced by
 * __tests__/themeHygiene.test.js). Import `theme` and read semantic tokens,
 * e.g. `theme.color.textPrimary`, `theme.space.md`, `theme.font.size.body`.
 */
import {
  border,
  chart,
  color,
  dataSeries,
  editor,
  feed,
  feedback,
  font,
  katex,
  layout,
  offset,
  opacity,
  plot,
  radius,
  shadow,
  size,
  slider,
  space,
} from './tokens';
import { mathSide, reading } from './sides';

export type { FeedbackTone, PaperStyle } from './tokens';
export { fontFiles } from './tokens';

export const theme = {
  color,
  feed,
  feedback,
  dataSeries,
  space,
  radius,
  border,
  font,
  opacity,
  shadow,
  size,
  offset,
  chart,
  plot,
  slider,
  katex,
  editor,
  layout,
  reading,
  mathSide,
} as const;
