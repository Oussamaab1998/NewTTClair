/**
 * Readable view of an exported report / question queue (JSONL from the app's
 * share sheet): one row per entry, then counts by reason and source.
 */
import type { QueueEntry } from '../../src/telemetry/reports';

const cell = (s: string, max: number) => {
  const flat = s.replace(/\s+/g, ' ').replace(/\|/g, '/');
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

export function formatReports(
  entries: readonly QueueEntry[],
  errors: readonly { line: number; issue: string }[] = [],
): string {
  const rows = entries.map((e, i) => {
    if (e.kind === 'report') {
      const ev = e.event;
      return [
        String(i + 1),
        'report',
        new Date(ev.ts).toISOString(),
        `${ev.contentVersion} ${ev.questionId}/${ev.stepId}`,
        ev.blockId,
        ev.source,
        ev.reason,
        cell(ev.text ?? '', 60),
        ev.snapshot ? 'yes' : '',
        String(e.context.lastEvents.length),
        `${e.context.device.platform} ${e.context.device.osVersion} ${e.context.device.locale}`,
      ];
    }
    if (e.kind === 'feedback') {
      const ev = e.event;
      return [
        String(i + 1),
        'feedback',
        new Date(ev.ts).toISOString(),
        `${ev.contentVersion} ${ev.questionId}`,
        '',
        '',
        ev.choice,
        cell(ev.text ?? '', 60),
        '',
        String(e.context.lastEvents.length),
        `${e.context.device.platform} ${e.context.device.osVersion} ${e.context.device.locale}`,
      ];
    }
    return [
      String(i + 1),
      'question',
      new Date(e.ts).toISOString(),
      `${e.contentVersion} ${e.questionId}/${e.stepId}`,
      '',
      '',
      '',
      cell(e.text, 60),
      e.snapshot ? 'yes' : '',
      String(e.context.lastEvents.length),
      `${e.context.device.platform} ${e.context.device.osVersion} ${e.context.device.locale}`,
    ];
  });
  const header = [
    '#',
    'kind',
    'time (UTC)',
    'content step',
    'block',
    'source',
    'reason',
    'text',
    'snapshot',
    'events',
    'device',
  ];
  const table = [header, header.map(() => '---'), ...rows]
    .map(r => `| ${r.join(' | ')} |`)
    .join('\n');
  const count = (f: (e: QueueEntry) => string | null) => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = f(e);
      if (k !== null) {
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return [...m.entries()].map(([k, v]) => `${k}: ${v}`).join(', ') || '-';
  };
  const lines = [
    table,
    '',
    `entries: ${entries.length} (reports ${
      entries.filter(e => e.kind === 'report').length
    }, questions ${
      entries.filter(e => e.kind === 'question').length
    }, feedback ${entries.filter(e => e.kind === 'feedback').length})`,
    `feedback: ${count(e => (e.kind === 'feedback' ? e.event.choice : null))}`,
    `by reason: ${count(e => (e.kind === 'report' ? e.event.reason : null))}`,
    `by source: ${count(e => (e.kind === 'report' ? e.event.source : null))}`,
  ];
  if (errors.length > 0) {
    lines.push(
      `skipped lines: ${errors.map(x => `${x.line} (${x.issue})`).join(', ')}`,
    );
  }
  return lines.join('\n');
}
