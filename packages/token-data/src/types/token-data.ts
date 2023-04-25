import { Simplify, isObjKey, isObject, isFunction } from '@knapsack/utils';
import * as s from 'superstruct';
import {
  NotTokenReference,
  TokenDefinition,
  TokenDefinitionComposite,
  TokenDefinitionSingular,
  TokenReference,
  TokenReferenceStruct,
  TokenType,
  TokenKsExtensions,
  TokenOrder,
  hasTokenReferences,
  TokenSrcValue,
} from '@knapsack-labs/token-format-spec';
import { TypeEqual, expectType } from 'ts-expect';

/** Used for tokens AND groups */
type TokenDataBothCommon = {
  id: string;
  description?: string;
};

// Shows what a fully de-referenced `value` of a composite token would be
type CreateDataValueForComposite<
  ValueObj extends Record<string, { type: TokenDefinitionSingular['type'] }>,
> = {
  [Key in keyof ValueObj]: TokenDefinitionSingular<
    ValueObj[Key]['type']
  >['value'];
};

expectType<
  CreateDataValueForComposite<TokenDefinitionComposite<'shadow'>['value']>
>({
  color: '#000',
  offsetX: '0px',
  offsetY: '0px',
  spread: '0px',
  blur: '0px',
});

// used in `TokenData.getTokenValue()` for return result
type ValueForCss<V> = V extends boolean
  ? V
  : V extends number
  ? V
  : V extends string
  ? V
  : string;
// booleans stay booleans
expectType<TypeEqual<ValueForCss<boolean>, boolean>>(true);
// numbers stay numbers
expectType<TypeEqual<ValueForCss<number>, number>>(true);
// strings stay strings
expectType<TypeEqual<ValueForCss<string>, string>>(true);
// shadows should get turned into strings
expectType<
  TypeEqual<
    ValueForCss<
      CreateDataValueForComposite<TokenDefinitionComposite<'shadow'>['value']>
    >,
    string
  >
>(true);
// it should still preserve strings that are unique w/o downgrading them to `string`
expectType<
  TypeEqual<
    ValueForCss<TokenDefinitionSingular<'dimension'>['value']>,
    `${number}px` | `${number}rem`
  >
>(true);

type TokenDataCommon<
  Info extends {
    /** Basically the ID */
    type: TokenDefinition['type'];
    value: unknown;
  },
> = TokenDataBothCommon & {
  type: Info['type'];
  value: Info['value'];
  /**
   * Extracted from `$extensions['cloud.knapsack'].token`
   */
  tokenConfig?: TokenKsExtensions['token'];
  /**
   * Tokens that are references by this token
   * @todo will need to change for shadow
   * @example
   * ```
   * [
   *  ['color.primary', 'color.secondary'],
   *  ['spacing.medium']
   * ]
   * ```
   */
  references?: Array<string[]>;
  /**
   * Tokens that use this as a reference token
   * @see {CreateTokenData.references}
   * @example
   * * ```
   * [
   *  ['color.primary', 'color.secondary'],
   *  ['spacing.medium']
   * ]
   * ```
   */
  // referencedBy?: Array<string[]>;
};

type CreateTokenData<
  Info extends {
    type: TokenDefinition['type'];
    value: unknown;
  },
> =
  | ({
      kind: 'ref';
      /** Has `{}` removed */
      referencedTokenId: string;
      originalValue: TokenReference;
    } & TokenDataCommon<Info>)
  | ({
      kind: 'static';
      originalValue: NotTokenReference<TokenSrcValue<Info['type']>>;
    } & TokenDataCommon<Info>);

// @ts-expect-error - TS is being dumb - this is right
const TokenDataBaseStruct: s.Describe<
  TokenDataBothCommon & {
    references?: Array<string[]>;
    tokenConfig?: TokenKsExtensions['token'];
  }
> = s.type({
  id: s.string(),
  description: s.optional(s.string()),
  references: s.optional(s.array(s.array(s.string()))),
  tokenConfig: s.optional(
    s.type({
      purpose: s.optional(s.string()),
    }),
  ),
});

type TokenDataSingularRaw = {
  // ignore the key, this makes a discriminated union out of the values
  [TokenDef in TokenDefinitionSingular as TokenDef['type']]: Simplify<
    CreateTokenData<TokenDef>
  >;
}[TokenDefinitionSingular['type']];

export type TokenDataSingular<
  TT extends TokenDataSingularRaw['type'] = TokenDataSingularRaw['type'],
