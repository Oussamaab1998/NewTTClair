/**
 * zod -> JSON Schema for OpenAI Structured Outputs in strict mode.
 * Rules from the official guide (developers.openai.com/api/docs/guides/structured-outputs,
 * "Supported schemas", checked 2026-10-17): root is an object (not anyOf); every
 * property is required (optional = union with null); additionalProperties: false on
 * every object; anyOf allowed, allOf / not / if-then-else not; $defs + $ref allowed;
 * at most 10 nesting levels, 5,000 properties, 1,000 enum values.
 *
 * The converter never loosens silently: constraints the provider does not accept
 * (minLength, maxLength, default) are stripped because zod enforces them again
 * on the answer; anything it cannot represent (records, tuples, allOf, ...) throws
 * at build time with its path.
 * `denull` undoes the optional -> nullable rewrite on the answer, and only that.
 */
import { z } from 'zod';

export type JsonSchema = { [key: string]: unknown };

export class StrictSchemaError extends Error {}

/** Kept as they are. */
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
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
]);
/** Dropped: not in the supported list, and zod checks them again on the answer. */
const STRIP = new Set([
  '$schema',
  'default',
  'minLength',
  'maxLength',
  'title',
]);
const FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

export const LIMITS = { depth: 10, properties: 5000, enumValues: 1000 };

const isObj = (v: unknown): v is JsonSchema =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** zod -> plain JSON Schema (input side: defaults make a field optional). */
export function zodToJsonSchema(
  schema: z.ZodType,
  override?: (zodSchema: unknown, json: JsonSchema) => void,
): JsonSchema {
  return z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'throw',
    ...(override && {
      override: ctx => override(ctx.zodSchema, ctx.jsonSchema as JsonSchema),
    }),
  }) as JsonSchema;
}

function nullable(s: JsonSchema): JsonSchema {
  if (allowsNull(s, {})) {
    return s;
  }
  if (
    typeof s.type === 'string' &&
    s.anyOf === undefined &&
    s.$ref === undefined &&
    s.const === undefined
  ) {
    return Array.isArray(s.enum)
      ? { ...s, type: [s.type, 'null'], enum: [...s.enum, null] }
      : { ...s, type: [s.type, 'null'] };
  }
  return { anyOf: [s, { type: 'null' }] };
}

function convert(node: unknown, path: string): JsonSchema {
  if (!isObj(node)) {
    throw new StrictSchemaError(`${path}: schema must be an object`);
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
      throw new StrictSchemaError(`${path}: unsupported keyword "${k}"`);
    }
    out[k] = v;
  }
  if (typeof out.format === 'string' && !FORMATS.has(out.format)) {
    throw new StrictSchemaError(`${path}: unsupported format ${out.format}`);
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
      throw new StrictSchemaError(
        `${path}: open object or record (additionalProperties must be false)`,
      );
    }
    const props = isObj(out.properties) ? out.properties : {};
    const required = new Set(
      Array.isArray(out.required) ? (out.required as string[]) : [],
    );
    out.properties = Object.fromEntries(
      Object.entries(props).map(([name, p]) => {
        const c = convert(p, `${path}.${name}`);
        return [name, required.has(name) ? c : nullable(c)];
      }),
    );
    out.required = Object.keys(props);
    out.additionalProperties = false;
  }
  return out;
}

/** Rejects what strict mode refuses, with the path. */
function checkLimits(root: JsonSchema) {
  let properties = 0;
  let enumValues = 0;
  const visit = (s: unknown, depth: number, path: string) => {
    if (!isObj(s)) {
      return;
    }
    if (isObj(s.properties)) {
      if (depth > LIMITS.depth) {
        throw new StrictSchemaError(
          `${path}: more than ${LIMITS.depth} levels`,
        );
      }
      for (const [k, p] of Object.entries(s.properties)) {
        properties += 1;
        visit(p, depth + 1, `${path}.${k}`);
      }
    }
    if (Array.isArray(s.enum)) {
      enumValues += s.enum.length;
    }
    if (Array.isArray(s.anyOf)) {
      s.anyOf.forEach((b, i) => visit(b, depth, `${path}.anyOf[${i}]`));
    }
    visit(s.items, depth, `${path}.items`);
    if (isObj(s.$defs)) {
      for (const [k, d] of Object.entries(s.$defs)) {
        visit(d, 1, `$defs.${k}`);
      }
    }
  };
  visit(root, 1, 'root');
  if (properties > LIMITS.properties) {
    throw new StrictSchemaError(
      `${properties} properties (max ${LIMITS.properties})`,
    );
  }
  if (enumValues > LIMITS.enumValues) {
    throw new StrictSchemaError(
      `${enumValues} enum values (max ${LIMITS.enumValues})`,
    );
  }
}

