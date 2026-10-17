/**
 * Rebuilds student actions from the event log. If replaying them gives the
 * same feed, every state-changing interaction was logged (CLAUDE.md rule 5).
 * Events caused by a rule (with `reaction`) are effects, not actions; a `plan`
 * event is re-applied as logged (so an LLM decision replays the same).
 */
import type { JsonObject } from '../../components/contract';
import type { Event } from '../../telemetry/events';
import type { AskMode, LessonAction } from './types';

export function actionsFromEvents(events: readonly Event[]): LessonAction[] {
  const actions: LessonAction[] = [];
  let keys: string[] | undefined;
  for (const e of events) {
    const at = 0;
    switch (e.t) {
      case 'answer':
        if (e.kind === 'task') {
          const value = e.value as JsonObject;
          const { misconceptionHints } = value;
          // The reducer adds component and misconceptionHints to the details.
          const details = Object.fromEntries(
            Object.entries(value).filter(
              ([key]) => key !== 'component' && key !== 'misconceptionHints',
            ),
          );
          actions.push({
            type: 'component_result',
            correct: e.correct,
            details,
            ...(Array.isArray(misconceptionHints) && {
              misconceptionHints: misconceptionHints as string[],
            }),
            at,
          });
          break;
        }
        actions.push({
          type: 'answer',
          value:
            e.kind === 'choice'
              ? { optionId: String(e.value) }
              : { raw: String(e.value) },
          ...(keys && { keys }),
          at,
        });
        keys = undefined;
        break;
      case 'component_event':
        if (
          e.component === 'Variant' &&
          e.name === 'closed' &&
          e.payload.outcome === 'abandoned'
        ) {
          actions.push({ type: 'leave_deep_dive', at });
        } else if (
          e.component === 'NumericKeypad' &&
          e.name === 'input_trace'
        ) {
          keys = (e.payload.keys as string[] | undefined) ?? [];
        } else if (
          e.component === 'NumericKeypad' &&
          e.name === 'invalid_input'
        ) {
          actions.push({
            type: 'answer',
            value: { raw: String(e.payload.raw) },
            ...(keys && { keys }),
            at,
          });
          keys = undefined;
        }
        break;
      case 'not_sure':
        actions.push({ type: 'not_sure', at });
        break;
      case 'hint':
        if (!e.reaction) {
          actions.push({ type: 'hint', at });
        }
        break;
      case 'reveal':
        actions.push({ type: 'reveal', at });
        break;
      case 'skip':
        actions.push({ type: 'skip', reason: e.reason, at });
        break;
      case 'deepdive':
        if (e.outcome === 'abandoned') {
          actions.push({ type: 'leave_deep_dive', at });
        }
        break;
      case 'plan':
        actions.push({ type: 'apply_plan', decision: e.decision, at });
        break;
      case 'request':
        actions.push({ type: 'request', kind: e.kind, at });
        break;
      case 'clarify':
        actions.push({
          type: 'card_choice',
          purpose: 'clarify',
          choice: e.choice,
          at,
        });
        break;
      case 'self_report':
        actions.push({
          type: 'card_choice',
          purpose: 'self_report',
          choice: e.value,
          at,
        });
        break;
      case 'offer_response':
        actions.push({
          type: 'card_choice',
          purpose: e.offer,
          choice: e.accepted ? 'yes' : 'no',
          at,
        });
        break;
      case 'ask':
        if (e.via === 'longpress') {
          actions.push({
            type: 'ask_longpress',
            blockId: String(e.snapshot?.blockId),
            mode: e.mode as AskMode,
            quoted: e.quoted ?? '',
            at,
          });
        } else {
          const chipId = e.snapshot?.chipId;
          actions.push({
            type: 'ask_field',
            ...(typeof chipId === 'string' && { chipId }),
            ...(e.text !== undefined && { text: e.text }),
            at,
          });
        }
        break;
      default:
        break;
    }
  }
  return actions;
}
