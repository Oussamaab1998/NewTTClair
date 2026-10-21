module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native[^/]*|@react-native(-community)?|@testing-library)/)',
  ],
  // Tests never load the real LLM key (src/config/llmLocal.generated.ts is gitignored).
  moduleNameMapper: {
    'llmLocal\\.generated$': '<rootDir>/src/config/llmLocal.stub.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/vendor/'],
};
