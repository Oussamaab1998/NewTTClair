module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    '*.generated.ts',
    'vendor/',
    'ios/',
    'android/',
    'coverage/',
  ],
  overrides: [
    {
      // UI text must come from i18n (CLAUDE.md). Content text comes from JSON/fixtures.
      files: ['src/**/*.tsx'],
      excludedFiles: ['**/*.test.tsx'],
      rules: {
        'react/jsx-no-literals': [
          'error',
          { noStrings: true, ignoreProps: true },
        ],
      },
    },
  ],
};
