import "./settings-list.css";

import type { PropsWithChildren } from "react";

export function SettingsList(props: PropsWithChildren<{}>) {
  return <ul className="settings-list">{props.children}</ul>;
}
