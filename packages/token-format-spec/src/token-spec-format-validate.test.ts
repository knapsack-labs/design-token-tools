import test from 'ava';
import { validateTokenSrcGroup } from './token-spec-format-validate';

test('basic validation', (t) => {
  const results = validateTokenSrcGroup({
    $extensions: {
      'cloud.knapsack': {
        global: {
          prefix: 'knapsack',
        },
      },
    },
    colors: {
      $extensions: {
        'cloud.knapsack': {
          order: ['white', 'black', 'background'],
        },
      },
      white: {
        $extensions: {
          'cloud.knapsack': {
            token: {
              intendedPurpose: 'background',
            },
          },
        },
        $value: '#FFFFFF',
        type: 'color',
      },
      black: {
        $value: '#000000',
        type: 'color',
      },
      background: {
        $value: '{colors.white}',
      },
    },
  });
  // Should be no errors
  t.falsy(results.errorMsg);
});

test('basic invalidation', (t) => {
  const results = validateTokenSrcGroup({
    colors: {
      white: {
        $value: '#FFFFFF',
        type: 'color',
      },
      black: {
        $value: '#000000',
        type: 'color',
      },
      background: {
        $value: '{colors.white.$value}', // note use of `.$value`
      },
    },
  });
  // Should be at least one error
  t.truthy(results.errorMsg);
});

test('catch bad reference', (t) => {
  const results = validateTokenSrcGroup({
    colors: {
      white: {
        $value: '#FFFFFF',
        type: 'color',
      },
      black: {
        $value: '#000000',
        type: 'color',
      },
      background: {
        $value: '{colors.flerp}', // Note: doesn't exist
      },
    },
  });
  // Should be at least one error
  t.truthy(results.errorMsg);
});

test('catch name with bad symbol', (t) => {
  const results = validateTokenSrcGroup({
    colors: {
      white: {
        $value: '#FFFFFF',
        type: 'color',
      },
      // should not start with `$`
      $black: {
        $value: '#000000',
        type: 'color',
      },
      background: {
        $value: '{colors.white}',
      },
    },
  });
  t.is(results.errorMsg, '"colors.$black": Should not start with "$"');
});
