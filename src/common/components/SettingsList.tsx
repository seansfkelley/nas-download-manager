import "./settings-list.scss";
import * as React from "react";

export class SettingsList extends React.PureComponent<{}, {}> {
  render() {
    return <ul className="settings-list">{this.props.children}</ul>;
  }
}
