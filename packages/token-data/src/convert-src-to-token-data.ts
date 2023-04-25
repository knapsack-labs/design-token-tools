import {
  TokenSrcGroup,
  TokenSrc,
  TokenType,
  isTokenSrc,
  isTokenGroup,
  isTokenSrcExtensions,
  TokenKsExtensions,
  getPrimitiveValue,
  hasTokenReferences,
  validateTokenSrcGroup,
  TokenRefChunk,
  parseValueChunks,
} from '@knapsack-labs/token-format-spec';
import { isObject, flow, removeUndefinedProps, flatten } from '@knapsack/utils';
import loMapValues from 'lodash/mapValues.js';
import memoize from 'memoizee';
import { TokenData, TokenGroupData, isTokenValueShadow } from './types';
import { validateTokenData } from './utils';

type Data = {
  tokensById: Record<string, TokenData>;
  tokens: TokenData[];
  groupsById: Record<string, TokenGroupData>;
  groups: TokenGroupData[];
  /**
   * Extracted from `$extensions['cloud.knapsack'].global`
   */
  globalConfig: TokenKsExtensions['global'];
};

/**
 * Removes last item of dot separated string.
 * `a.b.c` => `a.b`
 */
function getParentId(id: string): string {
  return id.split('.').slice(0, -1).join('.');
}

function getLevel(id: string): number {
  return id.split('.').length;
}

/**
 * Get immediate children of a group
 */
function getChildrenIds({
  id,
  allIds,
}: {
  id: string;
  allIds: string[];
}): string[] {
  const level = getLevel(id);
  return allIds.filter(
    // Just children, and no further (grandchildren etc)
    (childId) => childId.startsWith(id) && getLevel(childId) === level + 1,
  );
}

const hasParentId = (id: string) => id.includes('.');

function sortAlphabetically(a: string, b: string) {
  return a.localeCompare(b);
}

/**
 *
 */
function buildGroupOrder({
  childrenIds,
  groupId,
  order,
}: {
  childrenIds: string[];
  groupId: string;
  order?: string[];
}): string[] {
  function addGroupPrefix(id: string): string {
    if (id.includes('.') || !groupId) return id;
    return `${groupId}.${id}`;
  }
  let orderedIds = childrenIds.map(addGroupPrefix);
  if (!order) {
    return [...orderedIds].sort(sortAlphabetically);
  }
  const ids = new Set(childrenIds);
  const orderWithFullIds = order.map(addGroupPrefix);
  // since we have a saved order, we need to make sure it matches the children IDs.
  // any IDs that are not in the order will be put at the end of the list
  orderedIds = orderWithFullIds.filter((id) => {
    const has = ids.has(id);
    if (has) {
      ids.delete(id);
      return true;
    }
    return false;
  });
  if (ids.size > 0) {
    console.warn(
      `Group "${groupId}" has order that does not match children. Order: "${orderWithFullIds.join(
        ', ',
      )}". Children: "${childrenIds.join(', ')}"`,
    );
    const remainingIds = [...ids].sort(sortAlphabetically);
    // putting on end of list
    orderedIds = [...orderedIds, ...remainingIds];
  }
  return orderedIds;
}

