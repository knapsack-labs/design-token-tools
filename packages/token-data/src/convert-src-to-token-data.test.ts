import test from 'ava';
import { TokenSrcGroup } from '@knapsack-labs/token-format-spec';
import { convertTokenGroupToData } from './convert-src-to-token-data';

export const basicTokenGroup: TokenSrcGroup = {
  $extensions: {
    'cloud.knapsack': {
      global: {
        prefix: 'ks',
      },
    },
  },
  palette: {
    $type: 'color',
    $extensions: {
      'cloud.knapsack': {
        group: {
          order: {
            tokenIds: ['black', 'grey', 'blue'],
          },
        },
      },
    },
    black: {
      $value: '#000',
    },
    grey: {
      // $value: 'can not do this',
      10: {
        $value: '#f5f5f5',
        $extensions: {
          'cloud.knapsack': {
            token: {
              purpose: 'background',
            },
          },
        },
      },
      50: {
        $value: '#e0e0e0',
      },
      100: {
        $value: '{palette.black}',
      },
    },
    blue: {
      10: {
        $value: '#e6f6ff',
      },
      50: {
        $value: '#0070f3',
      },
      90: {
        $value: '#00171f',
      },
    },
  },
  'brand A': {
    $description: 'Brand tokens',
    $type: 'color',
    primary: {
      $value: '{palette.blue.50}',
    },
    secondary: {
      $value: '#000',
    },
    darkest: {
      $value: '{palette.grey.100}',
    },
  },
  'some color': {
    'thing-a': {
      $description:
        'No $type declared on group nor token since that should be found from reference',
      $value: '{palette.blue.50}',
    },
  },
  spacing: {
    $description: 'Spacing tokens',
    $type: 'dimension',
    small: {
      $value: '12px',
    },
    medium: {
      $value: '24px',
    },
    large: {
      $value: '48px',
    },
    someFontWeight: {
      $type: 'fontWeight',
      $value: 400,
    },
  },
  shadows: {
    $type: 'shadow',
    a: {
      $value: {
        color: '{palette.black}',
        blur: '10px',
        spread: '0px',
        offsetX: '5px',
        offsetY: '{spacing.medium}',
      },
    },
  },
};

test.skip('debug and inspect', (t) => {
  const tokenData = convertTokenGroupToData(basicTokenGroup);
  t.log(tokenData);
  // t.log(tokenData.groups);
  // t.log(tokenData.tokens);
  t.pass();
});

test('empty ok', (t) => {
  const actual = convertTokenGroupToData({});
  const expected: ReturnType<typeof convertTokenGroupToData> = {
    groupsById: {},
    tokensById: {},
    tokens: [],
    groups: [],
    globalConfig: {
      order: {
        groupIds: [],
        tokenIds: [],
      },
    },
  };
  t.deepEqual(actual, expected);
});

test('basic token', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      $type: 'color',
      blue: {
        $value: '#0000ff',
      },
    },
  });

  const expected: ReturnType<typeof convertTokenGroupToData> = {
    groupsById: {
      brand: {
        id: 'brand',
        type: 'color',
        children: {
          tokenIds: ['brand.blue'],
          groupIds: [],
        },
      },
    },
    groups: [
      {
        id: 'brand',
        type: 'color',
        children: {
          tokenIds: ['brand.blue'],
          groupIds: [],
        },
      },
    ],
    tokensById: {
      'brand.blue': {
        id: 'brand.blue',
        value: '#0000ff',
        originalValue: '#0000ff',
        type: 'color',
        kind: 'static',
      },
    },
    tokens: [
      {
        id: 'brand.blue',
        value: '#0000ff',
        originalValue: '#0000ff',
        type: 'color',
        kind: 'static',
      },
    ],
    globalConfig: {
      order: {
        groupIds: ['brand'],
        tokenIds: [],
      },
    },
  };
  t.is(actual.tokensById['brand.blue'].type, 'color', 'type should be set');
  t.is(actual.tokensById['brand.blue'].id, 'brand.blue', 'ID should be set');
  t.deepEqual(actual, expected);
});