> = Extract<TokenDataSingularRaw, { type: TT }>;

expectType<TokenDataSingular[]>([
  {
    type: 'duration',
    value: '1ms',
    originalValue: '1ms',
    id: '1',
    kind: 'static',
  },
  {
    type: 'duration',
    value: '1ms',
    kind: 'ref',
    id: '1',
    originalValue: '{a.b}',
    referencedTokenId: '1',
  },
  // @ts-expect-error - kind is wrong
  {
    type: 'duration',
    value: '1ms',
    originalValue: '1ms',
    id: '1',
    kind: 'ref',
  },
  // @ts-expect-error - kind is wrong
  {
    type: 'duration',
    value: '1ms',
    kind: 'static',
    id: '1',
    originalValue: '{a.b}',
    referencedTokenId: '1',
  },
  {
    type: 'color',
    value: '#000',
    kind: 'static',
    id: '1',
    originalValue: '#000',
  },
  {
    type: 'color',
    value: '#000',
    kind: 'ref',
    id: '1',
    originalValue: '{c.b}',
    referencedTokenId: 'c.b',
  },
  {
    type: 'cubicBezier',
    kind: 'static',
    value: [0, 0, 0, 1],
    originalValue: [0, 0, 0, 1],
    id: '1',
  },
]);

type TokenDataCompositeRaw = {
  [TokenType in TokenDefinitionComposite['type']]: Simplify<
    CreateTokenData<{
      type: TokenType;
      value: Simplify<
        CreateDataValueForComposite<
          TokenDefinitionComposite<TokenType>['value']
        >
      >;
    }>
  >;
}[TokenDefinitionComposite['type']];

export type TokenDataComposite<
  TheTokenType extends TokenDataCompositeRaw['type'] = TokenDataCompositeRaw['type'],
> = Extract<TokenDataCompositeRaw, { type: TheTokenType }>;

expectType<TokenDataComposite[]>([
  {
    type: 'shadow',
    value: {
      color: '#000',
      offsetX: '1px',
      offsetY: '1px',
      blur: '1px',
      spread: '1px',
    },
    originalValue: {
      color: '#000',
      offsetX: '{a.a}',
      offsetY: '1px',
      blur: '1px',
      spread: '1px',
    },
    id: '1',
    kind: 'static',
  },
  {
    type: 'shadow',
    kind: 'ref',
    referencedTokenId: 'a.b',
    value: {
      color: 'red',
      offsetX: '1px',
      blur: '2px',
      offsetY: '3px',
      spread: '4px',
    },
    originalValue: '{a.b}',
    id: '1',
  },
  {
    type: 'transition',
    value: {
      duration: '100ms',
      delay: '200ms',
      timingFunction: [0, 0, 0, 0],
    },
    originalValue: '{a.b}',
    kind: 'ref',
    referencedTokenId: 'a.b',
    id: '1',
  },
  {
    type: 'transition',
    kind: 'static',
    value: {
      duration: '100ms',
      delay: '200ms',
      timingFunction: [0, 0, 0, 0],
    },
    originalValue: {
      duration: '100ms',
      delay: '{a.c}',
      timingFunction: '{a.c}',
    },
    id: '1',
  },
  {
    type: 'transition',
    kind: 'static',
    value: {
      duration: '100ms',
      delay: '200ms',
      timingFunction: [0, 0, 0, 0],
    },
    originalValue: {
      duration: '100ms',
      delay: '200ms',
      timingFunction: [0, 0, 0, 0],
    },
    id: '1',
  },
]);

export type TokenData<
  TheTokenType extends TokenDataSingular['type'] | TokenDataComposite['type'] =
    | TokenDataSingular['type']
    | TokenDataComposite['type'],
> = Extract<TokenDataSingular | TokenDataComposite, { type: TheTokenType }>;

export type TokenGroupData = Simplify<
  {
    type?: TokenType;
    /**
     * Extracted from `$extensions['cloud.knapsack'].group`
     */
    groupConfig?: TokenKsExtensions['group'];
    children: TokenOrder;
  } & TokenDataBothCommon
>;

// this function exists purely to add the return type annotation
function createGetTokenValueStruct<T extends boolean | string | number>(
  name = 'Get Token Value',
) {
  return s.define<() => T>(name, isFunction);
}

/**
 * @deprecated Use `TokenValueColorStruct` instead
 */
