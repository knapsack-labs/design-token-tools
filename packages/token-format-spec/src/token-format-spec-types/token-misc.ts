export type TokenOrder = {
  groupIds: string[];
  tokenIds: string[];
};

export type TokenKsExtensions = {
  group?: {
    order?: Partial<TokenOrder>;
  };
  global?: {
    prefix?: string;
    order?: Partial<TokenOrder>;
  };
  token?: {
    /**
     * Whereas `type` says what values are legal, `purpose` shows where/how it should be used.
     * For example you can have `type: dimension` and `purpose: fontSize` or `purpose: borderRadius`
     * Exact values are still being determined
     */
    purpose?: string;
  };
};
