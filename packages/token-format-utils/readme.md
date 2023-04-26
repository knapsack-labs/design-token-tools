# @knapsack-labs/token-format-utils

> This package contains shared libraries used by other token packages and will likely not be used standalone.

## Install

Using npm:

```bash
npm install --save @knapsack-labs/token-format-utils
```

Using yarn:

```bash
yarn add @knapsack-labs/token-format-utils
```

## Use

```ts
import { validateName } from `@knapsack-labs/token-format-utils`;

const badTokenName = '$bad.token.name}'

const errorMessages = validateName(badTokenName);

if (errorMessages.length === 0) {
  console.log('Congrats, your token name is valid!')
} else {
  console.log(errorMessages)
}

```
