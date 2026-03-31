import { onStoredStateChange } from "./listen";
import type { State } from "./defaults";

export const store = $state<{ current: State | undefined }>({ current: undefined });

onStoredStateChange((state) => {
  store.current = state;
});
