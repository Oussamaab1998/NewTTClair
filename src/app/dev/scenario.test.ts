import { runLive1, runTiming } from './scenario';

describe('live1 scenario', () => {
  it('runs at most once per app process (Fast Refresh remounts cannot restart it)', () => {
    const answerWrong = jest.fn();
    const api = {
      runtime: {
        status: () => ({ modelCheck: 'pending', calls: 0 }),
        client: null,
        devRaw: null,
      } as never,
      log: { all: () => [] } as never,
      answerWrong,
      ask: jest.fn(),
      closeDrawer: jest.fn(),
      showDevTools: jest.fn(),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    runLive1(api);
    runLive1(api);
    runLive1(api);
    expect(api.showDevTools).toHaveBeenCalledTimes(1);
  });
});

describe('timing scenario (2026-10-22)', () => {
  it('three planner calls through the lesson, then one 15 s measurement; once per app process', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    let calls = 0;
    const act = jest.fn(() => {
      calls += 1;
    });
    const measure = jest.fn(async (_t: number) => ({
      requestId: 'm',
      purpose: 'plan' as const,
      model: 'm',
      outcome: 'ok' as const,
      statusClass: '2xx' as const,
      latencyMs: 3100,
      timing: { prepMs: 5, headersMs: 3050, bodyMs: 45 },
    }));
    const api = {
      runtime: {
        status: () => ({ modelCheck: 'ok', calls }),
      } as never,
      actions: [act, act, act],
      measurePlan: measure,
      showDevTools: jest.fn(),
    };
    const done = runTiming(api);
    runTiming(api);
    await jest.runAllTimersAsync();
    await done;
    expect(act).toHaveBeenCalledTimes(3);
    expect(measure).toHaveBeenCalledTimes(1);
    expect(measure).toHaveBeenCalledWith(15000);
    expect(api.showDevTools).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
