import "./non-ideal-state.css";
import classNames from "classnames";
import type { PropsWithChildren } from "react";

export interface Props {
  icon?: string;
  text?: string;
  className?: string;
}

export function NonIdealState(props: PropsWithChildren<Props>) {
  return (
    <div className={classNames("non-ideal-state", props.className)}>
      {props.icon && <span className={classNames("main-icon fa fa-2x", props.icon)} />}
      {props.text && <span className="explanation">{props.text}</span>}
      {props.children}
    </div>
  );
}
