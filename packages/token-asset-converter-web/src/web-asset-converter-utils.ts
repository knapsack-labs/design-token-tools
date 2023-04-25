import { TokenData } from '@knapsack-labs/token-data';

/**
 * Ensure references ({color.blue}) are BELOW the referenced token.
 */
function sortRefsAfterReferenced(a: TokenData, b: TokenData): -1 | 1 | 0 {
  // > 0	sort a after b
  // < 0	sort a before b
  // === 0	keep original order of a and b
  const aRefs = a.references?.flat() ?? [];
  const bRefs = b.references?.flat() ?? [];
  if (aRefs.length === 0 && bRefs.length === 0) {
    return 0;
  }
  if (aRefs.length > 0 && bRefs.length === 0) {
    return 1;
  }
  if (aRefs.length === 0 && bRefs.length > 0) {
    return -1;
  }
  if (aRefs.includes(b.id)) {
    return 1;
  }
  if (bRefs.includes(a.id)) {
    return -1;
  }
  return 0;
}

/**
 * Sort the entire TokenData array. Does not mutate.
 */
export function sortTokenData(tokenDatas: TokenData[]): TokenData[] {
  return [...tokenDatas].sort(sortRefsAfterReferenced);
}

export function formatShadowTokenValue(value: TokenData<'shadow'>['value']) {
  return `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`;
}

export function formatCubicBezierValue(
  value: TokenData<'cubicBezier'>['value'],
) {
  return `cubic-bezier(${value.join(',')})`;
}

export function formatTransitionValue(value: TokenData<'transition'>['value']) {
  const easingFunction = formatCubicBezierValue(value.timingFunction);
  return `${value.duration} ${easingFunction} ${value.delay}`;
}
