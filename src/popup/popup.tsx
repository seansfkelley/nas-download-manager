import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { DownloadStationTask } from '../api';
import { onStoredStateChange, getHostUrl } from '../common';
import { TaskPoller } from '../taskPoller';

interface DownloadListProps {
  tasks: DownloadStationTask[];
  failureMessage?: string;
}

class DownloadList extends React.PureComponent<DownloadListProps, void> {
  render() {
    return (
      <div className='download-list'>
        <div className='error-message'>
          {this.props.failureMessage}
        </div>
        {this.props.tasks.map(task => (
          <div className='task' key={task.id}>
            {task.title} ({task.type}, {task.status})
          </div>
        ))}
      </div>
    );
  }
}



const poller = new TaskPoller;
poller.setInterval(10);
poller.setEnabled(true);

onStoredStateChange(storedState => {
  poller.setHostname(getHostUrl(storedState.connection));
  poller.setSid(storedState.sid);

  ReactDOM.render(
    <DownloadList
      tasks={storedState.tasks}
      failureMessage={storedState.lastPollingFailureMessage}
    />
  , document.body);
});
