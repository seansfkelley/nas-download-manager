import "./settings-list.scss";

import * as React from "react";

export function SettingsList(props: React.PropsWithChildren<{}>) {
  return <ul className="settings-list">{props.children}</ul>;
}
