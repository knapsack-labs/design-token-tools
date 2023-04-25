const { syncpackConfig } = require('@knapsack/monorepo-tools');

module.exports = {
  ...syncpackConfig,
  versionGroups: [
    {
      packages: ['@knapsack-labs/*'],
      dependencies: ['@knapsack-labs/*'],
      // `syncpack` can't handle the `workspace:*` syntax
      isIgnored: true,
    },
  ],
};
