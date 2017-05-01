import { DownloadStation } from '../api';
import { SESSION_ID_KEY, Settings, loadSettings, DEFAULT_SETTINGS, getHostUrl } from '../common';

class NotificationPoller {
  private enabled: boolean = false;
  private hostname: string | null = null;
  private sid: string | null = null;
  private interval: number = DEFAULT_SETTINGS.notifications.pollingInterval;
  private finishedTaskIds: string[] | null = null;

  public start() {
    this.enabled = true;
    this.tryPoll();
  }

  public stop() {
    this.enabled = false;
  }

  public setHostname(hostname: string) {
    if (hostname !== this.hostname) {
      this.hostname = hostname;
      this.tryPoll();
    }
  }

  public setSid(sid: string) {
    if (sid !== this.sid) {
      this.sid = sid;
      this.tryPoll();
    }
  }

  public setInterval(interval: number) {
    this.interval = interval;
  }

  private tryPoll() {
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
              if (this.finishedTaskIds !== null) {
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
              this.tryPoll();
            }, this.interval * 1000);
          }
        });
    }
  }
}

const poller = new NotificationPoller;

loadSettings()
  .then(settings => {
    poller.setHostname(getHostUrl(settings.connection));
    poller.setInterval(settings.notifications.pollingInterval);

    if (settings.notifications.enabled) {
      poller.start();
    }
  });

browser.storage.local.get([SESSION_ID_KEY])
  .then((options: { sid: string }) => {
    console.log(options);
    if (options.sid) {
      poller.setSid(options.sid);
    }
  });

browser.storage.onChanged.addListener<Settings & { sid: string }>((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.connection && changes.connection.newValue != null) {
      poller.setHostname(getHostUrl(changes.connection.newValue));
    }

    if (changes.sid && changes.sid.newValue != null) {
      poller.setSid(changes.sid.newValue);
    }

    if (changes.notifications && changes.notifications.newValue != null) {
      poller.setInterval(changes.notifications.newValue.pollingInterval);

      if (changes.notifications.newValue.enabled) {
        poller.start();
      } else {
        poller.stop();
      }
    }
  }
});
