// eslint-disable-next-line no-restricted-imports -- the one wrapper everything else has to go through.
import { default as isEqual } from "lodash/isEqual";

import type { OmitStrict } from "./types";

export class AssertionError extends Error {}

export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message || "assertion failed");
  }
}

export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

export function recordKeys<T extends string>(o: Record<T, any>): T[] {
  return Object.keys(o) as T[];
}

export function typesafeUnionMembers<T extends string>(keys: Record<T, any>): T[] {
  return Object.keys(keys) as T[];
}

export function typesafePick<T extends object, K extends keyof T>(o: T, ...keys: K[]): Pick<T, K> {
  const copy: T = {} as any;
  for (const k of keys) {
    copy[k] = o[k];
  }
  return copy;
}

export function typesafeOmit<T extends object, K extends keyof T>(
  o: T,
  ...keys: K[]
): OmitStrict<T, K> {
  const copy = { ...o };
  for (const k of keys) {
    delete copy[k];
  }
  return copy;
}

// browser.storage does not agree across browsers about what setting a key to undefined means, so a
// deliberate erasure has to be written as null and translated back on the way out. Both only look at
// own enumerable keys, so a key that is absent stays absent.
export function undefinedToNull<T extends object>(
  o: T,
): { [K in keyof T]: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K] } {
  const copy: any = {};
  for (const k of Object.keys(o)) {
    const v = (o as any)[k];
    copy[k] = v === undefined ? null : v;
  }
  return copy;
}

export function nullToUndefined<T extends object>(
  o: T,
): { [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K] } {
  const copy: any = {};
  for (const k of Object.keys(o)) {
    const v = (o as any)[k];
    // eslint-disable-next-line eqeqeq
    copy[k] = v === null ? undefined : v;
  }
  return copy;
}

export function typesafeMapValues<K extends string, V, U>(
  o: Record<K, V>,
  mapper: (value: V, key: K) => U,
): Record<K, U> {
  const result: Record<K, U> = {} as any;
  for (const k of recordKeys(o)) {
    result[k] = mapper(o[k], k);
  }
  return result;
}

// lodash's own signature takes two anys, so comparing values that could never be equal is not an
// error, just a very reliable false.
export function typesafeIsEqual<T>(a: T, b: T): boolean {
  return isEqual(a, b);
}
