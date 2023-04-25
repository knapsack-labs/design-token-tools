import loSet from 'lodash/setWith.js';
import { TokenData } from '@knapsack-labs/token-data';
import { kebabCase, camelCase, snakeCase } from '@knapsack/utils';
import { formatCodeSync } from '@knapsack/file-utils/format';

import {
  formatCubicBezierValue,
  formatShadowTokenValue,
  formatTransitionValue,
  sortTokenData,
} from './web-asset-converter-utils';

interface SassMapShape {
  [key: string]: string | SassMapShape;
}

/**
 * Ensure quotes are handled correctly in JS/JSON
 */
function getJsValue(
  value: string | boolean | number,
): string | boolean | number {
  if (typeof value !== 'string') return value;
  return JSON.stringify(value.replace(/"/g, "'"));
}

/**
 * How to resolve the actual value of a token.
 * @param token - Processed TokenData object
 * @param [refFunc] - Optional function to process references
 * @returns value
 */
export function getTokenValue(
  token: TokenData,
  refFunc?: (r: string) => string,
): string | number | boolean {
  switch (token.type) {
    case 'cubicBezier':
      return formatCubicBezierValue(token.value);
    case 'shadow': {
      return formatShadowTokenValue(token.value);
    }
    case 'transition':
      return formatTransitionValue(token.value);
    default: {
      // Replace all refs
      if (refFunc) {
        if (typeof token.originalValue === 'string') {
          return token.originalValue.split(' ').map(refFunc).join(' ');
        }
      }
      // Fallback
      return token.value;
    }
  }
}

/**
 * Convert a `TokenData` object to flat CSS variables.
 */
export const convertTokenDataToCss = (tokenDatas: TokenData[]): string => {
  const cssVarName = (name: string) => `--${kebabCase(name)}`;
  // Make CSS value names like var(--color-primary)
  const cssValName = (val: string) => {
    if (val.startsWith('{') && val.endsWith('}')) {
      return `var(${cssVarName(val.slice(1, -1))})`;
    }
    return val;
  };

  const tokenOutputs: string[] = tokenDatas.map((token) => {
    const name = cssVarName(token.id);
    const value = getTokenValue(token, cssValName);

    return `${name}: ${value};`;
  });

  // @TOD: async this
  return formatCodeSync({
    contents: [':root {', ...tokenOutputs, '}'].join('\n'),
    path: 'x.css',
  });
};

/**
 * SCSS helpers, pulled out because shared between SCSS and Map SCSS
 */
const scssVarName = (name: string) => `$${kebabCase(name)}`;
const scssValName = (val: string) => {
  if (val.startsWith('{') && val.endsWith('}')) {
    return `${scssVarName(val.slice(1, -1))}`;
  }
  return val;
};

/**
 * Convert a `TokenData` object to flat SCSS variables.
 */
export const convertTokenDataToScss = (tokenDatas: TokenData[]): string => {
  const tokenOutputs: string[] = sortTokenData(tokenDatas).map((token) => {
    const name = scssVarName(token.id);
    const value = getTokenValue(token, scssValName);

    return `${name}: ${value};`;
  });

  // @TOD: async this
  return formatCodeSync({
    contents: tokenOutputs.join('\n'),
    path: 'x.scss',
  });
};

/**
 * Convert a `TokenData` object to flat SCSS variables + a SCSS map.
 */
export const convertTokenDataToMapScss = (tokenDatas: TokenData[]): string => {
  // Initial string of basic SCSS vars
  const scssVars = convertTokenDataToScss(tokenDatas);

  // Convert the array of token data to a nested object in prep for SCSS map string
  const scssMapObj = tokenDatas.reduce((acc, token) => {
    // All values in the SCSS map are just $scss-vars
    const value = scssVarName(token.id);
    loSet(acc, token.id, value);
    return acc;
  }, {} as SassMapShape);

  // Convert object to string that is a nested SCSS map
  const makeSassMapString = (obj: SassMapShape): string =>
    Object.entries(obj).reduce((acc, [key, value]) => {
      // Build up a string that looks like a sass map **from the inside out**
      acc +=
        // If value is finally a string|number, that means we've hit the deepest level
        typeof value === 'string' || typeof value === 'number'
          ? // In this case, end with `'map-key': $some-other-var,`
            `'${key}': ${value},`
          : // Otherwise, keep drilling, but wrapped in `'map-key': (),`
            `'${key}': (${makeSassMapString(value)}),`;

      return acc;
    }, '');

  // The final SCSS map, as a `$tokens` variable
  const scssMapString = `$tokens: (${makeSassMapString(scssMapObj)});`;

  return formatCodeSync({
    contents: scssVars + scssMapString,
    path: 'x.scss',
  });
};

/**
 * Convert a `TokenData` object to flat LESS variables.
 */
export const convertTokenDataToLess = (tokenDatas: TokenData[]): string => {
  const lessVarName = (name: string) => `@${kebabCase(name)}`;
  // Make LESS value names, ie @color-primary
  const lessValName = (val: string) => {
    if (val.startsWith('{') && val.endsWith('}')) {
      return `${lessVarName(val.slice(1, -1))}`;
    }
    return val;
  };
  const tokenOutputs: string[] = sortTokenData(tokenDatas).map((token) => {
    const name = lessVarName(token.id);
    const value = getTokenValue(token, lessValName);
    return `${name}: ${value};`;
  });

  // @TOD: async this
  return formatCodeSync({
    contents: tokenOutputs.join('\n'),
    path: 'x.less',
  });
};

/**
 * Convert a `TokenData` object to flat JSON.
 */
export const convertTokenDataToJson = (tokenDatas: TokenData[]): string => {
  const tokenOutput = tokenDatas.reduce((acc, token) => {
    const name = camelCase(token.id);
    const value = getTokenValue(token);
    acc[name] = value;
    return acc;
  }, {} as Record<string, string | boolean | number>);

  // @TOD: async this
  return formatCodeSync({
    contents: JSON.stringify(tokenOutput, null, '  '),
    path: 'x.json',
  });
};

/**
 * Convert a `TokenData` object to nested JSON.
 */
export const convertTokenDataToNestedJson = (tokenDatas: TokenData[]) => {
  const tokenOutput = tokenDatas.reduce((acc, token) => {
    const value = getTokenValue(token);
    loSet(acc, token.id, value, Object);
    return acc;
  }, {} as Record<string, unknown>);

  // @TOD: async this
  return formatCodeSync({
    contents: JSON.stringify(tokenOutput, null, '  '),
    path: 'x.json',
  });
};

/**
 * Convert a `TokenData` object to JS variables, along with TypeScript types.
 */
export const convertTokenDataToJs = (
  tokenDatas: TokenData[],
): {
  /** ES Module format (uses `export`) */
  jsString: string;
  /** TypeScript definition file (`*.d.ts`) */
  dtsString: string;
} => {
  const jsName = (name: string) => camelCase(name);

  const sortedTokens = sortTokenData(tokenDatas);

  const tokenOutputs = sortedTokens.map((token) => {
    const name = jsName(token.id);
    const value = getTokenValue(token);
    return `export const ${name} = ${getJsValue(value)};`;
  });

  const dtsOutputs = sortedTokens.map((token) => {
    const name = jsName(token.id);
    const value = getTokenValue(token);

    return `export declare const ${name} = ${getJsValue(value)};`;
  });

  // @TOD: async this
  return {
    jsString: formatCodeSync({
      contents: tokenOutputs.join('\n'),
      path: 'x.js',
    }),
    dtsString: formatCodeSync({
      contents: dtsOutputs.join('\n'),
      path: 'x.d.ts',
    }),
  };
};

/**
 * Convert a `TokenData` object to CommonJS variables.
 */
export const convertTokenDataToCjs = (tokenDatas: TokenData[]): string => {
  const tokenOutputs: string[] = sortTokenData(tokenDatas).map((token) => {
    const name = camelCase(token.id);
    const value = getTokenValue(token);
    return `${name}: ${getJsValue(value)},`;
  });

  return formatCodeSync({
    contents: ['module.exports = {', ...tokenOutputs, '};'].join('\n'),
    path: 'x.cjs',
  });
};