/** Plain JSON Schema -> strict-mode schema. Throws StrictSchemaError. */
export function toStrictSchema(source: JsonSchema): JsonSchema {
  if (
    source.type !== 'object' ||
    source.anyOf !== undefined ||
    source.oneOf !== undefined
  ) {
    throw new StrictSchemaError('root: must be an object, not a union');
  }
  const out = convert(source, 'root');
  checkLimits(out);
  return out;
}

// ---------------------------------------------------------------------------
// Answer side.

type Defs = Record<string, unknown>;

function resolve(s: unknown, root: JsonSchema): JsonSchema | undefined {
  let cur = s;
  for (let i = 0; i < 8 && isObj(cur) && typeof cur.$ref === 'string'; i += 1) {
    const ref = cur.$ref;
    if (ref === '#') {
      cur = root;
    } else if (ref.startsWith('#/$defs/')) {
      cur = (root.$defs as Defs | undefined)?.[ref.slice('#/$defs/'.length)];
    } else {
      return undefined;
    }
  }
  return isObj(cur) ? cur : undefined;
}

/** Does the ORIGINAL schema accept null here (a real null, kept by denull)? */
function allowsNull(s: unknown, root: JsonSchema): boolean {
  const r = isObj(s) && s.$ref !== undefined ? resolve(s, root) : s;
  if (!isObj(r)) {
    return false;
  }
  if (Object.keys(r).length === 0) {
    return true; // {} accepts anything
  }
  if (r.type === 'null' || (Array.isArray(r.type) && r.type.includes('null'))) {
    return true;
  }
  if (r.const === null || (Array.isArray(r.enum) && r.enum.includes(null))) {
    return true;
  }
  return branches(r)?.some(b => allowsNull(b, root)) ?? false;
}

/** Union branches: anyOf, or oneOf in the original (pre-conversion) schema. */
function branches(s: JsonSchema): unknown[] | undefined {
  if (Array.isArray(s.anyOf)) {
    return s.anyOf;
  }
  return Array.isArray(s.oneOf) ? s.oneOf : undefined;
}

const typeOk = (t: unknown, v: unknown): boolean => {
  const types = Array.isArray(t) ? t : [t];
  return types.some(x => {
    switch (x) {
      case 'null':
        return v === null;
      case 'integer':
        return Number.isInteger(v);
      case 'number':
        return typeof v === 'number';
      case 'string':
        return typeof v === 'string';
      case 'boolean':
        return typeof v === 'boolean';
      case 'array':
        return Array.isArray(v);
      case 'object':
        return isObj(v);
      default:
        return true;
    }
  });
};

/** Shallow structural match, to pick the anyOf branch a value belongs to. */
function fits(s: unknown, v: unknown, root: JsonSchema): boolean {
  const r = resolve(s, root);
  if (!r) {
    return false;
  }
  if (r.const !== undefined && r.const !== v) {
    return false;
  }
  if (Array.isArray(r.enum) && !r.enum.includes(v)) {
    return false;
  }
  if (r.type !== undefined && !typeOk(r.type, v)) {
    return false;
  }
  const union = branches(r);
  if (union) {
    return union.some(b => fits(b, v, root));
  }
  if (isObj(v) && isObj(r.properties)) {
    const props = r.properties;
    if (Object.keys(v).some(k => !(k in props))) {
      return false;
    }
    const required = (r.required as string[] | undefined) ?? [];
    if (required.some(k => !(k in v))) {
      return false;
    }
    // Discriminators (const) must match.
    return Object.entries(props).every(([k, p]) => {
      const pr = resolve(p, root);
      return pr?.const === undefined || !(k in v) || v[k] === pr.const;
    });
  }
  return true;
}

