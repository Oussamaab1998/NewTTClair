import React, { Profiler, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Experiment } from '../engine/calls';
import { ToneBlock } from '../lesson/feed/Bubbles';
import { probe } from '../perf/probe';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentMode,
  ComponentName,
  ComponentResult,
  ComponentSpec,
  JsonObject,
} from './contract';
import type { ViewProps } from './host';
import { ComplementView } from './probability/ComplementView';
import { EventPicker } from './probability/EventPicker';
import { LawBuilder } from './probability/LawBuilder';
import { LawChart } from './probability/LawChart';
import { OutcomeSpace } from './probability/OutcomeSpace';
import { Urn } from './probability/Urn';
import { resolveSpec } from './registry';

type AnyView = (p: ViewProps<never>) => React.ReactNode;

/** Registered names -> views. Must list exactly the names in REGISTRY (tested). */
export const VIEWS: Partial<Record<ComponentName, AnyView>> = {
  Urn: Urn as AnyView,
  OutcomeSpace: OutcomeSpace as AnyView,
  EventPicker: EventPicker as AnyView,
  ComplementView: ComplementView as AnyView,
  LawBuilder: LawBuilder as AnyView,
  LawChart: LawChart as AnyView,
};

export type ComponentErrorReason =
  | 'unknown_component'
  | 'invalid_props'
  | 'runtime_error';

export interface ComponentHostProps {
  spec: ComponentSpec;
  /** Used when the spec has no instanceId (e.g. the content blockId). */
  defaultInstanceId: string;
  mode: ComponentMode;
  experiment?: Experiment;
  onEvent: (e: ComponentEvent) => void;
  onResult?: (r: ComponentResult) => void;
  onError: (
    component: string,
    reason: ComponentErrorReason,
    detail: string,
  ) => void;
  snapshot?: JsonObject;
  showSolution?: boolean;
  lessonState?: JsonObject;
  handleRef?: React.Ref<ComponentHandle>;
}

/**
 * Validates a spec against the registry and renders its view (contract rule 2):
 * unknown component, invalid props or a render error -> neutral fallback +
 * `component_error`, never a crash. Each view is profiled (perf probe).
 */
export function ComponentHost(p: ComponentHostProps) {
  const { i18n } = useTranslation();
  const { spec, experiment, onError } = p;
  const resolved = useMemo(
    () => resolveSpec(spec, experiment),
    [spec, experiment],
  );
  const View = resolved.ok ? VIEWS[resolved.name] : undefined;

  useEffect(() => {
    if (!resolved.ok) {
      onError(spec.component, resolved.reason, resolved.detail);
    } else if (!View) {
      onError(spec.component, 'unknown_component', 'no view registered');
    }
    // Report once per spec.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  if (!resolved.ok || !View) {
    return <Fallback />;
  }
  const locale = i18n.language === 'fr' ? 'fr' : 'ar-TN';
  return (
    <ErrorBoundary
      onError={detail => onError(spec.component, 'runtime_error', detail)}
    >
      <Profiler id={resolved.name} onRender={probe.onRender}>
        <View
          props={resolved.props as never}
          mode={p.mode}
          locale={locale}
          instanceId={spec.instanceId ?? p.defaultInstanceId}
          onEvent={p.onEvent}
          {...(p.onResult && { onResult: p.onResult })}
          {...(p.snapshot && { snapshot: p.snapshot })}
          {...(p.showSolution !== undefined && {
            showSolution: p.showSolution,
          })}
          {...(p.lessonState && { lessonState: p.lessonState })}
          {...(p.handleRef && { ref: p.handleRef })}
        />
      </Profiler>
    </ErrorBoundary>
  );
}

function Fallback() {
  return (
    <ToneBlock
      tone="info"
      message="componentFallback"
      testID="component-fallback"
    />
  );
}

interface BoundaryProps {
  onError: (detail: string) => void;
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  BoundaryProps,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    this.props.onError(String(error.message).slice(0, 480));
  }

  override render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