// memoized version is created and exported below
const convertTokenGroupToDataNonMemo: (obj: TokenSrcGroup) => Data = flow(
  /**
   *
   */
  function flattenObj(obj) {
    if (!isObject(obj)) {
      throw new Error('Expected an object');
    }
    const { errorMsg, data } = validateTokenSrcGroup(obj);
    if (errorMsg) throw new Error(errorMsg);
    if (!data) throw new Error('Expected data');
    return flatten(data);
  },
  /**
   *
   */
  function extractGlobalConfigFromTopExtension(flattenedObj) {
    return {
      flattenedObj,
      globalConfig: isTokenSrcExtensions(flattenedObj.$extensions)
        ? flattenedObj.$extensions?.['cloud.knapsack']?.global ?? {}
        : {},
    };
  },
  /**
   *
   */
  function parseIntoTokensAndGroup({ flattenedObj, globalConfig }) {
    const src = Object.entries(flattenedObj).reduce(
      (acc, [id, item]) => {
        if (
          // no group name nor token name can start with `$`
          // check if it's at the top level
          id.startsWith('$') ||
          // check if it's a nested group - if following a `.` then it's a nested group
          id.includes('.$')
        ) {
          return acc;
        }
        if (isTokenSrc(item)) {
          acc.tokens[id] = item;
        } else if (isTokenGroup(item)) {
          acc.groups[id] = item;
        }
        return acc;
      },
      {
        tokens: {} as Record<string, TokenSrc>,
        groups: {} as Record<string, TokenSrcGroup>,
      },
    );
    return {
      src,
      globalConfig,
    };
  },
  /**
   *
   */
  function createTokenBuilder({ globalConfig, src }) {
    /**
     *
     */
    function getParentType(myId: string): TokenData['type'] | undefined {
      const parentId = getParentId(myId);
      const type = src.groups[parentId]?.$type;
      if (type) return type;
      if (!hasParentId(myId)) return undefined;
      return getParentType(parentId);
    }
    /**
     *
     */
    function processSingleRef(chunk: Extract<TokenRefChunk, { type: 'ref' }>): {
      referencedType: TokenData['type'];
      value: TokenData['value'];
      references: TokenData['references'];
      referencedTokenId: string;
      kind: 'ref';
    } {
      const { id } = chunk;
      // disabling b/c both this function and `buildToken` depend on each other
      // - both will be defined by the time they are called though
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const token = buildToken(chunk.id);
      return {
        value: token.value,
        references: [[id, ...(token.references || []).flat()]],
        referencedType: token.type,
        referencedTokenId: id,
        kind: 'ref',
      };
    }
    /**
     *
     */
    function processMultipleRefs(chunks: TokenRefChunk[]): {
      value: string;
      references: TokenData['references'];
      referencedType?: TokenData['type'];
      referencedTokenId?: string;
      // multiple refs can't be a single reference
      kind: 'static';
    } {
      return chunks.reduce(
        (acc, chunk) => {
          if (chunk.type === 'ref') {
            // disabling b/c both this function and `buildToken` depend on each other - both will be defined by the time they are called though
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const token = buildToken(chunk.id);
            acc.value += token.value;
            const subTokenRefs = token.references || [];
            acc.references?.push([chunk.id, ...subTokenRefs.flat()]);
          } else {
            acc.value += chunk.string;
          }
          return acc;
        },
        {
          value: '',
          references: [],
          kind: 'static',
        } as ReturnType<typeof processMultipleRefs>,
      );
    }

    /**
     *
     */
    function buildToken(id: string): TokenData {
      const token = src.tokens[id];
      if (!token) {
        throw new Error(`Token "${id}" not found`);
      }
      const { $value, $description, $extensions, $type: myType } = token;
      const tokenConfig = $extensions?.['cloud.knapsack']?.token;
      const inheritedType = getParentType(id);
      const type = myType || inheritedType || getPrimitiveValue($value);

      if (isObject($value)) {
        const references: string[][] = [];
        const compositeValue = loMapValues($value, (compositeItem, key) => {
          const chunks = parseValueChunks(compositeItem);
          if (chunks.length > 1) {
            throw new Error(
              `Token "${id}" is a composite token that contains an item "${key}" with more than one reference. There must be either zero or one references per item. Received: ${JSON.stringify(
                compositeItem,
              )}`,
            );
          }
          const [chunk] = chunks;
          if (chunk.type === 'string') return chunk.string;
          const { references: chunkRefs, value } = processSingleRef(chunk);
          if (chunkRefs) {
            references.push(...chunkRefs);
          }
          return value;
        });
        if (!isTokenValueShadow(compositeValue)) {
          throw new Error(
            `Token "${id}" is a composite token with sub items containing references which did not properly resolve. Received: '${JSON.stringify(
              $value,
            )}' and resolved to: '${JSON.stringify(compositeValue)}`,
          );
        }

        return validateTokenData({
          type,
          value: compositeValue,
          id,
          description: $description,
          tokenConfig,
          originalValue: $value,
          references,
          kind: 'static',
        });
      }

      if (isObject($value) && !isTokenValueShadow($value)) {
        throw new Error(
          `Token "${id}" appears to be a composite token that contains references. This is not supported yet. Received value: ${JSON.stringify(
            $value,
          )}`,
        );
      }

      if (!hasTokenReferences($value)) {
        return validateTokenData({
          type,
          value: $value,
          id,
          description: $description,
          tokenConfig,
          originalValue: $value,
          kind: 'static',
        });
      }
      if (typeof $value !== 'string') {
        throw new Error(
          `Token "${id}" has references but is not a string which should be impossible. Value: "${$value}`,
        );
      }

      const chunks = parseValueChunks($value);

      const {
        references,
        value,
        referencedType,
        kind,
        referencedTokenId = '',
      } = chunks.length === 1 && chunks[0].type === 'ref'
        ? processSingleRef(chunks[0])
        : processMultipleRefs(chunks);

      return validateTokenData({
        type: referencedType || getPrimitiveValue(value),
        value,
        id,
        description: $description,
        tokenConfig,
        originalValue: $value,
        references,
        kind,
        referencedTokenId,
      });
    }

    return {
      globalConfig,
      src,
      buildToken,
    };
  },
  /**
   *
   */
  function parseTokens({ buildToken, globalConfig, src }) {
    return {
      globalConfig,
      src,
      tokensById: loMapValues(src.tokens, (value, id) => buildToken(id)),
    };
  },
  /**
   *
   */
  function parseGroups({ src, globalConfig, tokensById }) {
    const tokenIds = Object.keys(src.tokens);
    const groupIds = Object.keys(src.groups);
    const topGroupIds = groupIds.filter((id) => !id.includes('.'));
    const topTokenIds = tokenIds.filter((id) => !id.includes('.'));

    const groupsById: Data['groupsById'] = loMapValues(
      src.groups,
      (groupSrc, id): TokenGroupData => {
        const groupConfig = groupSrc.$extensions?.['cloud.knapsack']?.group;
        const childrenGroupIds = getChildrenIds({
          id,
          allIds: groupIds,
        });
        const childrenTokenIds = getChildrenIds({
          id,
          allIds: tokenIds,
        });

        return {
          id,
          groupConfig,
          description: groupSrc.$description,
          type: groupSrc.$type,
          children: {
            groupIds: buildGroupOrder({
              childrenIds: childrenGroupIds,
              groupId: id,
              order: groupConfig?.order?.groupIds,
            }),
            tokenIds: buildGroupOrder({
              childrenIds: childrenTokenIds,
              groupId: id,
              order: groupConfig?.order?.tokenIds,
            }),
          },
        };
      },
    );

    globalConfig.order = {
      groupIds: buildGroupOrder({
        childrenIds: topGroupIds,
        groupId: '',
        // it's ok if it's undefined, it will just build it alphabetically
        order: globalConfig?.order?.groupIds,
      }),
      tokenIds: buildGroupOrder({
        childrenIds: topTokenIds,
        groupId: '',
        // it's ok if it's undefined, it will just build it alphabetically
        order: globalConfig?.order?.tokenIds,
      }),
    };

    return {
      groupsById,
      tokensById,
      globalConfig,
    };
  },
  function cleanUp({ tokensById, groupsById, globalConfig }) {
    return {
      tokensById: removeUndefinedProps(tokensById),
      groupsById: removeUndefinedProps(groupsById),
      globalConfig,
    };
  },
  function order({ tokensById, groupsById, globalConfig }) {
    const tokens: TokenData[] = [];
    const groups: TokenGroupData[] = [];

    const processTokenOrder = (tokenId: string): void => {
      const token = tokensById[tokenId];
      if (!token) throw new Error(`Token "${tokenId}" not found`);
      tokens.push(token);
    };

    const processGroupOrder = (id: string): void => {
      const group = groupsById[id];
      if (!group) throw new Error(`Group "${id}" not found`);
      const { tokenIds = [], groupIds = [] } = group.children;
      tokenIds.forEach(processTokenOrder);
      groups.push(group);
      groupIds.forEach(processGroupOrder);
    };

    // tackle the global config's order of top level tokens first
    globalConfig.order?.tokenIds?.forEach(processTokenOrder);
    // kick off the recursive process using the global config's order
    // of top level groups
    globalConfig.order?.groupIds?.forEach(processGroupOrder);
    return { tokensById, tokens, groupsById, groups, globalConfig };
  },
);

export const convertTokenGroupToData: (obj: TokenSrcGroup) => Data = memoize(
  convertTokenGroupToDataNonMemo,
  {
    // keep this many cache hits before purging
    max: 10,
    // arguments should be stringified instead of using direct equality check
    primitive: true,
    // Logging for this function
    profileName: 'convertTokenGroupToData',
    // Handle stringifying the args
    normalizer(arg: [TokenSrcGroup]) {
      // FIRST arg (the object sent in, that is)
      return JSON.stringify(arg[0]);
    },
  },
);