/** @todo */
test.failing('Tokens cannot contain groups', (t) => {
  t.throws(() => {
    return convertTokenGroupToData({
      colors: {
        blue: {
          $value: '#0000FF',
          $type: 'color',
          dark: {
            $value: '#0000AA',
          },
        },
      },
    });
  });
});

test('basic token reference', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      primary: {
        // note the lack of $type: 'color' here - refs don't need those
        // it should pick it up from the referenced token
        $value: '{brand.blue}',
      },
      blue: {
        $type: 'color',
        $value: '#0000ff',
      },
    },
  });
  const { 'brand.primary': primary, 'brand.blue': blue } = actual.tokensById;

  const expectedTokensById: ReturnType<
    typeof convertTokenGroupToData
  >['tokensById'] = {
    'brand.blue': {
      id: 'brand.blue',
      value: '#0000ff',
      originalValue: '#0000ff',
      type: 'color',
      kind: 'static',
      // referencedBy: [['brand.primary']],
    },
    'brand.primary': {
      id: 'brand.primary',
      value: '#0000ff',
      originalValue: '{brand.blue}',
      type: 'color',
      kind: 'ref',
      referencedTokenId: 'brand.blue',
      references: [['brand.blue']],
    },
  };

  t.is(primary.type, 'color', 'type should be picked up from referenced token');
  // t.deepEqual(blue.referencedBy, [['brand.primary']], JSON.stringify(blue));
  t.deepEqual(
    primary.references,
    [['brand.blue']],
    'references should be an array of ID[]',
  );
  t.deepEqual(actual.tokensById, expectedTokensById);
});

test('multiple refs in single token', (t) => {
  const actual = convertTokenGroupToData({
    foo: {
      $value: 'foo',
    },
    bar: {
      $value: 'bar',
    },
    baz: {
      $value: '{foo} {bar}',
    },
  });
  t.is(actual.tokensById.baz.value, 'foo bar');
});

test('token reference across groups', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      primary: {
        $value: '{colors.blue}',
      },
    },
    colors: {
      blue: {
        $type: 'color',
        $value: '#0000ff',
      },
    },
    emptyGroup: {
      subEmptyGroup: {},
    },
    $extensions: {
      'cloud.knapsack': {
        global: {
          prefix: 'ks',
        },
      },
    },
  });
  t.is(actual.tokensById['brand.primary'].value, '#0000ff');
  t.deepEqual(
    actual.groupsById.emptyGroup,
    {
      id: 'emptyGroup',
      children: {
        groupIds: ['emptyGroup.subEmptyGroup'],
        tokenIds: [],
      },
    },
    'Should make sure empty groups at end are still present',
  );
  t.is(
    actual.groupsById['emptyGroup.subEmptyGroup'].id,
    'emptyGroup.subEmptyGroup',
    'sub empty group should be present',
  );
  t.is(actual.globalConfig?.prefix, 'ks');
});

test('basic groups', (t) => {
  const {
    groupsById: { brand },
  } = convertTokenGroupToData({
    brand: {
      $type: 'color',
      $description: 'Brand colors',
      blue: {
        $value: '#0000ff',
      },
      green: {
        $value: '#00ff00',
      },
    },
  });
  t.deepEqual(brand, {
    id: 'brand',
    type: 'color',
    description: 'Brand colors',
    children: {
      tokenIds: ['brand.blue', 'brand.green'],
      groupIds: [],
    },
  });
});

test('basic empty groups', (t) => {
  const {
    groupsById: { brand },
  } = convertTokenGroupToData({
    brand: {},
  });
  t.deepEqual(brand, {
    id: 'brand',
    children: {
      groupIds: [],
      tokenIds: [],
    },
  });
});

test('missing references throw sane readable error', (t) => {
  t.throws(
    () => {
      convertTokenGroupToData({
        brand: {
          primary: {
            $value: '{brand.blue}',
          },
        },
      });
    },
    {
      message:
        '"brand.primary.$value": Original token does not exist for reference: "brand.blue"',
    },
  );
});

test('basic type inheritance', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      $type: 'color',
      blue: {
        $value: '#0000ff',
      },
      green: {
        $value: '#00ff00',
      },
    },
  });

  t.is(
    actual.tokensById['brand.blue'].type,
    'color',
    'blue should inherit color type',
  );
  t.is(
    actual.tokensById['brand.green'].type,
    'color',
    'green should inherit color type',
  );
});

