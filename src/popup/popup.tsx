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

const poller = new TaskPoller({
  interval: 10,
  enabled: true
});

onStoredStateChange(storedState => {
  poller.updateSettings({
    hostname: getHostUrl(storedState.connection),
    sid: storedState.sid
  });

  ReactDOM.render(
    <DownloadList
      tasks={storedState.cachedTasks.tasks}
      failureMessage={storedState.cachedTasks.failureMessage}
    />
  , document.body);
});
