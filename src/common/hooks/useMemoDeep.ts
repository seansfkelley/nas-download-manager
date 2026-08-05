import { useRef, type DependencyList } from "react";
import { default as isEqual } from "lodash/isEqual";

/** useMemo, but dependencies are compared deeply. */
export function useMemoDeep<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useRef<{ deps: DependencyList; value: T } | undefined>(undefined);

  if (memoized.current == null || !isEqual(memoized.current.deps, deps)) {
    memoized.current = { deps, value: factory() };
  }

  return memoized.current.value;
}
