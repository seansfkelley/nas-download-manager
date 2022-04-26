import { getMutableStateSingleton } from "./backgroundState";
import { addDownloadTasksAndPoll } from "./actions";

export function initializeDownloadInterceptor() {
  downloads.onCreated.addListener((itm)=>{

    const state = getMutableStateSingleton();
    var ext, ext_list;

    ext_list = state.extList.split(' ');

    // has no extension
    if (itm.filename.index('.') < 0) return;

    ext = itm.filename.split('.').pop().toLowerCase();

    // extension not in the list
    if (ext_list.indexOf(ext) < 0) return;

    // stop download and add NAS task
    downloads.cancel(itm.id);
    addDownloadTasksAndPoll(
      state.api,
      state.pollRequestManager,
      state.showNonErrorNotifications,
      [itm.url],
    );

  });
}
