import { onChange as onChangeApi } from "./api";
import { onChange as onChangeBadge } from "./badge";
import { onChange as onChangePolling } from "./polling";
import { onChange as onChangeNotifications } from "./notifications";
import type { ReadonlyListener, SettingsChangeListener } from "./types";

export const onChangeSettings: SettingsChangeListener = (...args) => {
  onChangeApi(...args);
  onChangePolling(...args);
};

export const onChangeState: ReadonlyListener = (...args) => {
  onChangeBadge(...args);
  onChangeNotifications(...args);
};
