import * as s from 'superstruct';

/**
 * Don't use this one, use this instead:
 * @see {@link TokenDefinitionSingular}
 */
type TokenDefinitionSingularRaw =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'color'; value: string }
  | { type: 'dimension'; value: `${number}${'px' | 'rem'}` }
  | { type: 'duration'; value: `${number}ms` }
  | {
      type: 'fontWeight';
      // @todo get extact string possible values
      value: string | number;
    }
  | { type: 'cubicBezier'; value: [number, number, number, number] };

/**
 * Definitions for both singular (non-composite) tokens.
 * Use first generic param to get just that type.
 * @example
 * ```ts
 * type TokenDefinitionDimension = TokenDefinitionSingular<'dimension'>
 * ```
 */
export type TokenDefinitionSingular<
  TheTokenType extends TokenDefinitionSingularRaw['type'] = TokenDefinitionSingularRaw['type'],
> = Extract<TokenDefinitionSingularRaw, { type: TheTokenType }>;

/**
 * Don't use this one, use this instead:
 * @see {@link TokenDefinitionComposite}
 */
type TokenDefinitionCompositeRaw =
  | {
      type: 'shadow';
      value: {
        color: { type: 'color' };
        offsetX: { type: 'dimension' };
        offsetY: { type: 'dimension' };
        spread: { type: 'dimension' };
        blur: { type: 'dimension' };
      };
    }
  | {
      type: 'transition';
      value: {
        duration: { type: 'duration' };
        delay: { type: 'duration' };
        timingFunction: { type: 'cubicBezier' };
      };
    };
// | {
//     type: 'gradient';
//     value: {
//       color: { type: 'color' };
//       position: { type: 'dimension' };
//     }[];
//   };

/**
 * Definitions for composite tokens.
 * Use first generic param to get just that type.
 * @example
 * ```ts
 * type TokenDefinitionShadow = TokenDefinitionComposite<'shadow'>
 * ```
 */
export type TokenDefinitionComposite<
  TheTokenType extends TokenDefinitionCompositeRaw['type'] = TokenDefinitionCompositeRaw['type'],
> = Extract<TokenDefinitionCompositeRaw, { type: TheTokenType }>;

/**
 * Definitions for both singular and composite tokens.
 * Use first generic param to get just that type.
 * @example
 * ```ts
 * type TokenDefinitionDimension = TokenDefinition<'dimension'>
 * ```
 */
export type TokenDefinition<
  TheTokenType extends
    | TokenDefinitionComposite['type']
    | TokenDefinitionSingular['type'] =
    | TokenDefinitionComposite['type']
    | TokenDefinitionSingular['type'],
> = Extract<
  TokenDefinitionComposite | TokenDefinitionSingular,
  { type: TheTokenType }
>;

export type TokenReference = `{${string}}`;
/** ensures there is no `{}` */
export type NotTokenReference<T> = T extends TokenReference ? never : T;

export function isNotTokenReference<T>(
  value: T,
): value is NotTokenReference<T> {
  return (
    typeof value !== 'string' || !value.startsWith('{') || !value.endsWith('}')
  );
}

export const TokenReferenceStruct = s.define<TokenReference>(
  'Token Reference',
  (value) => {
    if (typeof value !== 'string') return false;
    if (!value.startsWith('{') || !value.endsWith('}')) {
      return 'Must start and end with curly braces';
    }
    return true;
  },
);

export type TokenType = TokenDefinition['type'];
export type TokenTypeComposite = TokenDefinitionComposite['type'];
export type TokenTypeSingular = TokenDefinitionSingular['type'];

// We make a Record to ensure we have *every* possible value
// b/c TS will yell at us if a new one is added but isn't included here
// then we make an array out of them so we can be sure we have *every* possible value
const compositeTypesRecord: Record<TokenTypeComposite, TokenTypeComposite> = {
  shadow: 'shadow',
  transition: 'transition',
};
export const tokenTypeComposites = Object.values(compositeTypesRecord);
const singularTypesRecord: Record<TokenTypeSingular, TokenTypeSingular> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  color: 'color',
  dimension: 'dimension',
  duration: 'duration',
  fontWeight: 'fontWeight',
  cubicBezier: 'cubicBezier',
};
export const tokenTypeSingulars = Object.values(singularTypesRecord);
export function isTokenTypeComposite(
  type: TokenType,
): type is TokenTypeComposite {
  return tokenTypeComposites.includes(type as TokenTypeComposite);
}
export function isTokenTypeSingular(
  type: TokenType,
): type is TokenTypeSingular {
  return tokenTypeSingulars.includes(type as TokenTypeSingular);
}
