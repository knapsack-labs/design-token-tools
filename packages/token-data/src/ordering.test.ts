import test from 'ava';
import { convertTokenGroupToData } from './convert-src-to-token-data';

test('top level group ordering alphabetizes w/no config', (t) => {
  const data = convertTokenGroupToData({
    oranges: {},
    apples: {},
    bananas: {},
  });
  t.deepEqual(
    data.groups.map((g) => g.id),
    ['apples', 'bananas', 'oranges'],
  );
});

test('top level group ordering w/ config', (t) => {
  const data = convertTokenGroupToData({
    $extensions: {
      'cloud.knapsack': {
        global: {
          order: {
            groupIds: ['bananas', 'apples', 'oranges'],
          },
        },
      },
    },
    oranges: {},
    apples: {},
    bananas: {},
  });
  t.deepEqual(
    data.groups.map((g) => g.id),
    ['bananas', 'apples', 'oranges'],
  );
});

test('no user configured ordering still creates order alpha info', (t) => {
  const data = convertTokenGroupToData({
    spacing: {
      $type: 'dimension',
      b: {
        $value: '2px',
      },
      a: {
        $value: '1px',
      },
      c: {
        $value: '3px',
      },
    },
    color: {
      $type: 'color',
      greys: {
        200: {
          $value: '#e0e0e0',
        },
        300: {
          $value: '#e0e0e0',
        },
        100: {
          $value: '#f0f0f0',
        },
      },
      brand: {
        secondary: {
          $value: '#e0e0e0',
        },
        primary: {
          $value: '#f0f0f0',
        },
      },
    },
  });
  const {
    spacing,
    color,
    'color.brand': colorBrand,
    'color.greys': colorGreys,
  } = data.groupsById;

  t.deepEqual(color.children.groupIds, ['color.brand', 'color.greys']);
  t.deepEqual(spacing.children.tokenIds, [
    'spacing.a',
    'spacing.b',
    'spacing.c',
  ]);
  t.deepEqual(colorBrand.children.tokenIds, [
    'color.brand.primary',
    'color.brand.secondary',
  ]);
  t.deepEqual(colorGreys.children.tokenIds, [
    'color.greys.100',
    'color.greys.200',
    'color.greys.300',
  ]);
  t.deepEqual(data.globalConfig?.order?.groupIds, ['color', 'spacing']);
  t.is(
    Object.keys(data.groupsById).length,
    data.groups.length,
    'Both the groups array and the groupsById object should have the same number of items',
  );
  t.is(
    Object.keys(data.tokensById).length,
    data.tokens.length,
    'Both the tokens array and the tokensById object should have the same number of items',
  );
  t.deepEqual(
    data.groups.map((group) => group.id),
    ['color', 'color.brand', 'color.greys', 'spacing'],
  );
  t.deepEqual(
    data.tokens.map((token) => token.id),
    [
      'color.brand.primary',
      'color.brand.secondary',
      'color.greys.100',
      'color.greys.200',
      'color.greys.300',
      'spacing.a',
      'spacing.b',
      'spacing.c',
    ],
  );
});

test('user configured ordering is used', (t) => {
  const data = convertTokenGroupToData({
    $extensions: {
      'cloud.knapsack': {
        global: {
          order: {
            groupIds: ['color', 'spacing'],
          },
        },
      },
    },
    spacing: {
      $type: 'dimension',
      $extensions: {
        'cloud.knapsack': {
          group: {
            order: {
              tokenIds: ['c', 'b', 'a'],
            },
          },
        },
      },
      b: {
        $value: '2px',
      },
      a: {
        $value: '1px',
      },
      c: {
        $value: '3px',
      },
    },
    color: {
      $type: 'color',
      $extensions: {
        'cloud.knapsack': {
          group: {
            order: {
              tokenIds: ['brand', 'greys'],
            },
          },
        },
      },
      greys: {
        $extensions: {
          'cloud.knapsack': {
            group: {
              order: {
                tokenIds: ['100', '200', '300'],
              },
            },
          },
        },
        200: {
          $value: '#e0e0e0',
        },
        300: {
          $value: '#e0e0e0',
        },
        100: {
          $value: '#f0f0f0',
        },
      },
      brand: {
        $extensions: {
          'cloud.knapsack': {
            group: {
              order: {
                tokenIds: ['primary', 'secondary'],
              },
            },
          },
        },
        secondary: {
          $value: '#e0e0e0',
        },
        primary: {
          $value: '#f0f0f0',
        },
      },
    },
  });
  const {
    spacing,
    color,
    'color.brand': colorBrand,
    'color.greys': colorGreys,
  } = data.groupsById;
  t.deepEqual(spacing.children.tokenIds, [
    'spacing.c',
    'spacing.b',
    'spacing.a',
  ]);
  t.deepEqual(
    spacing.groupConfig?.order?.tokenIds,
    ['c', 'b', 'a'],
    'original relative IDs are preserved in group config',
  );
  t.deepEqual(color.children.groupIds, ['color.brand', 'color.greys']);
  t.deepEqual(colorBrand.children.tokenIds, [
    'color.brand.primary',
    'color.brand.secondary',
  ]);
  t.deepEqual(colorGreys.children.tokenIds, [
    'color.greys.100',
    'color.greys.200',
    'color.greys.300',
  ]);
  t.is(
    Object.keys(data.groupsById).length,
    data.groups.length,
    'Both the groups array and the groupsById object should have the same number of items',
  );
  t.is(
    Object.keys(data.tokensById).length,
    data.tokens.length,
    'Both the tokens array and the tokensById object should have the same number of items',
  );
  t.deepEqual(
    data.groups.map((group) => group.id),
    ['color', 'color.brand', 'color.greys', 'spacing'],
  );
  t.deepEqual(
    data.tokens.map((token) => token.id),
    [
      'color.brand.primary',
      'color.brand.secondary',
      'color.greys.100',
      'color.greys.200',
      'color.greys.300',
      'spacing.c',
      'spacing.b',
      'spacing.a',
    ],
  );
});

test('user configured ordering with missing IDs still works', (t) => {
  const data = convertTokenGroupToData({
    spacing: {
      $type: 'dimension',
      $extensions: {
        'cloud.knapsack': {
          group: {
            order: {
              tokenIds: ['c'], // missing b and a, should get appended on alphabetically
            },
          },
        },
      },
      b: {
        $value: '2px',
      },
      a: {
        $value: '1px',
      },
      c: {
        $value: '3px',
      },
    },
  });
  const { spacing } = data.groupsById;
  t.deepEqual(spacing.children.tokenIds, [
    'spacing.c',
    'spacing.a',
    'spacing.b',
  ]);
});

test('Group with both tokens and groups', (t) => {
  const data = convertTokenGroupToData({
    color: {
      $type: 'color',
      blue: {
        $value: '#0000ff',
      },
      greys: {
        100: {
          $value: '#f0f0f0',
        },
        200: {
          $value: '#e0e0e0',
        },
      },
    },
  });
  t.deepEqual(data.groupsById.color.children, {
    groupIds: ['color.greys'],
    tokenIds: ['color.blue'],
  });
});
