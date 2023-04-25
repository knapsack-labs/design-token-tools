const {
  dualConfig,
} = require('@knapsack/typescript-config-starter/tsup.config-base.cjs');

module.exports = { ...dualConfig, dts: false };
