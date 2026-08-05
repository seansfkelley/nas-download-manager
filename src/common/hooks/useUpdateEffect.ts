import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";

/** useEffect, but skipped on mount. The hook equivalent of componentDidUpdate. */
export function useUpdateEffect(effect: EffectCallback, deps: DependencyList) {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      return effect();
    } else {
      isMounted.current = true;
      return undefined;
    }
  }, deps);
}
