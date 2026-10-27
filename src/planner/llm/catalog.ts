/**
 * The component catalog the model chooses from (AI tutor v2), generated from
 * the registry: id, when to use, skills taught, what the student does, and a
 * compact props schema (fields the model may set; experiment fields and
 * LLM_PROPS_EXCLUDED removed). Only components the LLM may show (visual
 * components, plannerComponents); graded tasks stay on the lesson path.
 * Deterministic text: it is part of the cached system prompt.
 */
import { CATALOG_META } from '../../components/catalogMeta';
import type { ComponentName } from '../../components/contract';
import { REGISTRY } from '../../components/registry';
import { CONTAINER_SLOTS } from '../../components/shared/schemas';
import { LLM_PROPS_EXCLUDED, plannerComponents } from './plannerFormat';
import { zodToJsonSchema, type JsonSchema } from './strictSchema';

/** How the catalog writes Rich text (explained once in the prompt). */
export const RICH_NOTE =
  'Rich = {ar?: ({ar: string} | {fr: string})[], fr?: string, math?: string}: Arabic runs with French terms as their own runs. Spec = {component: <another catalog id, not a container>, props: <its props>}.';

/** A container slot, printed as a type name (explained in the prompt). */
const SPEC = 'Spec';

/** Filled from the exercise experiment (plannerFormat.ts). */
const EXPERIMENT_FIELDS = ['balls', 'draw', 'k'];

export interface CatalogEntry {
  id: ComponentName;
  whenToUse: string;
  teaches: string[];
  studentAction: string;
  /** Compact TypeScript-like type of the props the model may set. */
  props: string;
  /** How to fill the fragile props (CATALOG_META propsNote). */
  propsNote?: string;
}

const isObj = (v: unknown): v is JsonSchema =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const isRich = (s: JsonSchema): boolean => {
  const p = isObj(s.properties) ? Object.keys(s.properties).sort() : [];
  return p.join(',') === 'ar,fr,math';
};

/**
 * JSON Schema -> a short TypeScript-like type ("{fn: \"f_ex4\", x0?: number}").
 * `$defs` are printed once, by name; Rich text is "Rich".
 */
function typeOf(
  s: unknown,
  defs: Record<string, string>,
  root: JsonSchema,
): string {
  if (!isObj(s)) {
    return 'unknown';
  }
  if (typeof s.$ref === 'string') {
    const raw = s.$ref.replace(/^#\/\$defs\//, '').replace(/^_+/, '');
    const name = raw.replace(/^schema(\d+)$/, 'Def$1') || 'Self';
    if (!(name in defs)) {
      defs[name] = '';
      const target = (root.$defs as JsonSchema | undefined)?.[
        s.$ref.replace(/^#\/\$defs\//, '')
      ];
      defs[name] = typeOf(target, defs, root);
    }
    return name;
  }
  if (s.const === SPEC) {
    return SPEC;
  }
  if (s.const !== undefined) {
    return JSON.stringify(s.const);
  }
  if (Array.isArray(s.enum)) {
    return s.enum.map(e => JSON.stringify(e)).join('|');
  }
  const union = (s.anyOf ?? s.oneOf) as unknown[] | undefined;
  if (Array.isArray(union)) {
    return union.map(b => typeOf(b, defs, root)).join(' | ');
  }
  if (s.type === 'array') {
    const item = typeOf(s.items, defs, root);
    return /[ |]/.test(item) ? `(${item})[]` : `${item}[]`;
  }
  if (s.type === 'object' || isObj(s.properties)) {
    if (isRich(s)) {
      return 'Rich';
    }
    const props = isObj(s.properties) ? s.properties : {};
    const required = new Set((s.required as string[] | undefined) ?? []);
    const fields = Object.keys(props).map(k => {
      const p = props[k] as JsonSchema;
      const d = p.default !== undefined ? `=${JSON.stringify(p.default)}` : '';
      return `${k}${required.has(k) ? '' : '?'}: ${typeOf(p, defs, root)}${d}`;
    });
    return `{${fields.join(', ')}}`;
  }
  if (s.type === 'integer') {
    return 'int';
  }
  return typeof s.type === 'string' ? s.type : 'unknown';
}

function propsOf(id: ComponentName): string {
  const meta = REGISTRY[id];
  if (!meta) {
    throw new Error(`${id} not in registry`);
  }
  const s = zodToJsonSchema(meta.schema);
  const drop = new Set([
    ...(LLM_PROPS_EXCLUDED[id] ?? []),
    ...(meta.usesExperiment ? EXPERIMENT_FIELDS : []),
  ]);
  const properties = isObj(s.properties) ? s.properties : {};
  const slots: readonly string[] =
    CONTAINER_SLOTS[id as keyof typeof CONTAINER_SLOTS] ?? [];
  const trimmed: JsonSchema = {
    ...s,
    properties: Object.fromEntries(
      Object.entries(properties)
        .filter(([k]) => !drop.has(k))
        // Container slots hold another catalog component.
        .map(([k, v]) => [k, slots.includes(k) ? { const: SPEC } : v]),
    ),
    required: ((s.required as string[] | undefined) ?? []).filter(
      k => !drop.has(k),
    ),
  };
  const defs: Record<string, string> = {};
  const body = typeOf(trimmed, defs, s);
  const named = Object.entries(defs).map(([k, v]) => `${k} = ${v}`);
  return named.length > 0 ? `${body} where ${named.join('; ')}` : body;
}

let cached: CatalogEntry[] | null = null;

export function buildCatalog(): CatalogEntry[] {
  if (!cached) {
    cached = plannerComponents().map(id => {
      const meta = CATALOG_META[id];
      if (!meta) {
        throw new Error(`${id}: no catalog meta`);
      }
      return {
        id,
        whenToUse: meta.whenToUse,
        teaches: [...(REGISTRY[id]?.teaches ?? [])],
        studentAction: meta.studentAction,
        props: propsOf(id),
        ...(meta.propsNote && { propsNote: meta.propsNote }),
      };
    });
  }
  return cached;
}

/** The catalog as prompt text: one entry per line, compact props types. */
export function catalogText(): string {
  return buildCatalog()
    .map(
      e =>
        `- ${e.id}: ${e.whenToUse} Student: ${e.studentAction} Teaches: ${
          e.teaches.join(', ') || '(what the inner component teaches)'
        }. props: ${e.props}${e.propsNote ? ` Props rules: ${e.propsNote}` : ''}`,
    )
    .join('\n');
}
