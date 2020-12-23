import "./non-ideal-state.scss";
import * as React from "react";
import classNames from "classnames";

export interface Props {
  icon?: string;
  text?: string;
  className?: string;
}

export class NonIdealState extends React.PureComponent<Props> {
  render() {
    return (
      <div className={classNames("non-ideal-state", this.props.className)}>
        {this.props.icon && <span className={classNames("fa fa-2x", this.props.icon)} />}
        {this.props.text && <span className="explanation">{this.props.text}</span>}
        {this.props.children}
      </div>
    );
  }
}
