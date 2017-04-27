declare const browser: any;

function saveOptions(e) {
  console.log('saving');
  // e.preventDefault();
  // browser.storage.local.set({
  //   color: document.querySelector('#color').value
  // });
}

function restoreOptions() {
  console.log('restoring');
  // function setCurrentChoice(result) {
  //   document.querySelector('#color').value = result.color || 'blue';
  // }

  // function onError(error) {
  //   console.log(`Error: ${error}`);
  // }

  // var getting = browser.storage.local.get('color');
  // getting.then(setCurrentChoice, onError);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
(document.getElementById('save') as HTMLButtonElement).addEventListener('click', saveOptions);
