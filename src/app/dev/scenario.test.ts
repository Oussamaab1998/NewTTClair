import { runLive1 } from './scenario';

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
