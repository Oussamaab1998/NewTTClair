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
  feedback,
  font,
  katex,
  offset,
  opacity,
  radius,
  shadow,
  size,
  space,
} from './tokens';

export type { FeedbackTone } from './tokens';

export const theme = {
  color,
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
  katex,
} as const;
