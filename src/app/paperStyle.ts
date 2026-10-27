/**
 * The paper behind the feed, picker and «الورقة» sheet: the theme's choice
 * (DESIGN.md §6), or `-devPaper` in debug builds (comparisons, never shipped).
 */
import type * as DevOnly from './dev';
import { theme, type PaperStyle } from '../theme';

/** Debug builds only (launch arguments); Metro drops it in release. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('./dev') as typeof DevOnly)
  : null;

export const paperStyle = (): PaperStyle =>
  devOnly?.devPaperAtLaunch() ?? theme.layout.paperStyle;
