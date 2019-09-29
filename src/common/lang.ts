export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

export function typesafeUnionMembers<T extends string>(keys: Record<T, any>): T[] {
  return Object.keys(keys) as T[];
}
