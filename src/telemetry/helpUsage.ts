/**
 * How often the help paths are used (help chips, 2026-10-22), from the event
 * log: chip taps, the card's "⋯" entries, the «ما نعرفش» choice, the repair
 * offer after a first wrong answer, and why the chips were shown. For the
 * dev panel and `npm run replay -- help-usage <log.jsonl>`, to compare with
 * real students. A `request` without `via` (older logs) came from the "⋯".
 */
import type { Event } from './events';

export interface HelpUsage {
  chip: { change: number; easier: number };
  menu: { change: number; easier: number };
  choice: {
    opened: number;
    change: number;
    easier: number;
    hint: number;
    notSure: number;
  };
  offer: { yes: number; no: number };
  shown: { wrong: number; not_sure: number; idle: number };
}

export function helpUsage(events: readonly Event[]): HelpUsage {
  const u: HelpUsage = {
    chip: { change: 0, easier: 0 },
    menu: { change: 0, easier: 0 },
    choice: { opened: 0, change: 0, easier: 0, hint: 0, notSure: 0 },
    offer: { yes: 0, no: 0 },
    shown: { wrong: 0, not_sure: 0, idle: 0 },
  };
  for (const e of events) {
    if (e.t === 'request') {
      const via = e.via ?? 'menu';
      const which = e.kind === 'simpler' ? 'easier' : 'change';
      u[via][which] += 1;
    } else if (e.t === 'offer_response' && e.offer === 'repair') {
      u.offer[e.accepted ? 'yes' : 'no'] += 1;
    } else if (e.t === 'component_event' && e.component === 'HelpChips') {
      const r = e.payload.reason;
      if (r === 'wrong' || r === 'not_sure' || r === 'idle') {
        u.shown[r] += 1;
      }
    } else if (e.t === 'component_event' && e.component === 'HelpChoice') {
      if (e.name === 'opened') {
        u.choice.opened += 1;
      } else if (e.payload.choice === 'hint') {
        u.choice.hint += 1;
      } else if (e.payload.choice === 'not_sure') {
        u.choice.notSure += 1;
      }
    }
  }
  return u;
}

/** One dev line (codes and numbers; LTR). */
export function formatHelpUsage(u: HelpUsage): string {
  return [
    `help: chip change ${u.chip.change} / easier ${u.chip.easier}`,
    `⋯ change ${u.menu.change} / easier ${u.menu.easier}`,
    `choice opened ${u.choice.opened} (change ${u.choice.change}, easier ${u.choice.easier}, hint ${u.choice.hint}, not sure ${u.choice.notSure})`,
    `offer yes ${u.offer.yes} / no ${u.offer.no}`,
    `shown wrong ${u.shown.wrong} / not sure ${u.shown.not_sure} / idle ${u.shown.idle}`,
  ].join(' · ');
}
