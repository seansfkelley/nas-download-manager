// The advanced-add form keeps the URL and the selected directory in its own state, which the mock
// cannot reach without changing src/. So it fills them the way a person would, then leaves the form
// alone: a real input event and a real click, once per opening.

const DOWNLOAD_URL = "https://example.com/tears-of-steel-1080p-surround.mkv";
const DIRECTORY = "video";

// React stashes the value it last wrote on the node and ignores an assignment that does not go
// through the prototype's setter, so a plain `textarea.value = ...` never reaches onChange.
function type(textarea: HTMLTextAreaElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setValue.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

const typedInto = new WeakSet<Element>();

function fill() {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    ".advanced-add-download-form .url-input",
  );
  if (textarea != null && !typedInto.has(textarea)) {
    typedInto.add(textarea);
    type(textarea, DOWNLOAD_URL);
  }

  // The tree arrives a few ticks after the form, so this waits for it rather than running once.
  // Clicking marks the row is-selected, which is what stops the click repeating on every mutation.
  document
    .querySelector<HTMLElement>(
      `.path-selector .directory-header:not(.is-selected) > .name[title="${DIRECTORY}"]`,
    )
    ?.click();
}

export function prefillAdvancedAddForm() {
  new MutationObserver(fill).observe(document.body, { childList: true, subtree: true });
}