export function isTokenValueColor(
  value: unknown,
): value is TokenDefinitionSingular<'color'>['value'] {
  return typeof value === 'string' && !hasTokenReferences(value);
}

export const TokenValueColorStruct = s.define<TokenData<'color'>['value']>(
  'Color Value',
  (value) => {
    if (typeof value !== 'string') {
      return 'Value must be a string';
    }
    if (value === '') {
      return 'Value must not be empty';
    }
    if (hasTokenReferences(value)) {
      return 'Value must not contain {} (token references)';
    }
    return true;
  },
);

const TokenDataColorNonRefStruct: s.Describe<
  Extract<TokenData<'color'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('color'),
    value: TokenValueColorStruct,
    kind: s.literal('static'),
    originalValue: TokenValueColorStruct,
  }),
  TokenDataBaseStruct,
);

const TokenDataColorRefStruct: s.Describe<
  Extract<TokenData<'color'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('color'),
    value: TokenValueColorStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * @deprecated Use `TokenValueDimensionStruct` instead
 */
export function isTokenValueDimension(
  value: unknown,
): value is TokenDefinitionSingular<'dimension'>['value'] {
  return (
    typeof value === 'string' &&
    (value.endsWith('px') || value.endsWith('rem')) &&
    !hasTokenReferences(value)
  );
}

export const TokenValueDimensionStruct = s.define<
  TokenData<'dimension'>['value']
>('Dimension Value', (value) => {
  if (typeof value !== 'string') {
    return 'Value must be a string';
  }
  if (hasTokenReferences(value)) {
    return 'Value must not contain {} (token references)';
  }
  if (!value.endsWith('px') && !value.endsWith('rem')) {
    return 'Value must end with px or rem';
  }
  return true;
});

const TokenDataDimensionNonRefStruct: s.Describe<
  Extract<TokenData<'dimension'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('dimension'),
    value: TokenValueDimensionStruct,
    kind: s.literal('static'),
    originalValue: TokenValueDimensionStruct,
  }),
  TokenDataBaseStruct,
);

const TokenDataDimensionRefStruct: s.Describe<
  Extract<TokenData<'dimension'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('dimension'),
    value: TokenValueDimensionStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * @deprecated Use `TokenValueDurationStruct` instead
 */
export function isTokenValueDuration(
  value: unknown,
): value is TokenDefinitionSingular<'duration'>['value'] {
  return (
    typeof value === 'string' &&
    value.endsWith('ms') &&
    !hasTokenReferences(value)
  );
}

export const TokenValueDurationStruct = s.define<
  TokenData<'duration'>['value']
>('Duration Value', (value) => {
  if (typeof value !== 'string') {
    return 'Value must be a string';
  }
  if (hasTokenReferences(value)) {
    return 'Value must not contain {} (token references)';
  }
  if (!value.endsWith('ms')) {
    return 'Value must end with ms';
  }
  return true;
});

const TokenDataDurationNonRefStruct: s.Describe<
  Extract<TokenData<'duration'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('duration'),
    value: TokenValueDurationStruct,
    kind: s.literal('static'),
    originalValue: TokenValueDurationStruct,
  }),
  TokenDataBaseStruct,
);

const TokenDataDurationRefStruct: s.Describe<
  Extract<TokenData<'duration'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('duration'),
    value: TokenValueDurationStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * @deprecated Use `TokenValueFontWeightStruct` instead
 */
export function isTokenValueFontWeight(
  value: unknown,
): value is TokenDefinitionSingular<'fontWeight'>['value'] {
  return (
    (typeof value === 'string' || typeof value === 'number') &&
    !hasTokenReferences(value)
  );
}

export const TokenValueFontWeightStruct = s.define<
  TokenData<'fontWeight'>['value']
>('Font Weight Value', (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return 'Value must be a string or number';
  }
  if (hasTokenReferences(value)) {
    return 'Value must not contain {} (token references)';
  }
  return true;
});

const TokenDataFontWeightNonRefStruct: s.Describe<
  Extract<TokenData<'fontWeight'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('fontWeight'),
    value: TokenValueFontWeightStruct,
    kind: s.literal('static'),
    originalValue: TokenValueFontWeightStruct,
  }),
  TokenDataBaseStruct,
);

const TokenDataFontWeightRefStruct: s.Describe<
  Extract<TokenData<'fontWeight'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('fontWeight'),
    value: TokenValueFontWeightStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * @deprecated Use `TokenValueCubicBezierStruct` instead
 */
