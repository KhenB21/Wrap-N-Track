const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = path.resolve(__dirname, 'Mobile');
const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;

module.exports = config;