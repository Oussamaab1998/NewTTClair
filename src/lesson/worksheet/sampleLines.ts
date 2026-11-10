/**
 * Sample lines for tests and the demo screen: a StudentLine as the session
 * records it, read by the engine (readLine / lineVerdict), with the graph
 * match the caller chooses. Not used by the lesson itself.
 */
import { lineVerdict, readLine } from '../../ai/checks/lines';
import type { StudentLine } from '../../ai/session/state';

export function studentLine(
  id: string,
  raw: string,
  match: 'credit' | 'slip' | null,
  node = 'total',
): StudentLine {
  return {
    id,
    raw,
    turn: 1,
    graph: 'main',
    expected: null,
    verdict: lineVerdict(readLine(raw)),
    match:
      match === 'credit'
        ? {
            verdict: 'credit',
            node,
            derivation: 'd',
            unsimplified: false,
            completes: false,
          }
        : match === 'slip'
        ? { verdict: 'slip', slip: 's', node, strength: 'confirmed' }
        : null,
  };
}
