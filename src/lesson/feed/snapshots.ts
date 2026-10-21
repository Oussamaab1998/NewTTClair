/**
 * Mounted components' `getStateSnapshot()` handles, by block id (docs/AMENDMENTS.md
 * A3: ask and long-press send the component snapshot with the question; reports
 * attach the reported block's snapshot). UI-side only: the reducer receives the
 * collected snapshot inside the action, so it stays pure.
 */
import { createContext, type RefObject } from 'react';

import type { ComponentHandle, JsonObject } from '../../components/contract';

/** Serialized size limit of one attached snapshot (UTF-16 code units). */
export const SNAPSHOT_MAX_CHARS = 2048;

/** Valid JSON, at most SNAPSHOT_MAX_CHARS; too big -> its top-level keys only. */
export function capSnapshot(
  value: unknown,
  max = SNAPSHOT_MAX_CHARS,
): JsonObject | undefined {
  let text: string;
  try {
    text = JSON.stringify(value ?? null);
  } catch {
    return { truncated: true, reason: 'not_serializable' };
  }
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }
  if (text.length <= max) {
    return parsed as JsonObject;
  }
  return {
    truncated: true,
    keys: Object.keys(parsed).slice(0, 20),
    chars: text.length,
  };
}

interface Entry {
  component: string;
  handle: RefObject<ComponentHandle | null>;
  /** Registration order: the latest visual is the one the student just saw. */
  seq: number;
}

export class SnapshotRegistry {
  private entries = new Map<string, Entry>();
  private seq = 0;

  register(
    blockId: string,
    component: string,
    handle: RefObject<ComponentHandle | null>,
  ) {
    this.seq += 1;
    this.entries.set(blockId, { component, handle, seq: this.seq });
  }

  unregister(blockId: string, handle: RefObject<ComponentHandle | null>) {
    if (this.entries.get(blockId)?.handle === handle) {
      this.entries.delete(blockId);
    }
  }

  /** One block's snapshot (capped), or undefined when it has no component. */
  snapshotOf(blockId: string): JsonObject | undefined {
    const e = this.entries.get(blockId);
    const snap = e?.handle.current?.getStateSnapshot();
    return snap === undefined
      ? undefined
      : capSnapshot({ component: e!.component, state: snap });
  }

  /**
   * For ask / long-press: the active card's component (if any) and the most
   * recently mounted other component, capped together.
   */
  collect(activeBlockId?: string): JsonObject | undefined {
    const out: Record<string, unknown> = {};
    if (activeBlockId !== undefined) {
      const a = this.entries.get(activeBlockId);
      const s = a?.handle.current?.getStateSnapshot();
      if (a && s) {
        out.active = { component: a.component, state: s };
      }
    }
    const last = [...this.entries.entries()]
      .filter(([id]) => id !== activeBlockId)
      .sort((x, y) => y[1].seq - x[1].seq)[0];
    const ls = last?.[1].handle.current?.getStateSnapshot();
    if (last && ls) {
      out.lastVisual = {
        blockId: last[0],
        component: last[1].component,
        state: ls,
      };
    }
    return Object.keys(out).length > 0 ? capSnapshot(out) : undefined;
  }
}

export const SnapshotContext = createContext<SnapshotRegistry | null>(null);
