import { Auth, DownloadStation } from './api';
import { USERNAME, PASSWORD } from './api/secrets';

let sid: string;

console.log('running extension!');

Auth.Login(USERNAME, PASSWORD)
  .then(result => {
    console.log(result);
    if (result.success) {
      sid = result.data.sid;
      console.log('sid', sid);
    } else {
      console.log('login failure', result);
      throw new Error();
    }
  })
  .then(() => {
    return DownloadStation.Info.GetConfig(sid);
  })
  .then(result => {
    console.log(result);
  })
  .then(() => {
    if (sid) {
      return Auth.Logout(sid)
        .then(result => {
          console.log('logged out!', result);
        })
        .catch(result => {
          console.log('logout failure!', result);
        });
    } else {
      return;
    }
  });
