import { z } from 'zod';

import { plannerFormat } from './plannerFormat';
import {
  denull,
  LIMITS,
  StrictSchemaError,
  toStrictSchema,
  zodToJsonSchema,
  type JsonSchema,
} from './strictSchema';

const strictOf = (s: z.ZodType) => toStrictSchema(zodToJsonSchema(s));

/** Every object node in a schema (incl. $defs and anyOf branches). */
function objects(node: unknown, out: JsonSchema[] = []): JsonSchema[] {
  if (Array.isArray(node)) {
    node.forEach(n => objects(n, out));
  } else if (node && typeof node === 'object') {
    const o = node as JsonSchema;
    if (
      o.type === 'object' ||
      (Array.isArray(o.type) && o.type.includes('object'))
    ) {
      out.push(o);
    }
    Object.values(o).forEach(v => objects(v, out));
  }
  return out;
}

/** Schema keywords used anywhere (property names and $defs names excluded). */
function keywords(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    node.forEach(n => keywords(n, out));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      out.add(k);
      if (k === 'properties' || k === '$defs') {
        Object.values(v as JsonSchema).forEach(x => keywords(x, out));
      } else if (k !== 'enum' && k !== 'const' && k !== 'required') {
        keywords(v, out);
      }
    }
  }
  return out;
}

describe('toStrictSchema follows the strict-mode rules (OpenAI structured outputs guide)', () => {
  const formats = [
    plannerFormat(),
    plannerFormat(['complement', 'au-moins-un']),
    plannerFormat(['event-counting']),
  ];

  it.each(formats.map(f => [f.name, f]))(
    '%s: object root, every object closed and fully required, no unsupported keyword',
    (_name, f) => {
      const s = f.strict;
      expect(s.type).toBe('object');
      expect(s.anyOf).toBeUndefined();
      for (const o of objects(s)) {
        expect(o.additionalProperties).toBe(false);
        expect([...((o.required as string[]) ?? [])].sort()).toEqual(
          Object.keys((o.properties as JsonSchema) ?? {}).sort(),
        );
      }
      const used = keywords(s);
      for (const bad of [
        'oneOf',
        'allOf',
        'not',
        'propertyNames',
        'prefixItems',
        'minLength',
        'maxLength',
        'default',
        '$schema',
      ]) {
        expect(used).not.toContain(bad);
      }
    },
  );

  it('the filtered variant only offers components teaching the step skills', () => {
    expect(plannerFormat().components).toEqual([
      'Urn',
      'OutcomeSpace',
      'ComplementView',
      'LawChart',
      'FunctionPlot',
      'PointOnCurve',
      'FoldSymmetry',
      'TangentSlope',
      'SecantToTangent',
      'LimitExplorer',
      'PredictReveal',
      'CompareTwo',
      'ExampleGenerator',
      'StepThrough',
      'NumericTwin',
    ]);
    // Containers come with any offered leaf; their slots name only those leaves.
    const filtered = plannerFormat(['complement']);
    expect(filtered.components).toEqual([
      'ComplementView',
      'PredictReveal',
      'CompareTwo',
    ]);
    const defs = filtered.strict.$defs as Record<string, JsonSchema>;
    const reveal = (
      (
        (defs.branch_PredictReveal!.properties as JsonSchema)
          .props as JsonSchema
      ).properties as JsonSchema
    ).reveal as JsonSchema;
    expect(reveal.anyOf).toEqual([{ $ref: '#/$defs/branch_ComplementView' }]);
    const none = plannerFormat(['event-counting']);
    expect(none.components).toEqual([]);
    expect(JSON.stringify(none.strict)).not.toContain('show_component');
  });

  it('optional fields become required + nullable', () => {
    const s = strictOf(
      z.strictObject({
        a: z.string(),
        b: z.number().optional(),
        c: z.enum(['x', 'y']).optional(),
      }),
    );
    expect(s.required).toEqual(['a', 'b', 'c']);
    const p = s.properties as Record<string, JsonSchema>;
    expect(p.a).toEqual({ type: 'string' });
    expect(p.b?.type).toEqual(['number', 'null']);
    expect(p.c).toMatchObject({
      type: ['string', 'null'],
      enum: ['x', 'y', null],
    });
  });

  it('throws at build time, with the path, on what it cannot represent', () => {
    const cases: [z.ZodType, RegExp][] = [
      [z.strictObject({ m: z.record(z.string(), z.number()) }), /root\.m/],
      [z.strictObject({ t: z.tuple([z.number(), z.number()]) }), /prefixItems/],
      [
        z.union([
          z.strictObject({ a: z.string() }),
          z.strictObject({ b: z.string() }),
        ]),
        /root/,
      ],
      // "uri" is not in the supported format list (email and date are).
      [
        z.strictObject({ e: z.email(), d: z.iso.date(), x: z.url() }),
        /root\.x: unsupported format/,
      ],
    ];
    for (const [schema, message] of cases) {
      expect(() => strictOf(schema)).toThrow(StrictSchemaError);
      expect(() => strictOf(schema)).toThrow(message);
    }
    // zod merges object intersections, so allOf is checked on a raw schema.
    expect(() =>
      toStrictSchema({
        type: 'object',
        properties: { i: { allOf: [{ type: 'string' }, { type: 'string' }] } },
        required: ['i'],
      }),
    ).toThrow(/root\.i: unsupported keyword "allOf"/);
  });

  it('enforces the nesting and enum limits', () => {
    let deep: z.ZodType = z.strictObject({ leaf: z.string() });
    for (let i = 0; i < LIMITS.depth; i += 1) {
      deep = z.strictObject({ n: deep });
    }
    expect(() => strictOf(deep)).toThrow(/levels/);
    const many = Array.from(
      { length: LIMITS.enumValues + 1 },
      (_, i) => `v${i}`,
    );
    expect(() =>
      strictOf(z.strictObject({ e: z.enum(many as [string, ...string[]]) })),
    ).toThrow(/enum values/);
  });
});