test('basic type fallback using typeof for lack of $type', (t) => {
  const actual = convertTokenGroupToData({
    a: {
      $value: 'foo',
    },
    b: {
      $value: 1,
    },
    c: {
      $value: true,
    },
  });

  const { a, b, c } = actual.tokensById;
  t.is(a.type, 'string', 'a should be string');
  t.is(b.type, 'number', 'b should be number');
  t.is(c.type, 'boolean', 'c should be boolean');
});

test('nested token reference', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      'button BG': {
        // note the lack of $type: 'color' here - refs don't need those
        // it should pick it up from the referenced token
        $value: '{brand.primary}',
      },
      blue: {
        $type: 'color',
        $value: '#0000ff',
      },
      primary: {
        // note the lack of $type: 'color' here - refs don't need those
        // it should pick it up from the referenced token
        $value: '{brand.blue}',
      },
    },
  });
  t.is(
    actual.tokensById['brand.button BG'].type,
    'color',
    'type should be picked up from sub-referenced token',
  );
  t.is(
    actual.tokensById['brand.button BG'].value,
    '#0000ff',
    'value should be picked up from sub-referenced token',
  );
  t.deepEqual(
    actual.tokensById['brand.button BG'].references,
    [['brand.primary', 'brand.blue']],
    'double reference should have array of IDs',
  );
});

test('double nested token reference', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      blue: {
        $type: 'color',
        $value: '#0000ff',
      },
      primary: {
        $value: '{brand.blue}',
      },
      'logo BG': {
        $value: '{brand.primary}',
      },
    },
    spacing: {
      $type: 'dimension',
      small: {
        $value: '8px',
      },
      logo: {
        $value: '{spacing.small}',
      },
    },
    logo: {
      $value: '{spacing.logo} {brand.logo BG}',
    },
  });
  t.is(
    actual.tokensById.logo.value,
    '8px #0000ff',
    'value should be picked up from sub-referenced token',
  );
  t.deepEqual(
    actual.tokensById.logo.references,
    [
      ['spacing.logo', 'spacing.small'],
      ['brand.logo BG', 'brand.primary', 'brand.blue'],
    ],
    'double nested reference should have 2 array of IDs',
  );
});

test.failing('double nested token referencedBy', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      primary: {
        // note the lack of $type: 'color' here - refs don't need those
        // it should pick it up from the referenced token
        $value: '{brand.blue}',
      },
      blue: {
        $type: 'color',
        $value: '#0000ff',
      },
    },
    'button BG': {
      $value: '{brand.primary}',
    },
  });

  const expectedTokensById: ReturnType<
    typeof convertTokenGroupToData
  >['tokensById'] = {
    'brand.blue': {
      id: 'brand.blue',
      value: '#0000ff',
      originalValue: '#0000ff',
      type: 'color',
      kind: 'static',
      // referencedBy: [['brand.primary', 'button BG']],
    },
    'brand.primary': {
      id: 'brand.primary',
      value: '#0000ff',
      originalValue: '{brand.blue}',
      type: 'color',
      kind: 'ref',
      referencedTokenId: 'brand.blue',
      references: [['brand.blue']],
      // : [['button BG']],
    },
    'button BG': {
      id: 'button BG',
      value: '#0000ff',
      originalValue: '{brand.primary}',
      type: 'color',
      kind: 'ref',
      referencedTokenId: 'brand.primary',
      references: [['brand.primary']],
    },
  };
  const {
    'brand.primary': primary,
    'brand.blue': blue,
    'button BG': buttonBg,
  } = actual.tokensById;

  t.is(primary.type, 'color', 'type should be picked up from referenced token');
  t.is(
    buttonBg.type,
    'color',
    'type should be picked up from referenced token',
  );
  // t.deepEqual(
  //   blue.referencedBy,
  //   [['brand.primary', 'button BG']],
  //   JSON.stringify(blue),
  // );
  t.deepEqual(
    primary.references,
    [['brand.blue']],
    'references should be an array of ID[]',
  );
  t.deepEqual(actual, expectedTokensById);
});

