/**
 * The line pad tells the screen whether its keys are showing, so the strip
 * under the progress bar can fold to one line on a narrow phone (D46): the
 * card and the pad must both fit.
 */
import { createContext } from 'react';

export const PadOpenContext = createContext<(open: boolean) => void>(
  () => undefined,
);

/** Screens at most this wide (points) fold the strip while the pad is open. */
export const NARROW_WIDTH = 360;