describe('denull only removes the nulls the converter introduced', () => {
  const Schema = z.strictObject({
    // Converter-introduced null when absent.
    opt: z.string().optional(),
    // A real null: the field is required and nullable.
    nul: z.string().nullable(),
    // Any JSON: null is a legitimate value.
    json: z.json(),
    list: z.array(
      z.strictObject({
        opt: z.number().optional(),
        nul: z.number().nullable(),
      }),
    ),
    pick: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('a'), opt: z.string().optional() }),
      z.strictObject({ kind: z.literal('b'), nul: z.boolean().nullable() }),
    ]),
  });
  const original = zodToJsonSchema(Schema);

  it('keeps legitimate nulls and drops converter nulls, in arrays and union branches too', () => {
    const answer = {
      opt: null,
      nul: null,
      json: null,
      list: [
        { opt: null, nul: null },
        { opt: 3, nul: 4 },
      ],
      pick: { kind: 'b', nul: null },
    };
    expect(denull(answer, original)).toEqual({
      nul: null,
      json: null,
      list: [{ nul: null }, { opt: 3, nul: 4 }],
      pick: { kind: 'b', nul: null },
    });
    expect(Schema.safeParse(denull(answer, original)).success).toBe(true);
  });

  it('drops the null of an optional field inside the chosen union branch', () => {
    const answer = {
      nul: 'x',
      json: { inner: null },
      list: [],
      pick: { kind: 'a', opt: null },
    };
    expect(denull(answer, original)).toEqual({
      nul: 'x',
      json: { inner: null },
      list: [],
      pick: { kind: 'a' },
    });
  });

  it('works through recursive $refs (event specs in component props)', () => {
    const f = plannerFormat(['complement']);
    const answer = {
      diagnosis: {
        skillIds: [],
        misconceptionIds: [],
        confidence: 0.5,
        summary: '',
      },
      avoid: [],
      next: {
        kind: 'show_component',
        component: {
          component: 'ComplementView',
          props: {
            balls: null,
            draw: null,
            k: null,
            event: {
              id: 'not',
              args: {
                event: { id: 'value_eq', args: { value: 0, valueFn: null } },
              },
            },
            valueFn: 'product',
            direction: null,
            interactive: null,
            labels: null,
          },
        },
        instruction: { ar: null, fr: 'Touche', math: null },
      },
      followUp: null,
    };
    expect(denull(answer, f.original)).toEqual({
      diagnosis: answer.diagnosis,
      avoid: [],
      next: {
        kind: 'show_component',
        component: {
          component: 'ComplementView',
          props: {
            event: {
              id: 'not',
              args: { event: { id: 'value_eq', args: { value: 0 } } },
            },
            valueFn: 'product',
          },
        },
        instruction: { fr: 'Touche' },
      },
    });
  });
});
