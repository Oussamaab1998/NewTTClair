import { buildGraphFor } from '../../method/templates';
import { mutationsFor } from '../../method/mutations';
import { autoCheck } from '../checks/autoCheck';
import type { QuestionPack } from '../packs/build';
import { newSession } from '../session/state';
import { COMPUTE } from '../tools/compute';
import type { AskStudent } from '../tools/schemas';
import { splitCalculations, verifyAsk } from './message';

const graph = buildGraphFor(
  { template: 'urn_exactly_j', args: { j: 1 } },
  { urn: { reds: 4, blacks: 6, k: 3 }, inputs: {} },
);
const main = { id: 'main', graph, table: mutationsFor(graph), extra: [] };
const pack: QuestionPack = {
  questionId: '1',
  label: '1',
  wording: '',
  main,
  plan: [],
  read: [],
  recipe: null,
  notes: {
    route: [],
    notationAfter: 'total',
    skills: [],
    prerequisites: [],
    components: [],
  },
  given: ['3', '4', '6', '10', '0.5', '1/2'],
};

function ctx() {
  const rt = newSession('bac2022c-sc-ex2', '1', main, pack.given);
  return { rt, pack, experiment: null };
}

const say = (...message: AskStudent['message']): AskStudent => ({
  message,
  input: { kind: 'free' },
  intent: 'other',
});

