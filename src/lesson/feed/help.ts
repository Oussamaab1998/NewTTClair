import { createContext } from 'react';

import type { HelpTargets } from '../../planner/rules';

/**
 * "Change method" / "easier" on the active card: shown only when the planner
 * would answer with authored content (never a hint, never the teacher note
 * first). null: no active card, or not known yet.
 */
export const HelpContext = createContext<HelpTargets | null>(null);
