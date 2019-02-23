import * as React from "react";
import { State as ExtensionState } from "../common/state";
import { FatalError } from "./FatalError";

export interface Props {
  state: ExtensionState;
}

export interface State {
  error: Error | undefined;
  errorInfo?: React.ErrorInfo | undefined;
}

export class FatalErrorWrapper extends React.PureComponent<Props, State> {
  state: State = {
    error: undefined,
  };

  render() {
    if (this.state.error) {
      return (
        <FatalError
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          state={this.props.state}
        />
      );
    } else {
      return this.props.children;
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
  }
}
