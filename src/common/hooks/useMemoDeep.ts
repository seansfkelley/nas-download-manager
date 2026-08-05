import { useRef, type DependencyList } from "react";
import { default as isEqual } from "lodash/isEqual";

// useMemo, except the dependencies are compared by value instead of by identity. Stored state is
// read back out of browser.storage on every change, so anything derived from it gets a structurally
// identical but referentially new dependency several times a minute, which defeats a plain useMemo.
export function useMemoDeep<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useRef<{ deps: DependencyList; value: T } | undefined>(undefined);

  if (memoized.current == null || !isEqual(memoized.current.deps, deps)) {
    memoized.current = { deps, value: factory() };
  }

  return memoized.current.value;
}
