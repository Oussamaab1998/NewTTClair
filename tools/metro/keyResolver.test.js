const { resolveKeyModule, BLANK_KEY_MODULE } = require('./keyResolver');

const ctx = dev => ({
  dev,
  resolveRequest: jest.fn((_c, name) => ({
    type: 'sourceFile',
    filePath: `real:${name}`,
  })),
});

describe('release bundles never contain the LLM key (DECISIONS D21)', () => {
  afterEach(() => {
    delete process.env.INCLUDE_KEY_IN_RELEASE;
  });

  it('dev bundles resolve the real key module', () => {
    expect(resolveKeyModule(ctx(true), './llmLocal.generated', 'ios')).toEqual({
      type: 'sourceFile',
      filePath: 'real:./llmLocal.generated',
    });
  });

  it('release bundles resolve the blank stub by default', () => {
    expect(resolveKeyModule(ctx(false), './llmLocal.generated', 'ios')).toEqual(
      {
        type: 'sourceFile',
        filePath: BLANK_KEY_MODULE,
      },
    );
    expect(require('node:fs').readFileSync(BLANK_KEY_MODULE, 'utf8')).toContain(
      "openaiApiKey: ''",
    );
  });

  it('INCLUDE_KEY_IN_RELEASE=1 opts in, with a loud warning', () => {
    process.env.INCLUDE_KEY_IN_RELEASE = '1';
    const err = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    expect(resolveKeyModule(ctx(false), './llmLocal.generated', 'ios')).toEqual(
      {
        type: 'sourceFile',
        filePath: 'real:./llmLocal.generated',
      },
    );
    expect(String(err.mock.calls[0]?.[0])).toContain('CONTAINS THE LLM KEY');
    err.mockRestore();
  });

  it('other modules are untouched', () => {
    expect(resolveKeyModule(ctx(false), './llm', 'ios').filePath).toBe(
      'real:./llm',
    );
  });
});
