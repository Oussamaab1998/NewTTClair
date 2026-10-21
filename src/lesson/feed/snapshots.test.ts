import type { ComponentHandle } from '../../components/contract';
import { SNAPSHOT_MAX_CHARS, SnapshotRegistry, capSnapshot } from './snapshots';

const handle = (state: Record<string, unknown> | null) => ({
  current:
    state === null
      ? null
      : ({ getStateSnapshot: () => state } as ComponentHandle),
});

describe('capSnapshot', () => {
  it('keeps small JSON objects as they are', () => {
    expect(capSnapshot({ a: 1, b: ['x'] })).toEqual({ a: 1, b: ['x'] });
  });

  it('replaces an oversized object by its keys, under the limit', () => {
    const big = { selected: 'x'.repeat(5000), other: 1 };
    const capped = capSnapshot(big)!;
    expect(capped).toEqual({
      truncated: true,
      keys: ['selected', 'other'],
      chars: expect.any(Number),
    });
    expect(JSON.stringify(capped).length).toBeLessThanOrEqual(
      SNAPSHOT_MAX_CHARS,
    );
  });

  it('drops what is not JSON (functions, undefined) and refuses non-objects', () => {
    expect(capSnapshot({ f: () => 1, u: undefined, n: 2 })).toEqual({ n: 2 });
    expect(capSnapshot([1, 2])).toBeUndefined();
    expect(capSnapshot('x')).toBeUndefined();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(capSnapshot(cyclic)).toEqual({
      truncated: true,
      reason: 'not_serializable',
    });
  });
});

describe('SnapshotRegistry', () => {
  it('collects the active card and the latest other component', () => {
    const r = new SnapshotRegistry();
    r.register('urn-1', 'Urn', handle({ selected: [] }));
    r.register('card-7', 'EventPicker', handle({ outcomes: ['a-b'] }));
    r.register('space-2', 'OutcomeSpace', handle({ highlight: ['a-c'] }));
    expect(r.collect('card-7')).toEqual({
      active: { component: 'EventPicker', state: { outcomes: ['a-b'] } },
      lastVisual: {
        blockId: 'space-2',
        component: 'OutcomeSpace',
        state: { highlight: ['a-c'] },
      },
    });
    expect(r.snapshotOf('urn-1')).toEqual({
      component: 'Urn',
      state: { selected: [] },
    });
  });

  it('nothing mounted -> undefined; unregister only removes the same handle', () => {
    const r = new SnapshotRegistry();
    expect(r.collect()).toBeUndefined();
    const a = handle({ x: 1 });
    r.register('b1', 'Urn', a);
    r.unregister('b1', handle({ x: 2 }));
    expect(r.snapshotOf('b1')).toBeDefined();
    r.unregister('b1', a);
    expect(r.snapshotOf('b1')).toBeUndefined();
    r.register('b2', 'Urn', handle(null));
    expect(r.collect()).toBeUndefined();
  });
});
