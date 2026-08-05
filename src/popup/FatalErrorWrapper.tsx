import { type ErrorInfo, PureComponent } from "react";
import type { State as ExtensionState } from "../common/state";
import { FatalError } from "./FatalError";

export interface Props {
  state: ExtensionState;
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
          state={this.props.state}
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
