import { type ErrorInfo, PureComponent, type ReactNode } from "react";

import type { Settings } from "../common/state";

import { FatalError } from "./FatalError";

export interface Props {
  settings: Settings;
  lastSevereError?: string;
  children: ReactNode;
}

export interface State {
  error: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
}

export class FatalErrorWrapper extends PureComponent<Props, State> {
  state: State = {
    error: undefined,
  };

  render() {
    if (this.state.error) {
      return (
        <FatalError
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          settings={this.props.settings}
          lastSevereError={this.props.lastSevereError}
        />
      );
    } else {
      return this.props.children;
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }
}
