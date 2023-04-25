/**
 * Capture strings like {a.b} in other strings
 * DOES NOT EXPECT the `.value`. NOTE: this is a capture group regex
 */
const tokenRefRegex = new RegExp(
  // start capture group
  '(' +
    // starts with `{`
    '{' +
    // get everything up until a `}`
    '[^}]' +
    // match 1 or more making selection as large as possible.
    '*' +
    // ends with `}`
    '}' +
    // end capture group
    ')',
  // RegExp done above, flags below; setting `g` for global
  'g',
);

export type TokenRefChunk =
  | {
      type: 'ref';
      id: string;
      string: string;
    }
  | {
      type: 'string';
      string: string;
    };

export function parseValueChunks(str: string): TokenRefChunk[] {
  return (
    str
      .split(tokenRefRegex)
      // remove empty strings
      .filter(Boolean)
      .map((chunk) => {
        if (chunk.startsWith('{') && chunk.endsWith('}')) {
          return {
            type: 'ref',
            // remove the start `{` and end `}` brackets
            id: chunk.slice(1, -1),
            string: chunk,
          };
        }
        return {
          type: 'string',
          string: chunk,
        };
      })
  );
}
