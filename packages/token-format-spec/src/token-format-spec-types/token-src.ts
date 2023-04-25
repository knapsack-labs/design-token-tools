import { Simplify, expectType, isObjKey, isObject } from '@knapsack/utils';
import {
  TokenDefinitionComposite,
  TokenDefinitionSingular,
  TokenReference,
  TokenType,
  TokenDefinition,
} from './token-definitions';
import { TokenKsExtensions } from './token-misc';

export type TokenSrcCommon<TheType extends TokenType = TokenType> = {
  $type?: TokenDefinition<TheType>['type'];
  $description?: string;
  $extensions?: {
    'cloud.knapsack'?: TokenKsExtensions;
  };
};

export function isTokenSrcExtensions(
  extensionsObj: unknown,
): extensionsObj is TokenSrcCommon['$extensions'] {
  return isObject(extensionsObj) && isObjKey('cloud.knapsack', extensionsObj);
}

type CreateSrcValueForComposite<
  ValueObj extends Record<string, { type: TokenDefinitionSingular['type'] }>,
> = {
  [Key in keyof ValueObj]:
    | TokenReference
    | TokenDefinitionSingular<ValueObj[Key]['type']>['value'];
};

type TokenSrcValueCompositeRaw = {
  [TheTokenType in TokenDefinitionComposite['type']]: Simplify<{
    type: TheTokenType;
    value: Simplify<
      CreateSrcValueForComposite<
        TokenDefinitionComposite<TheTokenType>['value']
      >
    >;
  }>;
}[TokenDefinitionComposite['type']];

type TokenSrcValueComposite<
  TT extends TokenSrcValueCompositeRaw['type'] = TokenSrcValueCompositeRaw['type'],
> = Extract<TokenSrcValueCompositeRaw, { type: TT }>;

type TokenSrcValueRaw = TokenDefinitionSingular | TokenSrcValueComposite;

export type TokenSrcValue<
  Type extends
    | TokenDefinitionSingular['type']
    | TokenSrcValueComposite['type'] =
    | TokenDefinitionSingular['type']
    | TokenSrcValueComposite['type'],
> = Extract<TokenSrcValueRaw, { type: Type }>['value'] | TokenReference;

expectType<TokenSrcValue[]>([
  '#ddd',
  true,
  [83, 1, 1, 1],
  {
    color: '#000',
    offsetX: '0px',
    offsetY: '{spacing.medium}',
    spread: '0px',
    blur: '0px',
  },
  {
    timingFunction: '{timing.ease}',
    duration: '{timing.duration.medium}',
    delay: '7ms',
    color: '#000',
  },
]);

export type TokenSrc<
  TheType extends
    | TokenDefinitionSingular['type']
    | TokenSrcValueComposite['type'] =
    | TokenDefinitionSingular['type']
    | TokenSrcValueComposite['type'],
> = Simplify<
  {
    $value: TokenSrcValue<TheType>;
  } & TokenSrcCommon<TheType>
>;

export function isTokenSrc(tokenObject: unknown): tokenObject is TokenSrc {
  if (isObject(tokenObject) && isObjKey('$value', tokenObject)) return true;
  return false;
}

export type TokenSrcGroup = TokenSrcCommon & {
  [key: string]:
    | TokenSrcGroup
    | TokenSrc
    | TokenSrcCommon
    | TokenSrcCommon['$extensions'];
};

export function isTokenGroup(
  tokenObject: unknown,
): tokenObject is TokenSrcGroup {
  // @todo improve
  return (
    isObject(tokenObject) &&
    !isTokenSrcExtensions(tokenObject) &&
    !isObjKey('$value', tokenObject) &&
    // ensuring we are not in `$extensions` object
    !isObjKey('cloud.knapsack', tokenObject)
  );
}
