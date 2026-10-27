/**
 * Plain JSON Schema (zod output) -> the subset Anthropic structured outputs
 * accept (`output_config.format`, json_schema). Rules from the official page
 * (platform.claude.com/docs/en/build-with-claude/structured-outputs, checked
 * 2026-10-21):
 * - supported: basic types, enum (primitives only), const, anyOf, allOf (no
 *   $ref inside), local $ref / $defs, default, required, additionalProperties
 *   false on every object, formats date-time, time, date, duration, email,
 *   hostname, uri, ipv4, ipv6, uuid, minItems 0 or 1, simple regex patterns;
 * - not supported: recursive schemas, external $ref, numeric constraints
 *   (minimum, maximum, multipleOf), string length, array constraints beyond
 *   minItems 0/1, open objects, backreferences, lookaround, \b;
 * - complexity: at most 24 optional parameters and 16 parameters with union
 *   types per request ("Schema is too complex for compilation" otherwise).
 *
 * Unlike the OpenAI strict converter, optional fields stay optional (no null
 * unions), which keeps the union count low. Constraints we strip are checked
 * again by zod on the answer; anything we cannot represent throws at build
 * time with its path.
 */
import type { JsonSchema } from './strictSchema';

export class AnthropicSchemaError extends Error {}

export const ANTHROPIC_LIMITS = { optionalParams: 24, unionParams: 16 };

