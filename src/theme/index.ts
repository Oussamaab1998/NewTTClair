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
  offset,
  opacity,
  plot,
  radius,
  shadow,
  size,
  slider,
  space,
} from './tokens';

export type { FeedbackTone } from './tokens';

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
} as const;