test('extensions on tokens preserved', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      blue: {
        $type: 'color',
        $value: '#0000ff',
        $description: 'The blue color',
        $extensions: {
          'cloud.knapsack': {
            token: {
              purpose: 'backgroundColor',
            },
          },
        },
      },
      primary: {
        $value: '{brand.blue}',
      },
    },
  });

  t.deepEqual(
    actual.tokensById['brand.blue'].tokenConfig,
    {
      purpose: 'backgroundColor',
    },
    'extensions on token should be preserved',
  );
  t.true(
    Object.keys(actual.tokensById).every((id) => !id.includes('$')),
    'no $ in token IDs',
  );
});

test('extensions on groups preserved', (t) => {
  const actual = convertTokenGroupToData({
    brand: {
      $extensions: {
        'cloud.knapsack': {
          group: {
            order: {
              tokenIds: ['primary', 'blue'],
            },
          },
        },
      },
      blue: {
        $type: 'color',
        $value: '#0000ff',
        $description: 'The blue color',
      },
      primary: {
        $value: '{brand.blue}',
      },
    },
  });

  t.deepEqual(
    actual.groupsById.brand.groupConfig,
    {
      order: {
        tokenIds: ['primary', 'blue'],
      },
    },
    'extensions on group should be preserved',
  );
  t.true(
    Object.keys(actual.groupsById).every((id) => !id.includes('$')),
    'no $ in group IDs',
  );
});

test('extensions on global preserved', (t) => {
  const actual = convertTokenGroupToData({
    $extensions: {
      'cloud.knapsack': {
        global: {
          prefix: 'my-prefix',
        },
      },
    },
    brand: {
      blue: {
        $type: 'color',
        $value: '#0000ff',
        $description: 'The blue color',
      },
    },
  });

  t.like(
    actual.globalConfig,
    {
      prefix: 'my-prefix',
    },
    'extensions on global should be preserved',
  );
});

test('referencing a composite token (shadow)', (t) => {
  const shadowValue = {
    color: '#0000ff',
    offsetX: '8px',
    offsetY: '1px',
    blur: '2px',
    spread: '3px',
  } as const;
  const actual = convertTokenGroupToData({
    shadowA: {
      $type: 'shadow',
      $value: shadowValue,
    },
    shadowB: {
      $value: '{shadowA}',
    },
  });

  const { shadowA, shadowB } = actual.tokensById;
  t.deepEqual(
    shadowA.value,
    shadowValue,
    'original shadow should de-reference',
  );
  t.deepEqual(
    shadowB.value,
    shadowValue,
    'referenced shadow should de-reference',
  );
  t.is(
    shadowB.type,
    'shadow',
    'type should be picked up from referenced token',
  );
  t.deepEqual(shadowB.references, [['shadowA']]);
});

test('composite token (shadow) references', (t) => {
  const actual = convertTokenGroupToData({
    grey: {
      $type: 'color',
      $value: '#0000ff',
    },
    small: {
      $type: 'dimension',
      $value: '8px',
    },
    shadowA: {
      $type: 'shadow',
      $value: {
        color: '{grey}',
        offsetX: '{small}',
        offsetY: '1px',
        blur: '2px',
        spread: '3px',
      },
    },
    shadowB: {
      $value: '{shadowA}',
    },
  });

  const { shadowA, shadowB } = actual.tokensById;
  const shadowValue = {
    color: '#0000ff',
    offsetX: '8px',
    offsetY: '1px',
    blur: '2px',
    spread: '3px',
  };
  t.deepEqual(
    shadowA.value,
    shadowValue,
    'original shadow should de-reference',
  );
  t.deepEqual(
    shadowB.value,
    shadowValue,
    'referenced shadow should de-reference',
  );
  t.is(
    shadowB.type,
    'shadow',
    'type should be picked up from referenced token',
  );

  t.deepEqual(shadowA.references, [['grey'], ['small']]);
  // this is a weird output for references, but it's what we have for now
  t.deepEqual(shadowB.references, [['shadowA', 'grey', 'small']]);
  t.is(
    `8px 1px 2px 3px #0000ff`,
    'Shadows getTokenValue should turn shadow into CSS ready string',
  );
});
