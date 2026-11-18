import { devTeacherAtLaunch } from './launch';

const mockArgs: Record<string, unknown> = {};
jest.mock('react-native/Libraries/Settings/Settings', () => ({
  __esModule: true,
  default: { get: (k: string) => mockArgs[k] },
}));

describe('-devTeacher', () => {
  it('reads canned, and ignores anything else', () => {
    mockArgs.devTeacher = 'canned';
    expect(devTeacherAtLaunch()).toBe('canned');
    mockArgs.devTeacher = 'live';
    expect(devTeacherAtLaunch()).toBeNull();
    delete mockArgs.devTeacher;
    expect(devTeacherAtLaunch()).toBeNull();
  });
});
