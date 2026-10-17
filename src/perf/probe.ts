/**
 * Render probe: counts renders of named views and records React Profiler
 * commit times, so "a tap does not re-render the feed" is measured, not assumed
 * (CLAUDE.md performance targets). Dev builds only; a no-op in release.
 * Read it on a device from the "Proba" demo tab (perf panel).
 */
import type { ProfilerOnRenderCallback } from 'react';

export interface Commit {
  id: string;
  phase: string;
  /** ms spent rendering the committed subtree (React's actualDuration). */
  ms: number;
}

const MAX_COMMITS = 200;

class RenderProbe {
  enabled = typeof __DEV__ !== 'undefined' && __DEV__;
  private counts = new Map<string, number>();
  private commits: Commit[] = [];
  private listeners = new Set<() => void>();
  private scheduled = false;
  /** Bumped on every notification (useSyncExternalStore snapshot). */
  version = 0;

  /** Call from a component body. */
  count(name: string) {
    if (this.enabled) {
      this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
    }
  }

  private layouts = new Map<string, number>();

  /** Last measured height of a named view (pt). */
  layout(name: string, height: number) {
    if (this.enabled) {
      this.layouts.set(name, Math.round(height));
    }
  }

  heights(): Record<string, number> {
    return Object.fromEntries(this.layouts);
  }

  renders(name: string): number {
    return this.counts.get(name) ?? 0;
  }

  onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    if (!this.enabled) {
      return;
    }
    this.commits.push({ id, phase, ms: actualDuration });
    if (this.commits.length > MAX_COMMITS) {
      this.commits.shift();
    }
    // Notify after the commit, never during it.
    if (!this.scheduled) {
      this.scheduled = true;
      setTimeout(() => {
        this.scheduled = false;
        this.version += 1;
        for (const l of this.listeners) {
          l();
        }
      }, 0);
    }
  };

  /** Update commits (taps, drags) per profiler id: count, median and max ms. */
  stats(): { id: string; n: number; medianMs: number; maxMs: number }[] {
    const byId = new Map<string, number[]>();
    for (const c of this.commits) {
      if (c.phase !== 'mount') {
        byId.set(c.id, [...(byId.get(c.id) ?? []), c.ms]);
      }
    }
    return [...byId.entries()].map(([id, ms]) => {
      const sorted = [...ms].sort((a, b) => a - b);
      return {
        id,
        n: ms.length,
        medianMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
        maxMs: sorted[sorted.length - 1] ?? 0,
      };
    });
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  reset() {
    this.counts.clear();
    this.commits = [];
    this.version += 1;
    for (const l of this.listeners) {
      l();
    }
  }
}

export const probe = new RenderProbe();
