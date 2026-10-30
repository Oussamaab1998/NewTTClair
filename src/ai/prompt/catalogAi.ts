/**
 * The component catalogue as the tutor reads it: every registered component
 * (the planner's menu leaves out tasks and the probability2 pictures; the
 * tutor may use them all), with when it helps, what the student does, its
 * props, and what it would reveal. Byte-stable (part of the cached prompt).
 */
import { CATALOG_META } from '../../components/catalogMeta';
import type { ComponentName } from '../../components/contract';
import { REGISTRY } from '../../components/registry';
import { propsOf } from '../../planner/llm/catalog';

export function aiComponentNames(): ComponentName[] {
  return (Object.keys(REGISTRY) as ComponentName[])
    .filter(id => CATALOG_META[id] !== undefined)
    .sort();
}

export function aiCatalogText(): string {
  return aiComponentNames()
    .map(id => {
      const meta = CATALOG_META[id]!;
      const entry = REGISTRY[id]!;
      return [
        `- ${id} (${entry.kind}): ${meta.whenToUse}`,
        `  Student: ${meta.studentAction}`,
        `  props: ${propsOf(id)}`,
        ...(meta.propsNote ? [`  Props rules: ${meta.propsNote}`] : []),
        ...(meta.reveals && meta.reveals.length > 0
          ? [`  Reveals: ${meta.reveals.join('; ')}`]
          : []),
      ].join('\n');
    })
    .join('\n');
}