describe('verifyAsk', () => {
  it('accepts a short darija message and isolates French words', () => {
    const r = verifyAsk(
      say({ type: 'ar', text: 'نجبدو الكور simultanément: قدّاش من تيراج؟' }),
      ctx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.blocks[0]?.type === 'ar') {
      expect(r.blocks[0].runs).toEqual(
        expect.arrayContaining([{ fr: 'simultanément' }]),
      );
    }
  });

  it('refuses a number nobody computed', () => {
    const r = verifyAsk(say({ type: 'math', latex: '45 + 7' }), ctx());
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(r)).toContain('45 is not from the statement');
  });

  it('refuses the total before he found it, and allows it after', () => {
    const c = ctx();
    const msg = say({ type: 'math', latex: '\\dfrac{720}{6} = 120' });
    expect(verifyAsk(msg, c)).toMatchObject({ ok: false });
    // Computing it with a tool does not make it his: still refused.
    COMPUTE.evaluate!(c, { lines: ['720/6'] } as never);
    expect(verifyAsk(msg, c)).toMatchObject({ ok: false });
    autoCheck(
      { kind: 'line', raw: '720/6=120' },
      {
        kind: 'line',
        expect: { kind: 'node', graph: 'main', node: 'total' },
      },
      c.rt,
      pack,
    );
    expect(verifyAsk(msg, c)).toMatchObject({ ok: true });
  });

  it('allows the result the exam gives and his own numbers', () => {
    const c = ctx();
    expect(
      verifyAsk(say({ type: 'math', latex: 'P(A) = \\frac{1}{2}' }), c).ok,
    ).toBe(true);
    autoCheck({ kind: 'line', raw: '720/3*2*1=480' }, null, c.rt, pack);
    expect(
      verifyAsk(say({ type: 'ar', text: 'لقيت 480، نقراو السطر متاعك.' }), c)
        .ok,
    ).toBe(true);
  });

  it('refuses a false equality and two questions', () => {
    const c = ctx();
    COMPUTE.evaluate!(c, { lines: ['336/6'] } as never);
    expect(
      verifyAsk(say({ type: 'math', latex: '336 \\div 6 = 46' }), c),
    ).toMatchObject({ ok: false });
    expect(
      verifyAsk(say({ type: 'ar', text: 'شنوّة لقيت؟ وعلاش؟' }), c),
    ).toMatchObject({ ok: false });
  });

  it('keeps the C(n,k) notation until he computed the total', () => {
    const c = ctx();
    const msg = say({ type: 'math', latex: 'C_{10}^{3}' });
    expect(verifyAsk(msg, c)).toMatchObject({ ok: false });
    autoCheck(
      { kind: 'line', raw: '10*9*8/(3*2*1)=120' },
      { kind: 'line', expect: { kind: 'node', graph: 'main', node: 'total' } },
      c.rt,
      pack,
    );
    expect(verifyAsk(msg, c).ok).toBe(true);
  });

  it('refuses LaTeX inside Arabic text and runaway repeats', () => {
    expect(
      verifyAsk(say({ type: 'ar', text: 'الحساب \\frac{1}{2} هنا' }), ctx()),
    ).toMatchObject({ ok: false });
    expect(
      verifyAsk(say({ type: 'ar', text: `هذا ${'"'.repeat(40)}` }), ctx()),
    ).toMatchObject({ ok: false });
  });

  it('allows a reveal after three engine-checked attempts on the node', () => {
    const c = ctx();
    const expect15 = {
      kind: 'line' as const,
      expect: { kind: 'node' as const, graph: 'main', node: 'fav_black' },
    };
    const msg = say({ type: 'math', latex: '15' });
    for (const raw of ['6*5=30', '6+5=11', '6*2=12']) {
      expect(verifyAsk(msg, c).ok).toBe(false);
      autoCheck({ kind: 'line', raw }, expect15, c.rt, pack);
    }
    COMPUTE.evaluate!(c, { lines: ['6*5/2'] } as never);
    expect(verifyAsk(msg, c).ok).toBe(true);
  });

  it('checks a list case and a component', () => {
    const c = ctx();
    expect(
      verifyAsk(
        {
          ...say({ type: 'ar', text: 'اكتب المجموعات.' }),
          input: { kind: 'list', case_id: 'C9', size: 2 },
        },
        c,
      ),
    ).toMatchObject({ ok: false });
    expect(
      verifyAsk(
        {
          ...say({ type: 'ar', text: 'شوف.' }),
          input: {
            kind: 'component',
            name: 'NoSuch',
            props_json: '{}',
            case_id: null,
          },
        },
        c,
      ),
    ).toMatchObject({ ok: false });
  });

  it('draws a component on a small case, with that case as its urn', () => {
    const c = ctx();
    COMPUTE.make_case!(c, {
      case: { kind: 'urn', reds: 2, blacks: 4, k: 3, j: 1 },
      purpose: 'smaller',
    } as never);
    const r = verifyAsk(
      {
        ...say({ type: 'ar', text: 'اختار تيراج.' }),
        input: {
          kind: 'component',
          name: 'Urn',
          props_json: '{"mode":"select"}',
          case_id: 'C1',
        },
      },
      c,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.component).toMatchObject({ name: 'Urn', caseId: 'C1' });
      expect(r.component?.experiment?.urn).toHaveLength(6);
      expect(r.component?.experiment?.k).toBe(3);
    }
    expect(
      verifyAsk(
        {
          ...say({ type: 'ar', text: 'شوف.' }),
          input: {
            kind: 'component',
            name: 'Urn',
            props_json: '{}',
            case_id: 'C7',
          },
        },
        c,
      ),
    ).toMatchObject({ ok: false });
  });

  it('refuses two letter groups in one Arabic sentence, allows one', () => {
    expect(
      verifyAsk(
        say({ type: 'ar', text: 'اكتب المجموعات (مثلا ab و ba هي نفسها).' }),
        ctx(),
      ),
    ).toMatchObject({ ok: false });
    // Brackets stuck to a group do not hide it («(ab» and «ba)»).
    expect(
      verifyAsk(
        say({
          type: 'ar',
          text: 'اكتب بيدك كل التيراجات الممكنة (ab هو نفسه ba).',
        }),
        ctx(),
      ),
    ).toMatchObject({
      ok: false,
      reasons: [expect.stringContaining('scrambled')],
    });
    expect(
      verifyAsk(
        say({
          type: 'ar',
          text: 'فيه الكور a b c d، ونجبدو زوز مع بعض (مثلا ab).',
        }),
        ctx(),
      ),
    ).toMatchObject({
      ok: false,
      reasons: [expect.stringContaining('scrambled')],
    });
    expect(
      verifyAsk(
        say({ type: 'ar', text: 'صندوق فيه a b c d، نجبدو زوز.' }),
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      verifyAsk(
        say({ type: 'ar', text: 'صندوق فيه (a b c d)، نجبدو زوز.' }),
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      verifyAsk(say({ type: 'ar', text: 'الحدث A والحدث B.' }), ctx()).ok,
    ).toBe(true);
  });

  it('refuses a line id and a non-Tunisian word in what he reads', () => {
    expect(
      verifyAsk(say({ type: 'ar', text: 'شوف السطر L2 متاعك.' }), ctx()),
    ).toMatchObject({ ok: false });
    const r = verifyAsk(say({ type: 'ar', text: 'نختارو اثنين كور.' }), ctx());
    expect(JSON.stringify(r)).toContain('«زوز»');
    expect(
      verifyAsk(
        {
          message: [{ type: 'ar', text: 'شنوّة تختار؟' }],
          input: {
            kind: 'choice',
            options: [
              { id: 'a', text: 'ماشي مشكل' },
              { id: 'b', text: 'موش مشكل' },
            ],
          },
          intent: 'other',
        } as AskStudent,
        ctx(),
      ),
    ).toMatchObject({ ok: false });
  });
});

describe('splitCalculations', () => {
  const kinds = (text: string) =>
    splitCalculations(text).map(p =>
      p.kind === 'math' ? `[${p.plain}]` : p.text,
    );

  it('cuts a calculation with "=" or two operators out of the sentence', () => {
    expect(kinds('لقيت 10×9×8 = 720 تيراج')).toEqual([
      'لقيت',
      '[10*9*8 = 720]',
      'تيراج',
    ]);
    expect(kinds('نقسمو (10*9*8)/6 برك.')).toEqual([
      'نقسمو',
      '[(10*9*8)/6]',
      'برك.',
    ]);
  });

  it('leaves a single fraction, a Latin stretch and unbalanced brackets in the sentence', () => {
    expect(kinds('X suit la loi binomiale B(n ; 1/2)')).toEqual([
      'X suit la loi binomiale B(n ; 1/2)',
    ]);
    expect(kinds('الاحتمال 1/2 برك')).toEqual(['الاحتمال 1/2 برك']);
    expect(kinds('نكتبو P(A) = 4*15/120 في الورقة')).toEqual([
      'نكتبو P(A) = 4*15/120 في الورقة',
    ]);
    expect(kinds('(يعني 720/6 = 120)')).toEqual([
      '(يعني',
      '[720/6 = 120]',
      ')',
    ]);
  });
});
