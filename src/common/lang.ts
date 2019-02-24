export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}