function walk(s: unknown, v: unknown, root: JsonSchema): unknown {
  const r = resolve(s, root);
  if (!r || v === null) {
    return v;
  }
  const union = branches(r);
  if (union) {
    const branch = union.find(b => fits(b, v, root));
    return branch === undefined ? v : walk(branch, v, root);
  }
  if (Array.isArray(v)) {
    return r.items === undefined ? v : v.map(x => walk(r.items, x, root));
  }
  if (isObj(v) && isObj(r.properties)) {
    const props = r.properties;
    const required = new Set((r.required as string[] | undefined) ?? []);
    const out: JsonSchema = {};
    for (const [k, x] of Object.entries(v)) {
      if (x === null && !required.has(k) && !allowsNull(props[k], root)) {
        continue; // null the converter introduced for an optional field
      }
      out[k] = walk(props[k], x, root);
    }
    return out;
  }
  return v;
}

/**
 * Removes the nulls the converter introduced (optional fields answered with null),
 * walking the ORIGINAL (pre-conversion) schema. Nulls the original schema accepts stay.
 */
export function denull(value: unknown, original: JsonSchema): unknown {
  return walk(original, value, original);
}

/** Removes $defs entries nothing references (e.g. left behind by an override). */
export function pruneUnusedDefs(schema: JsonSchema): JsonSchema {
  const defs = isObj(schema.$defs) ? schema.$defs : undefined;
  if (!defs) {
    return schema;
  }
  const used = new Set<string>();
  const queue: unknown[] = [{ ...schema, $defs: undefined }];
  while (queue.length > 0) {
    const node = queue.pop();
    if (Array.isArray(node)) {
      queue.push(...node);
    } else if (isObj(node)) {
      for (const [k, v] of Object.entries(node)) {
        if (k === '$ref' && typeof v === 'string' && v.startsWith('#/$defs/')) {
          const name = v.slice('#/$defs/'.length);
          if (!used.has(name)) {
            used.add(name);
            queue.push(defs[name]);
          }
        } else if (k !== '$defs') {
          queue.push(v);
        }
      }
    }
  }
  const kept = Object.fromEntries(
    Object.entries(defs).filter(([k]) => used.has(k)),
  );
  const rest = { ...schema };
  delete rest.$defs;
  return Object.keys(kept).length > 0 ? { ...rest, $defs: kept } : rest;
}

/**
 * Embeds a standalone schema (with its own $defs and "#" refs) inside another:
 * its $defs move to `defs` under `prefix`, refs are rewritten.
 */
export function embedSchema(
  source: JsonSchema,
  prefix: string,
  defs: Record<string, JsonSchema>,
): JsonSchema {
  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(rewrite);
    }
    if (!isObj(node)) {
      return node;
    }
    const out: JsonSchema = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$defs' || k === '$schema') {
        continue;
      }
      if (k === '$ref' && typeof v === 'string') {
        out.$ref =
          v === '#'
            ? `#/$defs/${prefix}`
            : v.startsWith('#/$defs/')
            ? `#/$defs/${prefix}__${v.slice('#/$defs/'.length)}`
            : v;
        continue;
      }
      out[k] =
        k === 'properties' || k === '$defs'
          ? mapValues(v, rewrite)
          : rewrite(v);
    }
    return out;
  };
  const mapValues = (v: unknown, f: (x: unknown) => unknown) =>
    isObj(v)
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, f(x)]))
      : v;
  if (isObj(source.$defs)) {
    for (const [name, d] of Object.entries(source.$defs)) {
      defs[`${prefix}__${name}`] = rewrite(d) as JsonSchema;
    }
  }
  const body = rewrite(source) as JsonSchema;
  if (JSON.stringify(source).includes('"$ref":"#"')) {
    defs[prefix] = body;
    return { $ref: `#/$defs/${prefix}` };
  }
  return body;
}
