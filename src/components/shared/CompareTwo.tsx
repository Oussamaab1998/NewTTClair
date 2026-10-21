import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { z } from 'zod';

import { JsonObjectSchema, type ComponentHandle } from '../contract';
import type { ViewProps } from '../host';
import { RichView } from '../../lesson/feed/RichView';
import { Panel } from '../probability/ui';
import type { CompareTwoProps } from './schemas';
import { theme } from '../../theme';

const SnapshotSchema = z.object({
  left: JsonObjectSchema.optional(),
  right: JsonObjectSchema.optional(),
});

/**
 * Two cases, one above the other (a phone is too narrow for two plots side
 * by side). Each inner component logs its own events.
 */
export function CompareTwo(p: ViewProps<CompareTwoProps>) {
  const { left, right, leftLabel, rightLabel, insight } = p.props;
  const initial = useMemo(() => {
    const s = SnapshotSchema.safeParse(p.snapshot);
    return s.success ? s.data : {};
    // Initial state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leftRef = useRef<ComponentHandle>(null);
  const rightRef = useRef<ComponentHandle>(null);

  useImperativeHandle(
    p.ref,
    () => ({
      getStateSnapshot: () => {
        const l = leftRef.current?.getStateSnapshot();
        const r = rightRef.current?.getStateSnapshot();
        return { ...(l && { left: l }), ...(r && { right: r }) };
      },
    }),
    [],
  );

  return (
    <Panel testID={`compare-${p.instanceId}`}>
      {leftLabel && (
        <RichView rich={leftLabel} fontSize={theme.font.size.body} />
      )}
      {p.renderInner?.(left, 'left', {
        ref: leftRef,
        ...(initial.left && { snapshot: initial.left }),
      })}
      {rightLabel && (
        <RichView rich={rightLabel} fontSize={theme.font.size.body} />
      )}
      {p.renderInner?.(right, 'right', {
        ref: rightRef,
        ...(initial.right && { snapshot: initial.right }),
      })}
      {insight && (
        <RichView
          rich={insight}
          fontSize={theme.font.size.body}
          testID="compare-insight"
        />
      )}
    </Panel>
  );
}
