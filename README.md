# Tools to help you easily work with design tokens.

A [W3C Community Group](https://www.w3.org/standards/types#summary) has formed to define the spec of [what a "design token" looks like in a standardized format](https://tr.designtokens.org/format/).

In its simplest form, a token in the proposed spec can look like this:

```json
{
  "token name": {
    "$value": "#fff000",
    "$type": "color"
  }
}
```

Tokens can also represent more complex concepts:

```json
{
  "shadow-token": {
    "$type": "shadow",
    "$value": {
      "color": "#00000080",
      "offsetX": "0.5rem",
      "offsetY": "0.5rem",
      "blur": "1.5rem",
      "spread": "0rem"
    }
  }
}
```

The tools in this monorepo - which are published as separate packages - make working with and converting your design token data a breeze! Navigate to each folder below for installation instructions and instructions on how to use.

## @knapsack-labs/token-format-utils

`/packages/token-format-utils`

Share utilities between the following packages.

## @knapsack-labs/token-format-spec

`/packages/token-format-spec`

Typescript types describing the shape and behavior of token spec data.

## @knapsack-labs/token-data

`/packages/token-data`

The main utility for parsing raw tokens json into a class that makes reading and manipulating token data easier.

## @knapsack-labs/token-asset-converter-web

`/packages/token-format-utils`

Convert token data into web assets like CSS, Sass, Less.
