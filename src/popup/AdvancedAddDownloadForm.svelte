<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import PathSelector from "./PathSelector.svelte";
  import { startsWithAnyProtocol, ALL_DOWNLOADABLE_PROTOCOLS } from "../common/apis/protocols";
  import type { PopupClient } from "./popupClient";

  interface Props {
    onClose: () => void;
    client: PopupClient;
  }

  let { onClose, client }: Props = $props();

  let selectedPath = $state<string | undefined>(undefined);
  let downloadUrl = $state("");
  let unzipPassword = $state("");
  let unzipEnabled = $state(true);

  let hasDownloadUrl = $derived(downloadUrl.length > 0);

  async function updateIsUnzipEnabled() {
    try {
      const response = await client.getConfig();
      if (!response.success) {
        unzipEnabled = false;
      } else {
        unzipEnabled = response.result.enable_unzip_service;
      }
    } catch {
      unzipEnabled = false;
    }
    if (!unzipEnabled) {
      unzipPassword = "";
    }
  }

  // Load on mount (component is recreated each time the form opens)
  updateIsUnzipEnabled();

  function addDownload() {
    const urls = downloadUrl
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS));
    client.createTasks(urls, {
      path: selectedPath,
      unzipPassword: unzipPassword.trim() || undefined,
    });
    onClose();
  }
</script>

<div class="advanced-add-download-form">
  <textarea
    class="url-input input-field card"
    rows={2}
    bind:value={downloadUrl}
    placeholder={browser.i18n.getMessage("URLs_to_download_one_per_line")}
  ></textarea>
  <input
    type="password"
    class="input-field"
    bind:value={unzipPassword}
    disabled={!unzipEnabled}
    title={unzipEnabled
      ? undefined
      : browser.i18n.getMessage("Auto_Extract_service_is_disabled_in_Download_Station")}
    placeholder={browser.i18n.getMessage("Unzip_password")}
  />
  <div class="download-path card">
    <div class="path-display" title={selectedPath}>
      {browser.i18n.getMessage("Download_to")}
      <span class="path" class:faded={!selectedPath}>
        {selectedPath
          ? selectedPath.split("/").at(-1)
          : browser.i18n.getMessage("default_location")}
      </span>
    </div>
    <PathSelector
      onSelectPath={(path) => {
        selectedPath = path;
      }}
      {selectedPath}
      {client}
    />
  </div>
  <div class="buttons">
    <button onclick={onClose} title={browser.i18n.getMessage("Dont_add_a_new_task")}>
      <Icon name="xmark" size="lg" />
      {browser.i18n.getMessage("Cancel")}
    </button>
    <button
      onclick={addDownload}
      title={browser.i18n.getMessage("Download_the_above_URL_to_the_specified_location")}
      disabled={!hasDownloadUrl}
    >
      <Icon name="plus" size="lg" />
      {browser.i18n.getMessage("Add")}
    </button>
  </div>
</div>

<style>
  .advanced-add-download-form {
    display: flex;
    flex-direction: column;

    .card {
      border-radius: 2px;
      border: 1px solid #aaa;
      background-color: white;
    }

    .url-input {
      width: 100%;
      min-height: 30px;
      max-height: 180px;
      flex-shrink: 0;
      resize: vertical;
      field-sizing: content;
    }

    .input-field {
      padding-top: 5px;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }

    .download-path {
      padding: 5px;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;

      .path-display {
        flex-shrink: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 3px;

        .path {
          margin-left: 3px;

          &.faded {
            color: #999;
          }
        }
      }
    }

    .buttons {
      text-align: right;
      padding: 4px 4px 0;
      flex-shrink: 0;

      button {
        margin: 5px 5px 0;
      }
    }
  }
</style>
