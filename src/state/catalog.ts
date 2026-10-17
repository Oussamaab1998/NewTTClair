/**
 * Maps logged step ids to skills, per content version (events carry
 * `contentVersion`, not skills: DATA.md §2). Steps of an unknown version get
 * no skills: their evidence is kept per step but never attached to a skill.
 */
import { stepKey, type LoadedExercise } from '../content/loader';
import type { VariantKind } from '../content/schema';

export interface StepInfo {
  skills: readonly string[];
  scope: 'main' | 'mini' | 'variant';
  questionId?: string;
  /** Main steps: their deep dive (the "ما نعرفش" content). */
  deepDiveId?: string;
  variantKind?: VariantKind;
  representation?: string;
  hintCount: number;
}

export interface MisconceptionInfo {
  skillId: string;
  category: 'math' | 'writing';
}

export interface Catalog {
  /** contentVersion -> stepKey -> info. */
  versions: Map<string, Map<string, StepInfo>>;
  misconceptions: Map<string, MisconceptionInfo>;
  /** Deep dive id -> skills of its mini question. */
  deepDiveSkills: Map<string, readonly string[]>;
  variantSkills: Map<string, readonly string[]>;
}

export function emptyCatalog(): Catalog {
  return {
    versions: new Map(),
    misconceptions: new Map(),
    deepDiveSkills: new Map(),
    variantSkills: new Map(),
  };
}

/** Adds one loaded exercise (its current content version) to a catalog. */
export function addExercise(catalog: Catalog, loaded: LoadedExercise): Catalog {
  const ex = loaded.exercise;
  const steps = new Map<string, StepInfo>();
  for (const q of ex.parts) {
    for (const g of q.groups) {
      for (const s of g.steps) {
        steps.set(stepKey.main(q.id, s.id), {
          skills: s.skills,
          scope: 'main',
          questionId: q.id,
          ...('deepDiveId' in s &&
            s.deepDiveId !== undefined && { deepDiveId: s.deepDiveId }),
          hintCount: 'hints' in s ? s.hints?.length ?? 0 : 0,
        });
      }
    }
  }
  for (const d of ex.deepDives) {
    const skills = d.mini?.skills ?? [];
    catalog.deepDiveSkills.set(d.id, skills);
    if (d.mini) {
      steps.set(stepKey.mini(d.id), {
        skills,
        scope: 'mini',
        hintCount: d.mini.hints?.length ?? 0,
      });
    }
  }
  for (const v of ex.variants) {
    catalog.variantSkills.set(v.id, v.step.skills);
    steps.set(stepKey.variant(v.id), {
      skills: v.step.skills,
      scope: 'variant',
      variantKind: v.kind,
      representation: v.representation,
      hintCount: 'hints' in v.step ? v.step.hints?.length ?? 0 : 0,
    });
  }
  catalog.versions.set(ex.contentVersion, steps);
  for (const [id, m] of loaded.misconceptions) {
    catalog.misconceptions.set(id, {
      skillId: m.skillId,
      category: m.category,
    });
  }
  return catalog;
}

export function catalogFor(...loaded: LoadedExercise[]): Catalog {
  return loaded.reduce(addExercise, emptyCatalog());
}

/** The catalog key of a logged step: main steps are `question/step`; minis and variants keep their id. */
export function eventStepKey(e: {
  questionId: string;
  stepId: string;
}): string {
  return e.stepId.startsWith('dd:') || e.stepId.startsWith('var:')
    ? e.stepId
    : stepKey.main(e.questionId, e.stepId);
}

export function stepInfo(
  catalog: Catalog,
  e: { contentVersion: string; questionId: string; stepId: string },
): StepInfo | undefined {
  return catalog.versions.get(e.contentVersion)?.get(eventStepKey(e));
}
