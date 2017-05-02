import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { DownloadStationTask, DownloadStation, ERROR_CODES } from '../api';
import { onStoredStateChange, getHostUrl } from '../common';

interface DownloadListProps {
  hostname: string;
  sid: string | undefined;
}

type SidValidationStatus = 'pending' | 'good' | { error: string };

const NO_SID: SidValidationStatus = { error: 'Not logged in.' };

interface DownloadListState {
  tasks: DownloadStationTask[];
  errorMessage?: string;
  sidValidationStatus: SidValidationStatus;
}

class DownloadList extends React.PureComponent<DownloadListProps, DownloadListState> {
  state: DownloadListState = {
    tasks: [],
    sidValidationStatus: this.props.sid ? 'pending' : NO_SID
  };

  private fetchInterval: number;

  render() {
    return (
      <div className='download-list'>
        {this.state.tasks.map(task => (
          <div className='task' key={task.id}>
            {task.title} ({task.type}, {task.status})
          </div>
        ))}
      </div>
    );
  }

  componentDidMount() {
    this.validateSidAndMaybeStartFetching(this.props);
  }

  componentWillReceiveProps(nextProps: DownloadListProps) {
    // We rely on PureComponent to prevent us having to check for changes explicitly.
    this.validateSidAndMaybeStartFetching(nextProps);
  }

  private validateSidAndMaybeStartFetching(props: DownloadListProps) {
    if (!props.sid) {
      this.setState({ sidValidationStatus: NO_SID });
      return Promise.resolve();
    } else {
      this.setState({ sidValidationStatus: 'pending' });
      const { hostname, sid } = props;
      return DownloadStation.Info.GetInfo(hostname, sid!)
        .then(response => {
          if (sid === this.props.sid) {
            if (response.success) {
              this.setState({
                sidValidationStatus: 'good'
              });
              this.startFetching();
            } else {
              this.setState({
                sidValidationStatus: { error: ERROR_CODES.common[response.error.code] || ERROR_CODES.task[response.error.code] || 'Unknown error.' }
              });
            }
          }
        });
    }
  }

  private startFetching() {
    clearInterval(this.fetchInterval);
    const fetchFn = () => {
      DownloadStation.Task.List(this.props.hostname, this.props.sid!, {
        offset: 0,
        limit: -1
      })
        .then(response => {
          if (response.success) {
            this.setState({
              tasks: response.data.tasks
            });
          } else {
            this.setState({
              errorMessage: ERROR_CODES.common[response.error.code] || ERROR_CODES.task[response.error.code] || 'Unknown error.'
            })
          }
        })
    };

    fetchFn();
    this.fetchInterval = setInterval(fetchFn, 10000);
  }
}

// TODO: Polling should be shared and pushed through storage so that it can be shared
// by both the popup and the background task and because it'll be easier to implement
// the popup zero state when it can fetch stuff from storage.

onStoredStateChange(storedState => {
  ReactDOM.render(
    <DownloadList
      hostname={getHostUrl(storedState.connection)}
      sid={storedState.sid}
    />
  , document.body);
});
