import { createContext } from 'react';

import type { HelpTargets } from '../../planner/rules';

/**
 * "Change method" / "easier" on the active card: shown only when the planner
 * would answer with authored content (never a hint, never the teacher note
 * first). null: no active card, or not known yet.
 */
export const HelpContext = createContext<HelpTargets | null>(null);

/**
 * Help chips (2026-10-22): the layout under the active question ("chips":
 * two quiet chips; "choice": «ما نعرفش» opens a small choice) and whether a
 * repair offer card is open (the chips hide then: no duplicate).
 */
export interface HelpUi {
  layout: 'chips' | 'choice';
  offerOpen: boolean;
  /** Debug builds (`-devHelpChoiceOpen on`): the choice starts open (screenshots). */
  choiceOpen?: boolean;
}

export const HelpUiContext = createContext<HelpUi>({
  layout: 'chips',
  offerOpen: false,
});

/**
 * The help chips appeared under this card (feed key): the feed scrolls its
 * footer into view, unless the student scrolled by hand since the last feed
 * item (jump.ts `footerScrollY`).
 */
export const FooterRevealContext = createContext<(cardKey: string) => void>(
  () => {},
);
