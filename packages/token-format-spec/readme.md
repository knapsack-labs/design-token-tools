# @knapsack-labs/token-format-spec

> This package contains TypeScript types describing the shape and behavior of token spec data. There are also included validators to ensure token data shape meets the spec.

## Install

Using npm:

```bash
npm install --save @knapsack-labs/token-format-spec
```

Using yarn:

```bash
yarn add @knapsack-labs/token-format-spec
```

## Use

```ts
import { validateTokenSrcGroup } from '@knapsack-labs/token-format-spec';
import { TokenSrcGroup } from '@knapsack-labs/token-format-spec';

const tokenSrcGroup: TokenSrcGroup = {
  color: {
    red: {
      500: {
        $value: '#ff0000',
      },
    },
    blue: {
      500: {
        $value: '#0000ff',
      },
    },
  },
};

const results = validateTokenSrcGroup(tokenSrcGroup);

if (results.errors.length) {
  throw new Error(`Tokens are bad: ${results.errorMsg}`);
}

doStuffWithMyTokens(results.data);
```
