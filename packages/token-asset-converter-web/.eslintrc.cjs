module.exports = {
  extends: [
    '@knapsack/eslint-config-starter/ava',
    '@knapsack/eslint-config-starter',
  ],
  parserOptions: { tsconfigRootDir: __dirname },
  ignorePatterns: [],
  rules: {},
};
