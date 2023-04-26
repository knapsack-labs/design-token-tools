# @knapsack-labs/token-asset-converter-web

> Convert token data into web assets like CSS, Sass, Less.

## Install

Using npm:

```bash
npm install --save @knapsack-labs/token-asset-converter-web
```

## Use

```ts
import { TokenSrcGroup } from '@knapsack-labs/token-format-spec';
import { convertTokenGroupToData } from '@knapsack-labs/token-data';
import {
  convertTokenDataToCss,
  convertTokenDataToScss,
} from './web-asset-converters';

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

// Asset converters expect the the tokens data to be in the intermediate format
const tokensData = convertTokenGroupToData(tokenSrcGroup);

const cssString = convertTokenDataToCss(tokensData.tokens);

// cssString value:
//
// :root {
//   --color-red-500: #ff0000;
//   --color-brand-red: var(--color-red-500);
// }

const scssString = convertTokenDataToScss(tokensData.tokens);

// scssString value:
//
// $color-red-500: #ff0000;
// $color-brand-red: $color-red-500;
```
