# @knapsack-labs/token-data

> The main utility for parsing raw tokens json into a flattened, de-referenced, developer-friendly intermediate format.

## Install

Using npm:

```bash
npm install --save @knapsack-labs/token-data
```

## Use

```ts
import { TokenSrcGroup } from '@knapsack-labs/token-format-spec';
import { convertTokenGroupToData } from '@knapsack-labs/token-data';

const tokenSrcGroup: TokenSrcGroup = {
  color: {
    $type: 'color',
    red: {
      500: {
        $value: '#ff0000',
      },
    },
    'brand-red': {
      $value: '{color.red.500}',
    },
  },
};

const tokenData = convertTokenGroupToData(tokenSrcGroup);
// `tokenData` shown below:
{
  tokensById: {
    'color.red.500': {
      type: 'color',
      value: '#ff0000',
      id: 'color.red.500',
      originalValue: '#ff0000',
      kind: 'static',
    },
    'color.brand-red': {
      type: 'color',
      value: '#ff0000',
      id: 'color.brand-red',
      originalValue: '{color.red.500}',
      kind: 'ref',
      referencedTokenId: 'color.red.500',
    },
  },
  tokens: [
    {
      type: 'color',
      value: '#ff0000',
      id: 'color.brand-red',
      originalValue: '{color.red.500}',
      kind: 'ref',
      referencedTokenId: 'color.red.500',
    },
    {
      type: 'color',
      value: '#ff0000',
      id: 'color.red.500',
      originalValue: '#ff0000',
      kind: 'static',
    },
  ],
  groupsById: {
    color: {
      id: 'color',
      type: 'color',
      children: {
        groupIds: ['color.red'],
        tokenIds: ['color.brand-red'],
      },
    },
    'color.red': {
      id: 'color.red',
      children: {
        groupIds: [],
        tokenIds: ['color.red.500'],
      },
    },
  },
  groups: [
    {
      id: 'color',
      type: 'color',
      children: {
        groupIds: ['color.red'],
        tokenIds: ['color.brand-red'],
      },
    },
    {
      id: 'color.red',
      children: {
        groupIds: [],
        tokenIds: ['color.red.500'],
      },
    },
  ],
};
```
