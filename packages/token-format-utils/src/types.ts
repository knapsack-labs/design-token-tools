export type ValidationResult = {
  /** dot separated  */
  id: string;
  msgs: string[];
};

export type Validator<T> = (thing: unknown) => {
  errorMsg?: string;
  errors: ValidationResult[];
  data?: T;
};
