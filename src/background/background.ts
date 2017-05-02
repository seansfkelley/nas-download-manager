import { DownloadStation } from '../api';
import { DEFAULT_SETTINGS, getHostUrl, onStoredStateChange } from '../common';

class NotificationPoller {
  private tryPollCount: number = 0;
  private enabled: boolean = false;
  private hostname: string | undefined = undefined;
  private sid: string | undefined = undefined;
  private interval: number = DEFAULT_SETTINGS.notifications.pollingInterval;
  private finishedTaskIds: string[] | undefined = undefined;

  public setEnabled(enabled: boolean) {
    if (enabled !== this.enabled) {
      this.enabled = enabled;
      this.tryPoll();
    }
  }

  public setHostname(hostname: string) {
    if (hostname !== this.hostname) {
      this.hostname = hostname;
      this.tryPoll();
    }
  }

  public setSid(sid: string | undefined) {
    if (sid !== this.sid) {
      this.sid = sid;
      this.tryPoll();
    }
  }

  public setInterval(interval: number) {
    this.interval = interval;
  }

  private tryPoll() {
    const count = ++this.tryPollCount;
    if (this.enabled && this.hostname && this.sid) {
      DownloadStation.Task.List(this.hostname, this.sid, {
        offset: 0,
        limit: -1,
      })
        .then(response => {
          if (this.enabled) {
            if (response.success) {
              const updatedFinishedTaskIds = response.data.tasks
                .filter(t => t.status === 'finished' || t.status === 'seeding')
                .map(t => t.id);
              if (this.finishedTaskIds != null) {
                const newlyFinishedTaskIds = updatedFinishedTaskIds.filter(id => this.finishedTaskIds!.indexOf(id) === -1);
                newlyFinishedTaskIds.forEach(id => {
                  const task = response.data.tasks.filter(t => t.id === id)[0];
                  browser.notifications.create(undefined, {
                    type: 'basic',
                    title: `${task.title}`,
                    message: 'Download finished'
                  });
                });
              }
              this.finishedTaskIds = updatedFinishedTaskIds;
            }

            setTimeout(() => {
              // Each top-level tryPoll call is its own potentially-infinite chain of tryPoll calls.
              // Abort this chain if another chain was created, i.e., the count changed.
              if (count === this.tryPollCount) {
                this.tryPoll();
              }
            }, this.interval * 1000);
          }
        });
    }
  }
}

const poller = new NotificationPoller;

onStoredStateChange(storedState => {
  poller.setHostname(getHostUrl(storedState.connection));
  poller.setSid(storedState.sid);
  poller.setInterval(storedState.notifications.pollingInterval);
  poller.setEnabled(storedState.notifications.enabled);
});