export function isTokenValueCubicBezier(
  value: unknown,
): value is TokenDefinitionSingular<'cubicBezier'>['value'] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === 'number')
  );
}

export const TokenValueCubicBezierStruct = s.define<
  TokenData<'cubicBezier'>['value']
>('Cubic Bezier Value', (value) => {
  if (!Array.isArray(value)) {
    return 'Value must be an array';
  }
  if (value.length !== 4) {
    return 'Value must be an array of 4 numbers';
  }
  if (!value.every((v) => typeof v === 'number')) {
    return 'Value must be an array of 4 numbers';
  }
  return true;
});

const TokenDataCubicBezierNonRefStruct: s.Describe<
  Extract<TokenData<'cubicBezier'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('cubicBezier'),
    value: TokenValueCubicBezierStruct,
    kind: s.literal('static'),
    originalValue: TokenValueCubicBezierStruct,
  }),
  TokenDataBaseStruct,
);

const TokenDataCubicBezierRefStruct: s.Describe<
  Extract<TokenData<'cubicBezier'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('cubicBezier'),
    value: TokenValueCubicBezierStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * Determines if it's a "shadow" token value AND totally de-referenced
 */
export function isTokenValueShadow(
  value: unknown,
): value is Simplify<
  CreateDataValueForComposite<TokenDefinitionComposite<'shadow'>['value']>
> {
  return (
    isObject(value) &&
    isTokenValueColor(value.color) &&
    isTokenValueDimension(value.offsetX) &&
    isTokenValueDimension(value.offsetY) &&
    isTokenValueDimension(value.blur) &&
    isTokenValueDimension(value.spread)
  );
}

const TokenValueShadowStruct = s.define<TokenData<'shadow'>['value']>(
  'Shadow Value',
  (value) => {
    if (isTokenValueShadow(value)) return true;
    return `Expected a shadow value, got ${JSON.stringify(value)}`;
  },
);

const TokenDataShadowNonRefStruct: s.Describe<
  Extract<TokenData<'shadow'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('shadow'),
    value: TokenValueShadowStruct,
    kind: s.literal('static'),
    originalValue: s.type({
      color: s.union([TokenValueColorStruct, TokenReferenceStruct]),
      offsetX: s.union([TokenValueDimensionStruct, TokenReferenceStruct]),
      offsetY: s.union([TokenValueDimensionStruct, TokenReferenceStruct]),
      blur: s.union([TokenValueDimensionStruct, TokenReferenceStruct]),
      spread: s.union([TokenValueDimensionStruct, TokenReferenceStruct]),
    }),
  }),
  TokenDataBaseStruct,
);

const TokenDataShadowRefStruct: s.Describe<
  Extract<TokenData<'shadow'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('shadow'),
    value: TokenValueShadowStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

/**
 * Determines if it's a "transition" token value AND totally de-referenced
 */
export function isTokenValueTransition(
  value: unknown,
): value is Simplify<
  CreateDataValueForComposite<TokenDefinitionComposite<'transition'>['value']>
> {
  return (
    isObject(value) &&
    isTokenValueCubicBezier(value.timingFunction) &&
    isTokenValueDuration(value.duration) &&
    isTokenValueDuration(value.delay)
  );
}
const TokenValueTransitionStruct = s.define<TokenData<'transition'>['value']>(
  'Transition Value',
  isTokenValueTransition,
);

const TokenDataTransitionNonRefStruct: s.Describe<
  Extract<TokenData<'transition'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('transition'),
    value: TokenValueTransitionStruct,
    kind: s.literal('static'),
    originalValue: s.type({
      timingFunction: s.union([
        TokenValueCubicBezierStruct,
        TokenReferenceStruct,
      ]),
      duration: s.union([TokenValueDurationStruct, TokenReferenceStruct]),
      delay: s.union([TokenValueDurationStruct, TokenReferenceStruct]),
    }),
  }),
  TokenDataBaseStruct,
);

const TokenDataTransitionRefStruct: s.Describe<
  Extract<TokenData<'transition'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('transition'),
    value: TokenValueTransitionStruct,
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

const TokenDataStringNonRefStruct: s.Describe<
  Extract<TokenData<'string'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('string'),
    value: s.string(),
    kind: s.literal('static'),
    originalValue: s.string(),
  }),
  TokenDataBaseStruct,
);

const TokenDataStringRefStruct: s.Describe<
  Extract<TokenData<'string'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('string'),
    value: s.string(),
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

