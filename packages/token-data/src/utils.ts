import {
  isTokenGroup,
  isTokenSrc,
  TokenSrcGroup,
} from '@knapsack-labs/token-format-spec';
import { isObject, Except } from '@knapsack/utils';
import { TokenData, assertTokenData } from './types';

// /**
//  * Capture strings like {a.b} in other strings
//  * DOES NOT EXPECT the `.value`. NOTE: this is a capture group regex
//  */
// const tokenRefRegex = new RegExp(
//   // start capture group
//   '(' +
//     // starts with `{`
//     '{' +
//     // get everything up until a `}`
//     '[^}]' +
//     // match 1 or more making selection as large as possible.
//     '*' +
//     // ends with `}`
//     '}' +
//     // end capture group
//     ')',
//   // RegExp done above, flags below; setting `g` for global
//   'g',
// );

// export type TokenRefChunk =
//   | {
//       type: 'ref';
//       id: string;
//       string: string;
//     }
//   | {
//       type: 'string';
//       string: string;
//     };

// export function parseValueChunks(str: string): TokenRefChunk[] {
//   return (
//     str
//       .split(tokenRefRegex)
//       // remove empty strings
//       .filter(Boolean)
//       .map((chunk) => {
//         if (chunk.startsWith('{') && chunk.endsWith('}')) {
//           return {
//             type: 'ref',
//             // remove the start `{` and end `}` brackets
//             id: chunk.slice(1, -1),
//             string: chunk,
//           };
//         }
//         return {
//           type: 'string',
//           string: chunk,
//         };
//       })
//   );
// }

export function getIds(tokenGroup: TokenSrcGroup): {
  tokenIds: Set<string>;
  groupIds: Set<string>;
} {
  const tokenIds = new Set<string>();
  const groupIds = new Set<string>();

  function dive({
    thisGroup,
    path,
  }: {
    thisGroup: TokenSrcGroup;
    path: string[];
  }) {
    Object.entries(thisGroup).forEach(([key, item]) => {
      if (key === '$extensions') return;
      const thisPath = [...path, key];
      const id = thisPath.join('.');
      if (isTokenSrc(item)) {
        tokenIds.add(id);
      } else if (isTokenGroup(item)) {
        groupIds.add(id);
        dive({
          path: thisPath,
          thisGroup: item,
        });
      }
    });
  }

  dive({ thisGroup: tokenGroup, path: [] });

  return {
    tokenIds,
    groupIds,
  };
}

/**
 * This type and `TokenData` may look exactly the same but there's an important
 * distinction: `TokenData` has its `type` & `value` coupled, where this does not
 * Simplified example with only 2 types:
 * ```ts
 * type TokenData =
 *   | { type: 'color', value: string }
 *   | { type: 'number', value: number }
 * type TokenDataUncoupled = {
 *   type: 'color' | 'number';
 *   value: string | number;
 * }
 * ```
 * The job of `validateTokenData` is to take a `TokenDataUncoupled` and return a
 * `TokenData` by checking the `type` and `value` are correct AND BELONG TOGETHER.
 */
type TokenDataUncoupled = Except<
  TokenData,
  'type' | 'value' | 'originalValue'
> & {
  type: TokenData['type'];
  value: TokenData['value'];
  originalValue: TokenData['originalValue'];
};

/**
 * Validate the `type` and `value` of a `TokenData` object, allows TypeScript to
 * infer the correct `type` and `value` for the `TokenData` object.
 */
export function validateTokenData(token: TokenDataUncoupled): TokenData {
  assertTokenData(token);
  return token;
}
