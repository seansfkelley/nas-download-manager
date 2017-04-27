import { Auth, LoginResult, DownloadStation } from './api';
import { USERNAME, PASSWORD } from './api/secrets';

let sid: string;

console.log('running extension!');

new Promise(resolve => {
  setTimeout(() => { resolve(); }, 500);
})
  .then(() => {
    return Auth.Login(USERNAME, PASSWORD);
  })
  .then((result: LoginResult) => {
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
    return DownloadStation.Task.List(sid, { limit: 2, additional: [ 'detail', 'transfer', 'file', 'tracker', 'peer' ] });
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
  })
  .catch(error => {
    console.log(error);
  });
