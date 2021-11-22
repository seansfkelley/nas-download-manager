// https://stackoverflow.com/questions/50125893/typescript-derive-map-from-discriminated-union
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V>
  ? T
  : never;

export type UnionByDiscriminant<T extends Record<K, string>, K extends keyof T> = {
  [V in T[K]]: DiscriminateUnion<T, K, V>;
};

export type OmitStrict<T, K extends keyof T> = Omit<T, K>;

export type Overwrite<T extends object, U extends object> = Omit<T, keyof U> & U;
