import loGet from 'lodash/get.js';
import { isObject } from '@knapsack/utils';
import {
  validateName,
  formatValidationResults,
  ValidationResult,
  Validator,
} from '@knapsack-labs/token-format-utils';
import {
  isTokenGroup,
  isTokenSrc,
  TokenSrc,
  TokenSrcGroup,
} from './token-format-spec-types';
import { parseValueChunks } from './token-spec-format-utils';

export const validateTokenSrcGroup: Validator<TokenSrcGroup> = (tokensSrc) => {
  if (!isObject(tokensSrc)) {
    const errorMsg = `Must be an object, received: "${JSON.stringify(
      tokensSrc,
    )}"`;
    return {
      errorMsg,
      errors: [
        {
          id: '.',
          msgs: [errorMsg],
        },
      ],
    };
  }

  function recursiveValidate({
    obj,
    keyPath = [],
    results = [],
  }: {
    obj: Record<string | number, unknown>;
    keyPath?: string[];
    results?: ValidationResult[];
  }): ValidationResult[] {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === '$extensions') return;
      const thisPath = [...keyPath, key];
      const id = thisPath.join('.');
      const thisMsgs: string[] = [];

      // Only test keys that have NON-token objects (group names)
      if (isTokenGroup(value) && key !== '$value') {
        thisMsgs.push(...validateName(key));
      }

      // Is this a token? A token object has a $value key
      if (isTokenSrc(value)) {
        // Valid token stuff goes here
        thisMsgs.push(...validateName(key));
      }

      if (
        key === '$value' &&
        typeof value === 'string' &&
        value.includes('{')
      ) {
        if (value.includes('.$value}')) {
          thisMsgs.push(
            `Reference tokens syntax should not end in '.$value}', instead was: "${value}"`,
          );
        }
        if (value.includes('.value}')) {
          thisMsgs.push(
            `Reference tokens syntax should not end in '.value}', instead was: "${value}"`,
          );
        }
        parseValueChunks(value).forEach((chunk) => {
          if (chunk.type === 'ref') {
            // Find at least one token for this reference, ensure it exists
            if (!loGet(tokensSrc, chunk.id, false)) {
              thisMsgs.push(
                `Original token does not exist for reference: "${chunk.id}"`,
              );
            }
          }
        });
      }

      if (thisMsgs.length > 0) {
        results.push({
          id,
          msgs: thisMsgs,
        });
      } else if (isObject(value)) {
        if (thisMsgs.length > 0) {
          results.push({
            id,
            msgs: thisMsgs,
          });
        } else {
          recursiveValidate({
            obj: value,
            keyPath: thisPath,
            results,
          });
        }
      }
    });

    return results;
  }

  const errors = recursiveValidate({ obj: tokensSrc });

  return {
    errorMsg: formatValidationResults(errors),
    errors,
    data: tokensSrc as TokenSrcGroup,
  };
};
