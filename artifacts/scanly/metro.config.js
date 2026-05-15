const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver ?? {};
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /.*_tmp_.*/,
  /.*node_modules.*_tmp_.*/,
];

config.watchFolders = [path.resolve(__dirname, "../..")];

module.exports = config;
