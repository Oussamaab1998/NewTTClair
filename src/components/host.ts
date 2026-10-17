/**
 * What the host hands to every registered view, on top of the contract's
 * ComponentHostProps (docs/COMPONENTS_CONTRACT.md).
 */
import { useCallback, type Ref } from 'react';

import type {
  ComponentHandle,
  ComponentHostProps,
  ComponentName,
  JsonObject,
} from './contract';

export interface ViewProps<P> extends ComponentHostProps<P> {
  instanceId: string;
  /** Recorded state to show (replay, or a past answer). Each view validates it. */
  snapshot?: JsonObject;
  /** Task components: show the engine's answer (end of the hint ladder). */
  showSolution?: boolean;
  /** State supplied by the lesson (progressive LawBuilder: cells filled by solved EventPickers). */
  lessonState?: JsonObject;
  ref?: Ref<ComponentHandle>;
}

export type Emit = (name: string, payload: JsonObject) => void;

/** Emits component events in interactive mode only (readonly/replay have no side effects). */
export function useEmit<P>(component: ComponentName, p: ViewProps<P>): Emit {
  const { mode, onEvent, instanceId } = p;
  return useCallback(
    (name, payload) => {
      if (mode === 'interactive') {
        onEvent({ component, instanceId, name, payload, ts: Date.now() });
      }
    },
    [component, instanceId, mode, onEvent],
  );
}
