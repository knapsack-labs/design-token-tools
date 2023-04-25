import { TokenReference } from './token-definitions';

export function getPrimitiveValue(
  tokenValue: unknown,
): 'string' | 'number' | 'boolean' {
  const type = typeof tokenValue;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return type;
  }
  throw new Error(`Invalid token value type: ${type}`);
}

export function isTokenReference(val: unknown): val is TokenReference {
  return typeof val === 'string' && val.startsWith('{') && val.endsWith('}');
}

export function hasTokenReferences(val: unknown): boolean {
  return typeof val === 'string' && val.includes('{');
}
