const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Release bundles never contain the LLM key (docs/DECISIONS.md D21).
const { resolveKeyModule } = require('./tools/metro/keyResolver');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: { resolveRequest: resolveKeyModule },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
