/**
 * Debug builds only: the last model outputs, as returned, for the dev screen
 * (so the Arabic can be read and judged), with the pipeline's verdict.
 * In memory; never logged, queued or exported.
 */
export interface RawEntry {
  requestId: string;
  purpose: 'plan' | 'tutor';
  model: string;
  outcome: string;
  /** Guard / schema / verification codes. */
  reasons: string[];
  raw: string;
}

export const RAW_KEEP = 10;

export class DevRawLog {
  private entries: RawEntry[] = [];
  private readonly listeners = new Set<() => void>();

  add(e: RawEntry) {
    this.entries = [...this.entries, e].slice(-RAW_KEEP);
    for (const l of this.listeners) {
      l();
    }
  }

  all(): readonly RawEntry[] {
    return this.entries;
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