const KEEP = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'anyOf',
  '$ref',
  '$defs',
  'description',
  'pattern',
  'format',
  'minItems',
]);
const STRIP = new Set([
  '$schema',
  'default',
  'title',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'maxItems',
]);
const FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'uri',
  'ipv4',
  'ipv6',
  'uuid',
]);
/** Backreferences, lookaround, word boundaries, large {n,m} ranges. */
const BAD_PATTERN = /\\[1-9]|\(\?[=!<]|\\[bB]|\{\d{3,}(,\d*)?\}|\{\d*,\d{3,}\}/;

const isObj = (v: unknown): v is JsonSchema =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function convert(node: unknown, path: string): JsonSchema {
  if (!isObj(node)) {
    throw new AnthropicSchemaError(`${path}: schema must be an object`);
  }
  const out: JsonSchema = {};
  for (const [k, v] of Object.entries(node)) {
    if (STRIP.has(k)) {
      continue;
    }
    if (k === 'oneOf') {
      // Our discriminated unions: branches are disjoint, so anyOf is equivalent.
      out.anyOf = (v as unknown[]).map((b, i) =>
        convert(b, `${path}.oneOf[${i}]`),
      );
      continue;
    }
    if (!KEEP.has(k)) {
      throw new AnthropicSchemaError(`${path}: unsupported keyword "${k}"`);
    }
    out[k] = v;
  }
  if (typeof out.minItems === 'number' && out.minItems > 1) {
    out.minItems = 1; // zod checks the real minimum on the answer
  }
  if (typeof out.format === 'string' && !FORMATS.has(out.format)) {
    throw new AnthropicSchemaError(`${path}: unsupported format ${out.format}`);
  }
  if (typeof out.pattern === 'string' && BAD_PATTERN.test(out.pattern)) {
    throw new AnthropicSchemaError(`${path}: unsupported regex feature`);
  }
  if (
    Array.isArray(out.enum) &&
    out.enum.some(e => isObj(e) || Array.isArray(e))
  ) {
    throw new AnthropicSchemaError(`${path}: complex enum value`);
  }
  if (typeof out.$ref === 'string' && !out.$ref.startsWith('#/$defs/')) {
    throw new AnthropicSchemaError(`${path}: only local $defs refs`);
  }
  if (Array.isArray(out.anyOf) && node.oneOf === undefined) {
    out.anyOf = out.anyOf.map((b, i) => convert(b, `${path}.anyOf[${i}]`));
  }
  if (isObj(out.$defs)) {
    out.$defs = Object.fromEntries(
      Object.entries(out.$defs).map(([name, d]) => [
        name,
        convert(d, `${path}.$defs.${name}`),
      ]),
    );
  }
  if (out.items !== undefined) {
    out.items = convert(out.items, `${path}.items`);
  }
  const isObject =
    out.type === 'object' ||
    (Array.isArray(out.type) && out.type.includes('object'));
  if (isObject) {
    if (
      out.additionalProperties !== undefined &&
      out.additionalProperties !== false
    ) {
      throw new AnthropicSchemaError(
        `${path}: open object or record (additionalProperties must be false)`,
      );
    }
    const props = isObj(out.properties) ? out.properties : {};
    out.properties = Object.fromEntries(
      Object.entries(props).map(([name, p]) => [
        name,
        convert(p, `${path}.${name}`),
      ]),
    );
    const required = Array.isArray(out.required)
      ? (out.required as string[]).filter(k => k in props)
      : [];
    out.required = required;
    out.additionalProperties = false;
  }
  return out;
}

export interface AnthropicSchemaStats {
  optionalParams: number;
  unionParams: number;
}

const refName = (s: JsonSchema): string | undefined =>
  typeof s.$ref === 'string' ? s.$ref.slice('#/$defs/'.length) : undefined;

/**
 * Counts what the provider limits, conservatively: every property that is not
 * required, and every property whose schema is a union (anyOf, or a type list)
 * directly or through a $ref. $defs are counted once each.
 */
export function anthropicSchemaStats(root: JsonSchema): AnthropicSchemaStats {
  const defs = isObj(root.$defs) ? root.$defs : {};
  let optionalParams = 0;
  let unionParams = 0;
  const isUnion = (s: unknown): boolean => {
    if (!isObj(s)) {
      return false;
    }
    if (Array.isArray(s.anyOf) || Array.isArray(s.type)) {
      return true;
    }
    const name = refName(s);
    return name !== undefined && isUnion(defs[name]);
  };
  const visit = (s: unknown) => {
    if (!isObj(s)) {
      return;
    }
    if (isObj(s.properties)) {
      const required = new Set((s.required as string[] | undefined) ?? []);
      for (const [k, p] of Object.entries(s.properties)) {
        if (!required.has(k)) {
          optionalParams += 1;
        }
        if (isUnion(p)) {
          unionParams += 1;
        }
        visit(p);
      }
    }
    if (Array.isArray(s.anyOf)) {
      s.anyOf.forEach(visit);
    }
    visit(s.items);
  };
  visit({ ...root, $defs: undefined });
  Object.values(defs).forEach(visit);
  return { optionalParams, unionParams };
}

/** Throws on a $ref cycle (recursive schemas are not supported). */
function checkNoRecursion(root: JsonSchema) {
  const defs = isObj(root.$defs) ? root.$defs : {};
  const refsOf = (node: unknown, acc: Set<string>): Set<string> => {
    if (Array.isArray(node)) {
      node.forEach(n => refsOf(n, acc));
    } else if (isObj(node)) {
      for (const [k, v] of Object.entries(node)) {
        if (k === '$ref' && typeof v === 'string') {
          acc.add(v === '#' ? '#' : v.slice('#/$defs/'.length));
        } else if (k !== '$defs') {
          refsOf(v, acc);
        }
      }
    }
    return acc;
  };
  if (refsOf(root, new Set()).has('#')) {
    throw new AnthropicSchemaError('root: recursive schema');
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const dfs = (name: string, path: string[]) => {
    if (state.get(name) === 'done') {
      return;
    }
    if (state.get(name) === 'visiting') {
      throw new AnthropicSchemaError(
        `recursive schema: ${[...path, name].join(' -> ')}`,
      );
    }
    state.set(name, 'visiting');
    for (const r of refsOf(defs[name], new Set())) {
      if (r === '#') {
        throw new AnthropicSchemaError(`$defs.${name}: recursive schema`);
      }
      dfs(r, [...path, name]);
    }
    state.set(name, 'done');
  };
  Object.keys(defs).forEach(n => dfs(n, []));
}

/** Plain JSON Schema -> Anthropic structured-output schema. Throws AnthropicSchemaError. */
export function toAnthropicSchema(source: JsonSchema): JsonSchema {
  if (
    source.type !== 'object' ||
    source.anyOf !== undefined ||
    source.oneOf !== undefined
  ) {
    throw new AnthropicSchemaError('root: must be an object, not a union');
  }
  const out = convert(source, 'root');
  checkNoRecursion(out);
  const stats = anthropicSchemaStats(out);
  if (
    stats.optionalParams > ANTHROPIC_LIMITS.optionalParams ||
    stats.unionParams > ANTHROPIC_LIMITS.unionParams
  ) {
    throw new AnthropicSchemaError(
      `too complex: ${stats.optionalParams} optional (max ${ANTHROPIC_LIMITS.optionalParams}), ${stats.unionParams} union (max ${ANTHROPIC_LIMITS.unionParams})`,
    );
  }
  return out;
}

const converted = new WeakMap<JsonSchema, JsonSchema>();

/** toAnthropicSchema, once per source schema object (formats are built once). */
export function anthropicSchemaFor(source: JsonSchema): JsonSchema {
  let out = converted.get(source);
  if (!out) {
    out = toAnthropicSchema(source);
    converted.set(source, out);
  }
  return out;
}
