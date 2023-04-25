import test from 'ava';
import { formatCode } from '@knapsack/file-utils/format';
import { writeFile, emptyDirSync, remove } from '@knapsack/file-utils';
import { join } from 'path';
import sass from 'sass';
import { convertTokenGroupToData } from '@knapsack-labs/token-data';
import {
  convertTokenDataToCss,
  convertTokenDataToJson,
  convertTokenDataToLess,
  convertTokenDataToNestedJson,
  convertTokenDataToScss,
  convertTokenDataToJs,
  convertTokenDataToCjs,
  convertTokenDataToMapScss,
} from './web-asset-converters';

const outputDir = join(__dirname, '.temp');
emptyDirSync(outputDir);

// comment out to inspect output
// eslint-disable-next-line ava/no-inline-assertions
test.after.always(() => remove(outputDir));

// Run convertTokenGroupToData at least once to memoize and make sure we don't
// wind up with cache collisions within memoized function
const throwaway = convertTokenGroupToData({
  color: {
    $value: 'flerp',
  },
});

const { tokens } = convertTokenGroupToData({
  color: {
    $type: 'color',
    blue: {
      $value: '#000fff',
    },
    primary: {
      $value: '{color.blue}',
    },
  },
  fonts: {
    body: {
      $value: "'Times New Roman', Times, serif",
    },
  },
});

test('basic css', async (t) => {
  const actual = convertTokenDataToCss(tokens);

  t.is(
    actual,
    await formatCode({
      contents: `
      :root {
        --color-blue: #000fff;
        --color-primary: var(--color-blue);
        --fonts-body: 'Times New Roman', Times, serif;
      }
      `,
      path: 'x.css',
    }),
  );
});

test('basic scss', async (t) => {
  const actual = convertTokenDataToScss(tokens);
  t.notThrows(() => sass.compileString(actual));
  t.is(
    actual,
    await formatCode({
      contents: `
      $color-blue: #000fff;
      $fonts-body: 'Times New Roman', Times, serif;
      $color-primary: $color-blue;
      `,
      path: 'x.scss',
    }),
  );
});

test('scss reference order', async (t) => {
  const { tokens: localTokens } = convertTokenGroupToData({
    color: {
      $type: 'color',
      aaa: {
        $value: '{color.zzz}',
      },
      zzz: {
        $value: '#fff',
      },
    },
  });
  const actual = convertTokenDataToScss(localTokens);
  t.notThrows(() => sass.compileString(actual));
  t.is(
    actual,
    await formatCode({
      contents: `
      $color-zzz: #fff;
      $color-aaa: $color-zzz;
      `,
      path: 'x.scss',
    }),
  );
});

test('scss reference order double reference', async (t) => {
  const { tokens: localTokens } = convertTokenGroupToData({
    color: {
      $type: 'color',
      aaa: {
        $value: '{color.bbb}',
      },
      bbb: {
        $value: '{color.zzz}',
      },
      zzz: {
        $value: '#fff',
      },
    },
  });
  const actual = convertTokenDataToScss(localTokens);
  t.notThrows(() => sass.compileString(actual));
  t.is(
    actual,
    await formatCode({
      contents: `
      $color-zzz: #fff;
      $color-bbb: $color-zzz;
      $color-aaa: $color-bbb;
      `,
      path: 'x.scss',
    }),
  );
});

test('map scss', async (t) => {
  const actual = convertTokenDataToMapScss(tokens);
  t.notThrows(() => sass.compileString(actual));
  t.is(
    actual,
    await formatCode({
      contents: `
      $color-blue: #000fff;
      $fonts-body: 'Times New Roman', Times, serif;
      $color-primary: $color-blue;
      $tokens: (
        'color': (
          'blue': $color-blue,
          'primary': $color-primary,
        ),
        'fonts': (
          'body': $fonts-body,
        ),
      );
      `,
      path: 'x.scss',
    }),
  );
});

test('basic less', async (t) => {
  const actual = convertTokenDataToLess(tokens);
  t.is(
    await formatCode({
      contents: actual,
      path: 'x.less',
    }),
    await formatCode({
      contents: `
      @color-blue: #000fff;
      @fonts-body: 'Times New Roman', Times, serif;
      @color-primary: @color-blue;
      `,
      path: 'x.less',
    }),
  );
});

test('basic json', async (t) => {
  const actual = convertTokenDataToJson(tokens);
  const path = join(outputDir, `${t.title}.json`);
  await writeFile({
    contents: actual,
    path,
  });
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const file = require(path);
  t.is(file.colorBlue, '#000fff');
  t.is(
    await formatCode({
      contents: actual,
      path: 'x.json',
    }),
    await formatCode({
      contents: `
      {
        "colorBlue": "#000fff",
        "colorPrimary": "#000fff",
        "fontsBody": "'Times New Roman', Times, serif"
      }
      `,
      path: 'x.json',
    }),
  );
});

test('basic nested json', async (t) => {
  const actual = convertTokenDataToNestedJson(tokens);
  const path = join(outputDir, `${t.title}.json`);
  await writeFile({
    contents: actual,
    path,
  });
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const file = require(path);
  t.is(file.color.blue, '#000fff');
  t.is(
    await formatCode({
      contents: actual,
      path: 'x.json',
    }),
    await formatCode({
      contents: `
      {
        "color": {
          "blue": "#000fff",
          "primary": "#000fff"
        },
        "fonts": {
          "body": "'Times New Roman', Times, serif"
        }
      }
      `,
      path: 'x.json',
    }),
  );
});

test('basic js', async (t) => {
  const { jsString, dtsString } = convertTokenDataToJs(tokens);
  const path = join(outputDir, `${t.title}.mjs`);
  await writeFile({
    contents: jsString,
    path,
  });
  const file = await import(path);
  t.is(file.colorBlue, '#000fff');
  t.is(
    jsString,
    await formatCode({
      contents: `
      export const colorBlue = '#000fff';
      export const fontsBody = "'Times New Roman', Times, serif";
      export const colorPrimary = '#000fff';
      `,
      path: 'x.js',
    }),
  );
  t.is(
    dtsString,
    await formatCode({
      contents: `
      export declare const colorBlue = '#000fff';
      export declare export const fontsBody = "'Times New Roman', Times, serif";
      export declare const colorPrimary = '#000fff';
      `,
      path: 'x.d.ts',
    }),
  );
});

test('basic cjs', async (t) => {
  const actual = convertTokenDataToCjs(tokens);
  const path = join(outputDir, `${t.title}.cjs`);
  await writeFile({
    contents: actual,
    path,
  });
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const file = require(path);
  t.is(file.colorBlue, '#000fff');
  t.is(
    actual,
    await formatCode({
      contents: `
      module.exports = {
        colorBlue: '#000fff',
        fontsBody: "'Times New Roman', Times, serif",
        colorPrimary: '#000fff',
      };
      `,
      path: 'x.cjs',
    }),
  );
});
