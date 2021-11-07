import type { CommonBackgroundState } from "../backgroundState";

import { onChange as onChangeApi } from "./api";
import { onChange as onChangeBadge } from "./badge";
import { onChange as onChangeNotifications } from "./notifications";
import { onChange as onChangeTasks } from "./tasks";

export function onChange(state: CommonBackgroundState) {
  onChangeApi(state);
  onChangeBadge(state);
  onChangeNotifications(state);
  onChangeTasks(state);
}
