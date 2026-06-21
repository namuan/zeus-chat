const { getDefaultConfig } = require('expo/metro-config');
const {
  getBundleModeMetroConfig,
} = require('react-native-worklets/bundleMode');

let config = getDefaultConfig(__dirname);

// Watch the .worklets/ output directory
config.watchFolders.push(
  require('path').resolve(
    __dirname,
    'node_modules/react-native-worklets/.worklets',
  ),
);

// Resolve react-native-worklets/.worklets/* via the Bundle Mode resolver
const defaultResolver = config.resolver.resolveRequest;

config = getBundleModeMetroConfig(config);

const bundleModeResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('react-native-worklets/.worklets/')) {
    return bundleModeResolver(context, moduleName, platform);
  }
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
