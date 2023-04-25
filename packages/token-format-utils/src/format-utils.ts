import { ValidationResult } from './types';

export function validateName(name: string | number | symbol): string[] {
  if (typeof name === 'symbol') {
    throw new Error('Symbol is not a valid key');
  }
  // all number keys are valid
  if (typeof name === 'number') return [];

  const msgs: string[] = [];

  if (name.startsWith('$')) {
    msgs.push('Should not start with "$"');
  }
  if (name.includes('.')) {
    msgs.push('Should not include "."');
  }
  if (name.includes('{')) {
    msgs.push('Should not include "}"');
  }
  if (name.includes('}')) {
    msgs.push('Should not include "}"');
  }
  return msgs;
}

/** Basic formatting as a string */
export function formatValidationResults(results: ValidationResult[]): string {
  return results
    .map(({ id, msgs }) => {
      return `"${id}": ${msgs.join(', ')}`;
    })
    .join('\n');
}

const invalidGroupNameRegex = /[" +"./\\]/g;

/**
 * Tests that token names do not include . / \
 */
export function validateGroupTokenName(groupName: string) {
  const matches = groupName.match(invalidGroupNameRegex);
  if (matches) {
    throw new Error(
      `Group has an unsupported character(s): ${matches.join(' ')}`,
    );
  }
}