const TokenDataNumberNonRefStruct: s.Describe<
  Extract<TokenData<'number'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('number'),
    value: s.number(),
    kind: s.literal('static'),
    originalValue: s.number(),
  }),
  TokenDataBaseStruct,
);

const TokenDataNumberRefStruct: s.Describe<
  Extract<TokenData<'number'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('number'),
    value: s.number(),
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

const TokenDataBooleanNonRefStruct: s.Describe<
  Extract<TokenData<'boolean'>, { kind: 'static' }>
> = s.assign(
  s.type({
    type: s.literal('boolean'),
    value: s.boolean(),
    kind: s.literal('static'),
    originalValue: s.boolean(),
  }),
  TokenDataBaseStruct,
);

const TokenDataBooleanRefStruct: s.Describe<
  Extract<TokenData<'boolean'>, { kind: 'ref' }>
> = s.assign(
  s.type({
    type: s.literal('boolean'),
    value: s.boolean(),
    kind: s.literal('ref'),
    originalValue: TokenReferenceStruct,
    referencedTokenId: s.string(),
  }),
  TokenDataBaseStruct,
);

// Instead of using `s.union` to combine all the token data structs,
// we first find out what "type" the token is
// then we find out `kind` - which is our 2nd layer of discriminated union
// and then use the specific struct
// that way the errors are more specific to the actual declared token "type"
// In a nutshell, `s.union` is not very good at discriminated unions errors
export function assertTokenData(data: unknown): asserts data is TokenData {
  if (!isObject(data)) {
    throw new Error(
      `Expected token data to be an object, got ${JSON.stringify(data)}`,
    );
  }
  if (!isObjKey('type', data)) {
    throw new Error(
      `Expected token data to have a "type" property, got ${JSON.stringify(
        data,
      )}`,
    );
  }
  if (typeof data.type !== 'string') {
    throw new Error(
      `Expected token data "type" property to be a string, got ${JSON.stringify(
        data,
      )}`,
    );
  }
  const type = data.type as TokenData['type'];
  const kind = data.kind as TokenData['kind'];
  try {
    switch (type) {
      case 'boolean':
        if (kind === 'ref') {
          TokenDataBooleanRefStruct.assert(data);
        } else {
          TokenDataBooleanNonRefStruct.assert(data);
        }
        return;
      case 'color':
        if (kind === 'ref') {
          TokenDataColorRefStruct.assert(data);
        } else {
          TokenDataColorNonRefStruct.assert(data);
        }
        return;
      case 'cubicBezier':
        if (kind === 'ref') {
          TokenDataCubicBezierRefStruct.assert(data);
        } else {
          TokenDataCubicBezierNonRefStruct.assert(data);
        }
        return;
      case 'dimension':
        if (kind === 'ref') {
          TokenDataDimensionRefStruct.assert(data);
        } else {
          TokenDataDimensionNonRefStruct.assert(data);
        }
        return;
      case 'duration':
        if (kind === 'ref') {
          TokenDataDurationRefStruct.assert(data);
        } else {
          TokenDataDurationNonRefStruct.assert(data);
        }
        return;
      case 'fontWeight':
        if (kind === 'ref') {
          TokenDataFontWeightRefStruct.assert(data);
        } else {
          TokenDataFontWeightNonRefStruct.assert(data);
        }
        return;
      case 'number':
        if (kind === 'ref') {
          TokenDataNumberRefStruct.assert(data);
        } else {
          TokenDataNumberNonRefStruct.assert(data);
        }
        return;
      case 'shadow':
        if (kind === 'ref') {
          TokenDataShadowRefStruct.assert(data);
        } else {
          TokenDataShadowNonRefStruct.assert(data);
        }
        return;
      case 'string':
        if (kind === 'ref') {
          TokenDataStringRefStruct.assert(data);
        } else {
          TokenDataStringNonRefStruct.assert(data);
        }
        return;
      case 'transition':
        if (kind === 'ref') {
          TokenDataTransitionRefStruct.assert(data);
        } else {
          TokenDataTransitionNonRefStruct.assert(data);
        }
        return;
      default: {
        const exhaustiveCheck: never = type;
        throw new Error(`Unknown token data type: ${type}`);
      }
    }
  } catch (error) {
    if (!(error instanceof s.StructError)) throw error;
    throw new Error(
      `Invalid token data for type "${type}": ${
        error.message
      }. Received this data: "${JSON.stringify(data)}"`,
    );
  }
}
