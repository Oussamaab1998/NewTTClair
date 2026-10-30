/**
 * Skill map: skill -> prerequisite skills, and math skills vs writing habits
 * (docs/DATA.md §3). Data in skillMap.json, reviewed: false until a teacher checks it.
 */
import { z } from 'zod';

import raw from './skillMap.json';

const Id = z.string().regex(/^[A-Za-z0-9_.-]+$/);

export const SkillMapSchema = z
  .strictObject({
    contentVersion: z.string().min(1),
    reviewed: z.boolean(),
    note: z.string().optional(),
    skills: z.array(
      z.strictObject({
        id: Id,
        /** `writing`: an exam-paper habit, tracked apart from math gaps. */
        kind: z.enum(['math', 'writing']),
        requires: z.array(Id),
        /**
         * School year where the skill is taught (Tunisian system: 7b..9b
         * collège "année de base", 1s..4s lycée, 4s = bac). Draft values,
         * reviewed: false; used by the AI tutor to name old-year gaps.
         */
        year: z
          .enum(['7b', '8b', '9b', '1s', '2s', '3s', '4s'])
          .optional(),
      }),
    ),
  })
  .superRefine((m, ctx) => {
    const ids = new Set(m.skills.map(s => s.id));
    if (ids.size !== m.skills.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate skill id' });
    }
    for (const s of m.skills) {
      for (const r of s.requires) {
        if (!ids.has(r)) {
          ctx.addIssue({
            code: 'custom',
            message: `${s.id} requires unknown skill ${r}`,
          });
        }
      }
    }
    const cycle = findCycle(m.skills);
    if (cycle) {
      ctx.addIssue({
        code: 'custom',
        message: `prerequisite cycle: ${cycle.join(' -> ')}`,
      });
    }
  });
export type SkillMap = z.infer<typeof SkillMapSchema>;

function findCycle(
  skills: readonly { id: string; requires: readonly string[] }[],
): string[] | null {
  const byId = new Map(skills.map(s => [s.id, s.requires]));
  const state = new Map<string, 'open' | 'done'>();
  const path: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'done') {
      return null;
    }
    if (state.get(id) === 'open') {
      return [...path.slice(path.indexOf(id)), id];
    }
    state.set(id, 'open');
    path.push(id);
    for (const r of byId.get(id) ?? []) {
      const c = visit(r);
      if (c) {
        return c;
      }
    }
    path.pop();
    state.set(id, 'done');
    return null;
  };
  for (const s of skills) {
    const c = visit(s.id);
    if (c) {
      return c;
    }
  }
  return null;
}

export interface Skills {
  map: SkillMap;
  has(id: string): boolean;
  kind(id: string): 'math' | 'writing' | undefined;
  /** Direct prerequisites, in authored order. */
  prerequisites(id: string): readonly string[];
}

export function makeSkills(map: SkillMap): Skills {
  const byId = new Map(map.skills.map(s => [s.id, s]));
  return {
    map,
    has: id => byId.has(id),
    kind: id => byId.get(id)?.kind,
    prerequisites: id => byId.get(id)?.requires ?? [],
  };
}

/** The bundled map. Parsed at import: a broken map is a build bug, caught by tests. */
export const SKILLS: Skills = makeSkills(SkillMapSchema.parse(raw));
