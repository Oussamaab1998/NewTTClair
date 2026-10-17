module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // zod v4 uses `export * as ns from` (not covered by the RN preset).
    '@babel/plugin-transform-export-namespace-from',
    // Must stay last (Reanimated 4 / worklets).
    'react-native-worklets/plugin',
  ],
};
