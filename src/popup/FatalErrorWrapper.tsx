import * as React from "react";
import type { Downloads } from "../common/apis/messages";
import type { Settings } from "../common/state";
import { FatalError } from "./FatalError";

export interface Props {
  settings?: Settings;
  downloads?: Downloads;
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
          settings={this.props.settings}
          downloads={this.props.downloads}
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
