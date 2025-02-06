const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Tambahkan resolver untuk menonaktifkan Hermes
config.resolver = {
  ...config.resolver,
  unstable_disableHermes: true, // Nonaktifkan Hermes
};

module.exports = withNativeWind(config, { input: './global.css' });
