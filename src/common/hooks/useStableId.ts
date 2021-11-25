import { useRef } from "react";

import { default as uniqueId } from "lodash/uniqueId";

export function useStableId(prefix?: string) {
  return useRef(uniqueId(prefix)).current;
}
