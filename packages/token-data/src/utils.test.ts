import {
  TokenRefChunk,
  parseValueChunks,
} from '@knapsack-labs/token-format-spec';
import test from 'ava';
import { getIds } from './utils';

function combineTokenRefChunks(chunks: TokenRefChunk[]): string {
  return chunks.map((chunk) => chunk.string).join('');
}

test('get single token w/o ref', (t) => {
  const value = 'foo bar';
  const actual = parseValueChunks(value);
  t.deepEqual(actual, [
    {
      type: 'string',
      string: 'foo bar',
    },
  ]);
  t.is(combineTokenRefChunks(actual), value);
});

test('get single token reference', (t) => {
  const value = '{Foo 42.100.A-dash.The Bar}';
  const actual = parseValueChunks(value);
  t.deepEqual(actual, [
    {
      type: 'ref',
      id: 'Foo 42.100.A-dash.The Bar',
      string: '{Foo 42.100.A-dash.The Bar}',
    },
  ]);
  t.is(combineTokenRefChunks(actual), value);
});

test('get multiple token reference', (t) => {
  const value = '{foo. the bar} 42 {x.y}';
  const actual = parseValueChunks(value);
  t.deepEqual(actual, [
    {
      type: 'ref',
      id: 'foo. the bar',
      string: '{foo. the bar}',
    },
    {
      type: 'string',
      string: ' 42 ',
    },
    {
      type: 'ref',
      id: 'x.y',
      string: '{x.y}',
    },
  ]);
  t.is(combineTokenRefChunks(actual), value);
});

test('get token and group IDs', (t) => {
  const actual = getIds({
    foo: {
      bar: {
        baz: {
          $value: '42',
        },
      },
    },
    $extensions: {
      'cloud.knapsack': {
        global: {
          prefix: 'knapsack',
        },
      },
    },
    x: {
      y: {
        $value: '42',
      },
      $description: 'group x',
    },
  });
  t.deepEqual(actual, {
    tokenIds: new Set(['foo.bar.baz', 'x.y']),
    groupIds: new Set(['foo', 'foo.bar', 'x']),
  });
});
