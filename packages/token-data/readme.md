# @knapsack-labs/token-data

> The main utility for parsing raw tokens json into a flattened, de-referenced, developer-friendly intermediate format.

## Install

Using npm:

```bash
npm install --save @knapsack-labs/token-data
```

Using yarn:

```bash
yarn add @knapsack-labs/token-data
```

## Use

```ts
import { TokenSrcGroup } from '@knapsack-labs/token-format-spec';
import { convertTokenGroupToData } from '@knapsack-labs/token-data';

const tokenSrcGroup: TokenSrcGroup = {
  color: {
    red: {
      500: {
        $value: '#ff0000',
      },
    },
    'brand-red': {
      $value: '{red.500}',
    },
  },
};

const tokenData = convertTokenGroupToData(tokenSrcGroup);

// TODO: show token data format here
console.log(tokenData);
```
