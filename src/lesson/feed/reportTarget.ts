/**
 * What a Report button on a feed item refers to (docs/FEEDBACK_AND_TRUST.md):
 * a stable block id, the source, the trust label, and where to find the
 * component snapshot. Placement (product owner, 2026-10-17): always visible on
 * AI blocks and on the active question; elsewhere inside a small "..." menu.
 */
import type { JsonObject } from '../../components/contract';
import type { LessonContent } from '../session/lesson';
import { stepForRef } from '../session/lesson';
import type { FeedItem, TrustLabel } from '../session/types';

export interface ReportTarget {
  blockId: string;
  source: 'lesson' | 'ai' | 'component';
  trust: TrustLabel;
  /** Snapshot registry key (component blocks and question cards). */
  snapshotKey?: string;
  componentSpec?: JsonObject;
  /** The visible button instead of the "..." menu. */
  prominent: boolean;
  /** Feed item key (UI events). */
  itemKey: string;
  /** AI blocks: the LLM request that produced them. */
  llmRequestId?: string;
}

const reviewedCache = new WeakMap<object, Set<string>>();

/** Block ids whose authored trust says reviewed (walks the exercise JSON once). */
export function reviewedBlockIds(content: LessonContent): Set<string> {
  const ex = content.loaded.exercise;
  const cached = reviewedCache.get(ex);
  if (cached) {
    return cached;
  }
  const out = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const trust = o.trust as { reviewed?: unknown } | undefined;
      if (typeof o.blockId === 'string' && trust?.reviewed === true) {
        out.add(o.blockId);
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(ex);
  reviewedCache.set(ex, out);
  return out;
}

function lessonLabel(content: LessonContent, blockId?: string): TrustLabel {
  return blockId !== undefined && reviewedBlockIds(content).has(blockId)
    ? 'lesson_reviewed'
    : 'lesson_unreviewed';
}

/** Null for items that are not content (student bubbles, dividers). */
export function reportTarget(
  item: FeedItem,
  content: LessonContent,
): ReportTarget | null {
  const runtimeId = `rt:${content.question.id}:${item.key}`;
  const base = (blockId: string | undefined) => {
    const trust: TrustLabel = item.trust ?? lessonLabel(content, blockId);
    return {
      blockId: blockId ?? runtimeId,
      trust,
      source: (trust === 'ai_generated' ? 'ai' : 'lesson') as 'ai' | 'lesson',
      prominent: trust === 'ai_generated',
      itemKey: item.key,
      ...(item.llmRequestId !== undefined && {
        llmRequestId: item.llmRequestId,
      }),
    };
  };
  switch (item.kind) {
    case 'student':
    case 'variant_start':
    case 'deep_dive_start':
    case 'return':
    case 'done':
    case 'thinking':
      return null;
    case 'tutor':
    case 'math':
      return base(item.blockId);
    case 'component': {
      const b = base(item.blockId);
      return {
        ...b,
        source: b.source === 'ai' ? 'ai' : 'component',
        snapshotKey: item.blockId,
        componentSpec: {
          component: item.spec.component,
          props: item.spec.props,
        },
      };
    }
    case 'question': {
      const step = stepForRef(content, item.ref);
      const b = base(step.blockId);
      const isComponent = step.kind === 'component';
      return {
        ...b,
        source: isComponent ? 'component' : b.source,
        snapshotKey: item.key,
        ...(isComponent && {
          componentSpec: {
            component: step.component.component,
            props: step.component.props,
          },
        }),
        prominent: b.prominent || item.status === 'active',
      };
    }
    default:
      return base(undefined);
  }
}
