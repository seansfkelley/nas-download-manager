import * as React from "react";
import * as classNamesProxy from "classnames";

const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

export interface Props {
  icon: string;
  text?: string;
  className?: string;
}

export class NoTasks extends React.PureComponent<Props, {}> {
  render() {
    return (
      <div className={classNames("no-tasks", this.props.className)}>
        <span className={classNames("fa fa-2x", this.props.icon)} />
        {this.props.text && <span className="explanation">{this.props.text}</span>}
        {this.props.children}
      </div>
    );
  }
}
