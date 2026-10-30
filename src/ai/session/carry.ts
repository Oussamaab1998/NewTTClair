/**
 * What carries from one question to the next of the same exercise: the
 * nodes he earned with his own lines (Question 2 reuses the total of
 * Question 1, Question 3 reuses P(A)). Short text for the first message.
 */
import type { SessionState } from './state';

export function carriedSummary(states: readonly SessionState[]): string | null {
  const parts: string[] = [];
  for (const s of states) {
    const lines = s.lines
      .filter(
        l =>
          l.graph === 'main' &&
          l.match !== null &&
          'node' in l.match &&
          (l.match.verdict === 'credit' || l.match.verdict === 'support'),
      )
      .map(l => {
        const node = l.match && 'node' in l.match ? l.match.node : '?';
        return `${node} = ${l.verdict.value ?? '?'} (his line ${l.raw})`;
      });
    if (lines.length > 0) {
      parts.push(`question ${s.questionId}: ${lines.join('; ')}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : null;
}
