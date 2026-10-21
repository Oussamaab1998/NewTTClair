// Global test setup (runs after the test framework is installed).
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, WebView: View };
});
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// react-native-mmkv loads Nitro (native) on import: an in-memory stand-in.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const data = new Map<string, string>();
    return {
      getString: (k: string) => data.get(k),
      set: (k: string, v: string) => data.set(k, v),
      remove: (k: string) => data.delete(k),
    };
  },
}));
// Each lesson mount gets a fresh, empty event store: one test's events never
// become another test's history (tests that need history inject a store).
jest.mock('./src/app/appEventStore', () => ({
  appEventStore: () =>
    require('./src/telemetry/eventStore').createKvEventStore(
      require('./src/storage/kv').memoryStore(),
    ),
}));
