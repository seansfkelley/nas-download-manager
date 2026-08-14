import { type DependencyList, useRef } from "react";

import { typesafeIsEqual } from "../lang";

/* eslint-disable react-hooks/refs -- the ref-during-render is how this hook memoizes. */

/** useMemo, but dependencies are compared deeply. */
export function useMemoDeep<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useRef<{ deps: DependencyList; value: T } | undefined>(undefined);

  if (memoized.current == null || !typesafeIsEqual(memoized.current.deps, deps)) {
    memoized.current = { deps, value: factory() };
  }

  return memoized.current.value;
}
