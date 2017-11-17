import * as React from 'react';
import { FatalError } from './FatalError';

export interface State {
  error: Error | undefined;
  errorInfo?: React.ErrorInfo | undefined;
}

export class FatalErrorWrapper extends React.PureComponent<{}, State> {
  state: State = {
    error: undefined,
  };

  render() {
    if (this.state.error) {
      return <FatalError error={this.state.error} errorInfo={this.state.errorInfo}/>;
    } else {
      return this.props.children;
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
  }
}
